import { execSync } from 'node:child_process';
import { getDb } from '../database/index.js';
import { getGitHubConfig, createSyncLog } from '../models/github.js';
import { getEpic } from '../models/epic.js';
import { getTask } from '../models/task.js';
import type { Epic, Task } from '@claudeops/shared';

function ghCommand(args: string): string {
  const config = getGitHubConfig();
  if (!config.enabled || !config.repo_owner || !config.repo_name) {
    throw new Error('GitHub integration is not configured. Set repo_owner, repo_name and enable it first.');
  }
  try {
    return execSync(`gh ${args} -R ${config.repo_owner}/${config.repo_name}`, { encoding: 'utf-8', timeout: 30000 }).trim();
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`GitHub CLI error: ${message}`);
  }
}

export function syncEpicToGitHub(epicId: number): { epic_issue_url: string; task_issues: { task_id: number; issue_url: string }[] } {
  const epic = getEpic(epicId);
  if (!epic) throw new Error(`Epic ${epicId} not found`);

  const db = getDb();
  let epicIssueUrl: string;

  if (epic.github_issue_url) {
    // Update existing issue
    const issueNum = epic.github_issue_number;
    ghCommand(`issue edit ${issueNum} --title "${escapeShell(epic.title)}" --body "${escapeShell(buildEpicBody(epic))}"`);
    epicIssueUrl = epic.github_issue_url;
    createSyncLog('epic', epicId, 'updated', epicIssueUrl);
  } else {
    // Create new issue
    const output = ghCommand(`issue create --title "${escapeShell(epic.title)}" --body "${escapeShell(buildEpicBody(epic))}" --label "epic"`);
    epicIssueUrl = output.split('\n').pop()!.trim();
    const issueNumber = parseInt(epicIssueUrl.split('/').pop()!, 10);
    db.prepare("UPDATE epics SET github_issue_url = ?, github_issue_number = ?, updated_at = datetime('now') WHERE id = ?").run(epicIssueUrl, issueNumber, epicId);
    createSyncLog('epic', epicId, 'created', epicIssueUrl);
  }

  // Sync child tasks
  const tasks = db.prepare('SELECT * FROM tasks WHERE epic_id = ?').all(epicId) as Record<string, unknown>[];
  const taskIssues: { task_id: number; issue_url: string }[] = [];

  for (const taskRow of tasks) {
    const taskId = taskRow.id as number;
    const task = getTask(taskId);
    if (!task) continue;

    if (task.github_issue_url) {
      taskIssues.push({ task_id: taskId, issue_url: task.github_issue_url });
      continue;
    }

    const taskBody = buildTaskBody(task, epicIssueUrl);
    const taskOutput = ghCommand(`issue create --title "${escapeShell(task.title)}" --body "${escapeShell(taskBody)}" --label "task"`);
    const taskIssueUrl = taskOutput.split('\n').pop()!.trim();
    const taskIssueNumber = parseInt(taskIssueUrl.split('/').pop()!, 10);
    db.prepare("UPDATE tasks SET github_issue_url = ?, github_issue_number = ?, updated_at = datetime('now') WHERE id = ?").run(taskIssueUrl, taskIssueNumber, taskId);
    createSyncLog('task', taskId, 'created', taskIssueUrl);
    taskIssues.push({ task_id: taskId, issue_url: taskIssueUrl });
  }

  return { epic_issue_url: epicIssueUrl, task_issues: taskIssues };
}

