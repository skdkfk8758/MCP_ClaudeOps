import { getDb } from '../database/index.js';
import type { SessionReport, StandupReport } from '@claudeops/shared';

export function generateSessionReport(sessionId: string): SessionReport {
  const db = getDb();

  // Check existing
  const existing = db.prepare("SELECT * FROM session_reports WHERE session_id = ? AND report_type = 'session'").get(sessionId) as Record<string, unknown> | undefined;
  if (existing) return enrichReport(existing);

  // Gather session data
  const session = db.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as Record<string, unknown> | undefined;
  if (!session) throw new Error(`Session ${sessionId} not found`);

  const tools = db.prepare('SELECT DISTINCT tool_name FROM tool_calls WHERE session_id = ?').all(sessionId) as { tool_name: string }[];
  const files = db.prepare('SELECT DISTINCT file_path FROM file_changes WHERE session_id = ?').all(sessionId) as { file_path: string }[];
  const agents = db.prepare('SELECT agent_type, model, status, duration_ms FROM agent_executions WHERE session_id = ?').all(sessionId) as Record<string, unknown>[];

  const toolNames = tools.map(t => t.tool_name);
  const filePaths = files.map(f => f.file_path);
  const tokenSummary = { input: (session.token_input as number) || 0, output: (session.token_output as number) || 0, cost: (session.cost_usd as number) || 0 };

  // Generate markdown report
  let content = `# Session Report\n\n`;
  content += `**Session ID:** ${sessionId}\n`;
  content += `**Status:** ${session.status}\n`;
  content += `**Started:** ${session.start_time}\n`;
  if (session.end_time) content += `**Ended:** ${session.end_time}\n`;
  content += `\n## Token Usage\n\n`;
  content += `- Input: ${tokenSummary.input.toLocaleString()}\n`;
  content += `- Output: ${tokenSummary.output.toLocaleString()}\n`;
  content += `- Cost: $${tokenSummary.cost.toFixed(4)}\n`;
  if (agents.length > 0) {
    content += `\n## Agents (${agents.length})\n\n`;
    for (const a of agents) {
      content += `- **${a.agent_type}** (${a.model}) - ${a.status}${a.duration_ms ? ` (${a.duration_ms}ms)` : ''}\n`;
    }
  }
  if (toolNames.length > 0) {
    content += `\n## Tools Used (${toolNames.length})\n\n`;
    content += toolNames.map(t => `- ${t}`).join('\n') + '\n';
  }
  if (filePaths.length > 0) {
    content += `\n## Files Changed (${filePaths.length})\n\n`;
    content += filePaths.map(f => `- ${f}`).join('\n') + '\n';
  }

  const stmt = db.prepare(`
    INSERT INTO session_reports (session_id, report_type, content, tools_used, files_changed, token_summary)
    VALUES (?, 'session', ?, ?, ?, ?)
  `);
  const result = stmt.run(
    sessionId, content,
    JSON.stringify(toolNames), JSON.stringify(filePaths), JSON.stringify(tokenSummary)
  );
  return getReport(result.lastInsertRowid as number)!;
}

export function generateStandupReport(date?: string): StandupReport {
  const db = getDb();
  const targetDate = date || new Date().toISOString().slice(0, 10);

  const completedTasks = db.prepare(`SELECT * FROM tasks WHERE status = 'done' AND date(completed_at) = ?`).all(targetDate) as Record<string, unknown>[];
  const activeTasks = db.prepare(`SELECT * FROM tasks WHERE status IN ('design', 'implementation')`).all() as Record<string, unknown>[];
  const sessionCount = (db.prepare(`SELECT COUNT(*) as count FROM sessions WHERE date(start_time) = ?`).get(targetDate) as { count: number }).count;
  const tokenStats = db.prepare(`SELECT COALESCE(SUM(token_input), 0) as input, COALESCE(SUM(token_output), 0) as output, COALESCE(SUM(cost_usd), 0) as cost FROM sessions WHERE date(start_time) = ?`).get(targetDate) as { input: number; output: number; cost: number };

  return {
    date: targetDate,
    completed_tasks: completedTasks as unknown as StandupReport['completed_tasks'],
    active_tasks: activeTasks as unknown as StandupReport['active_tasks'],
    sessions_today: sessionCount,
    tokens_today: { input: tokenStats.input, output: tokenStats.output },
    cost_today: tokenStats.cost,
    blockers: [],
  };
}

export function getReport(id: number): SessionReport | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM session_reports WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return enrichReport(row);
}

export function listReports(options: { page?: number; page_size?: number } = {}): { total: number; page: number; page_size: number; pages: number; items: SessionReport[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const total = (db.prepare('SELECT COUNT(*) as count FROM session_reports').get() as { count: number }).count;
  const rows = db.prepare('SELECT * FROM session_reports ORDER BY created_at DESC LIMIT ? OFFSET ?').all(pageSize, offset) as Record<string, unknown>[];
  const items = rows.map(enrichReport);

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

function enrichReport(row: Record<string, unknown>): SessionReport {
  const report = { ...row } as unknown as SessionReport;
  if (typeof report.tools_used === 'string') report.tools_used = JSON.parse(report.tools_used as unknown as string);
  if (typeof report.files_changed === 'string') report.files_changed = JSON.parse(report.files_changed as unknown as string);
  if (typeof report.token_summary === 'string') report.token_summary = JSON.parse(report.token_summary as unknown as string);
  return report;
}
