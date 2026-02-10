import { execSync } from 'node:child_process';
import { getTask } from '../models/task.js';
import { upsertCommit, getTaskCommits } from '../models/commit-tracker.js';
import type { TaskCommit } from '@claudeops/shared';

/**
 * git log 파싱으로 [TASK-{id}] 커밋 스캔
 */
export function scanTaskCommits(
  taskId: number,
  projectPath: string
): { scanned: number; new_commits: number } {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  const existingHashes = new Set(getTaskCommits(taskId).map(c => c.commit_hash));
  let scanned = 0;
  let newCommits = 0;

  // 1) [TASK-{id}] grep으로 커밋 검색
  const grepCommits = parseGitLog(projectPath, `--all --grep="\\[TASK-${taskId}\\]"`);
  scanned += grepCommits.length;

  for (const commit of grepCommits) {
    if (!existingHashes.has(commit.commit_hash)) {
      upsertCommit({ ...commit, task_id: taskId });
      existingHashes.add(commit.commit_hash);
      newCommits++;
    }
  }

  // 2) 브랜치 기반 폴백 (branch_name 설정된 경우)
  if (task.branch_name) {
    try {
      const branchCommits = parseGitLog(projectPath, task.branch_name);
      scanned += branchCommits.length;

      for (const commit of branchCommits) {
        if (!existingHashes.has(commit.commit_hash)) {
          upsertCommit({ ...commit, task_id: taskId, branch_name: task.branch_name });
          existingHashes.add(commit.commit_hash);
          newCommits++;
        }
      }
    } catch {
      // 브랜치가 없을 수 있음
    }
  }

  return { scanned, new_commits: newCommits };
}

/**
 * 단일 커밋 수동 연결
 */
export function linkCommit(taskId: number, commitHash: string, projectPath: string): TaskCommit {
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  // git show로 커밋 정보 가져오기
  const format = '%H%n%s%n%an%n%aI%n';
  let output: string;
  try {
    output = execSync(`git show --format="${format}" --stat ${commitHash}`, {
      cwd: projectPath,
      encoding: 'utf-8',
      timeout: 10_000,
    });
  } catch {
    throw new Error(`커밋 ${commitHash}를 찾을 수 없습니다.`);
  }

  const lines = output.split('\n');
  const hash = lines[0].trim();
  const message = lines[1].trim();
  const author = lines[2].trim();
  const committedAt = lines[3].trim();

  // stat 파싱
  const statLine = lines.find(l => /\d+ files? changed/.test(l)) || '';
  const filesMatch = statLine.match(/(\d+) files? changed/);
  const insertMatch = statLine.match(/(\d+) insertions?\(\+\)/);
  const deleteMatch = statLine.match(/(\d+) deletions?\(-\)/);

  return upsertCommit({
    task_id: taskId,
    commit_hash: hash,
    commit_message: message,
    author,
    committed_at: committedAt,
    files_changed: filesMatch ? parseInt(filesMatch[1]) : 0,
    insertions: insertMatch ? parseInt(insertMatch[1]) : 0,
    deletions: deleteMatch ? parseInt(deleteMatch[1]) : 0,
    branch_name: task.branch_name,
  });
}

/**
 * 브랜치 이름 자동 생성: task/{id}-{slug}
 */
export function generateBranchName(taskId: number, title: string): string {
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .slice(0, 40)
    .replace(/-+$/, '');
  return `task/${taskId}-${slug || 'work'}`;
}

// --- 내부 헬퍼 ---

function parseGitLog(
  projectPath: string,
  refOrFlags: string
): Omit<TaskCommit, 'id' | 'task_id' | 'tracked_at'>[] {
  const format = '%H|||%s|||%an|||%aI';
  const results: Omit<TaskCommit, 'id' | 'task_id' | 'tracked_at'>[] = [];

  try {
    const output = execSync(
      `git log ${refOrFlags} --format="${format}" --shortstat -n 100`,
      { cwd: projectPath, encoding: 'utf-8', timeout: 15_000 }
    );

    const blocks = output.trim().split('\n\n');
    for (const block of blocks) {
      const lines = block.trim().split('\n');
      if (!lines[0]) continue;

      const [hash, message, author, date] = lines[0].split('|||');
      if (!hash) continue;

      const statLine = lines.find(l => /\d+ files? changed/.test(l)) || '';
      const filesMatch = statLine.match(/(\d+) files? changed/);
      const insertMatch = statLine.match(/(\d+) insertions?\(\+\)/);
      const deleteMatch = statLine.match(/(\d+) deletions?\(-\)/);

      results.push({
        commit_hash: hash.trim(),
        commit_message: message?.trim() || '',
        author: author?.trim() || '',
        committed_at: date?.trim() || '',
        files_changed: filesMatch ? parseInt(filesMatch[1]) : 0,
        insertions: insertMatch ? parseInt(insertMatch[1]) : 0,
        deletions: deleteMatch ? parseInt(deleteMatch[1]) : 0,
        branch_name: null,
      });
    }
  } catch {
    // git 명령 실패 시 빈 배열 반환
  }

  return results;
}