export function syncTaskToGitHub(taskId: number): { issue_url: string } {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task ${taskId} not found`);

  const db = getDb();

  if (task.github_issue_url) {
    const issueNum = task.github_issue_number;
    const state = task.status === 'done' ? '--state closed' : '--state open';
    ghCommand(`issue edit ${issueNum} --title "${escapeShell(task.title)}" --body "${escapeShell(buildTaskBody(task))}" ${state}`);
    createSyncLog('task', taskId, 'updated', task.github_issue_url);
    return { issue_url: task.github_issue_url };
  } else {
    const labels = ['task'];
    if (task.priority === 'P0' || task.priority === 'P1') labels.push('priority');
    const output = ghCommand(`issue create --title "${escapeShell(task.title)}" --body "${escapeShell(buildTaskBody(task))}" --label "${labels.join(',')}"`);
    const issueUrl = output.split('\n').pop()!.trim();
    const issueNumber = parseInt(issueUrl.split('/').pop()!, 10);
    db.prepare("UPDATE tasks SET github_issue_url = ?, github_issue_number = ?, updated_at = datetime('now') WHERE id = ?").run(issueUrl, issueNumber, taskId);
    createSyncLog('task', taskId, 'created', issueUrl);
    return { issue_url: issueUrl };
  }
}

export function postReportToGitHub(reportId: number): { comment_url: string } {
  const db = getDb();
  const report = db.prepare('SELECT * FROM session_reports WHERE id = ?').get(reportId) as Record<string, unknown> | undefined;
  if (!report) throw new Error(`Report ${reportId} not found`);

  const sessionId = report.session_id as string;
  // Find task linked to session, then find its github issue
  const taskSession = db.prepare('SELECT task_id FROM task_sessions WHERE session_id = ? LIMIT 1').get(sessionId) as { task_id: number } | undefined;

  let issueNumber: number | undefined;

  if (taskSession) {
    const task = db.prepare('SELECT github_issue_number FROM tasks WHERE id = ?').get(taskSession.task_id) as { github_issue_number: number | null } | undefined;
    issueNumber = task?.github_issue_number ?? undefined;
  }

  if (!issueNumber) {
    // Try to find any epic linked through the task
    if (taskSession) {
      const task = db.prepare('SELECT epic_id FROM tasks WHERE id = ?').get(taskSession.task_id) as { epic_id: number | null } | undefined;
      if (task?.epic_id) {
        const epic = db.prepare('SELECT github_issue_number FROM epics WHERE id = ?').get(task.epic_id) as { github_issue_number: number | null } | undefined;
        issueNumber = epic?.github_issue_number ?? undefined;
      }
    }
  }

  if (!issueNumber) throw new Error('No linked GitHub issue found for this report. Sync the related task or epic first.');

  const content = report.content as string;
  const commentBody = `## Session Report\n\n${content}\n\n---\n*Generated by ClaudeOps*`;
  const output = ghCommand(`issue comment ${issueNumber} --body "${escapeShell(commentBody)}"`);
  const commentUrl = output.trim();
  createSyncLog(report.report_type as string, reportId, 'commented', commentUrl);
  return { comment_url: commentUrl };
}

function escapeShell(str: string): string {
  return str.replace(/"/g, '\\"').replace(/`/g, '\\`').replace(/\$/g, '\\$');
}

function buildEpicBody(epic: Epic): string {
  const lines: string[] = [];
  if (epic.description) lines.push(epic.description);
  lines.push('');
  lines.push(`**Status:** ${epic.status}`);
  lines.push(`**Progress:** ${epic.progress}%`);
  if (epic.architecture_notes) lines.push(`\n### Architecture Notes\n${epic.architecture_notes}`);
  if (epic.tech_approach) lines.push(`\n### Tech Approach\n${epic.tech_approach}`);
  if (epic.estimated_effort) lines.push(`**Effort:** ${epic.estimated_effort}`);
  lines.push('\n---\n*Managed by ClaudeOps*');
  return lines.join('\n');
}

function buildTaskBody(task: Task, parentIssueUrl?: string): string {
  const lines: string[] = [];
  if (task.description) lines.push(task.description);
  lines.push('');
  lines.push(`**Status:** ${task.status}`);
  lines.push(`**Priority:** ${task.priority}`);
  if (task.assignee) lines.push(`**Assignee:** ${task.assignee}`);
  if (task.estimated_effort) lines.push(`**Effort:** ${task.estimated_effort}`);
  if (parentIssueUrl) lines.push(`\n**Parent Epic:** ${parentIssueUrl}`);
  lines.push('\n---\n*Managed by ClaudeOps*');
  return lines.join('\n');
}
