import { getDb } from '../database/index.js';
import type { TaskExecutionLog } from '@claudeops/shared';

export function createExecutionLog(data: {
  task_id: number;
  execution_id?: number;
  phase: 'design' | 'implementation' | 'verification';
  step_number?: number;
  agent_type?: string;
  model?: string;
  input_prompt?: string;
}): TaskExecutionLog {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO task_execution_logs (task_id, execution_id, phase, step_number, agent_type, model, input_prompt)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.task_id,
    data.execution_id ?? null,
    data.phase,
    data.step_number ?? null,
    data.agent_type ?? null,
    data.model ?? null,
    data.input_prompt ?? null
  );
  return getExecutionLog(result.lastInsertRowid as number)!;
}

export function updateExecutionLog(id: number, data: {
  status?: string;
  output_summary?: string;
  duration_ms?: number;
  completed_at?: string;
  error?: string;
}): TaskExecutionLog | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.output_summary !== undefined) { fields.push('output_summary = ?'); values.push(data.output_summary); }
  if (data.duration_ms !== undefined) { fields.push('duration_ms = ?'); values.push(data.duration_ms); }
  if (data.completed_at !== undefined) { fields.push('completed_at = ?'); values.push(data.completed_at); }
  if (data.error !== undefined) { fields.push('error = ?'); values.push(data.error); }

  if (fields.length > 0) {
    values.push(id);
    db.prepare(`UPDATE task_execution_logs SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getExecutionLog(id);
}

export function getExecutionLog(id: number): TaskExecutionLog | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM task_execution_logs WHERE id = ?').get(id) as TaskExecutionLog | undefined;
}

export function listExecutionLogs(taskId: number, options: {
  phase?: string;
  agent_type?: string;
  model?: string;
  status?: string;
  search?: string;
  execution_id?: number;
  page?: number;
  page_size?: number;
} = {}): {
  total: number;
  page: number;
  page_size: number;
  pages: number;
  items: TaskExecutionLog[];
} {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = ['task_id = ?'];
  const params: unknown[] = [taskId];

  if (options.phase) {
    conditions.push('phase = ?');
    params.push(options.phase);
  }
  if (options.agent_type) {
    conditions.push('agent_type = ?');
    params.push(options.agent_type);
  }
  if (options.model) {
    conditions.push('model = ?');
    params.push(options.model);
  }
  if (options.status) {
    conditions.push('status = ?');
    params.push(options.status);
  }
  if (options.search) {
    conditions.push('(output_summary LIKE ? OR error LIKE ? OR input_prompt LIKE ?)');
    const searchPattern = `%${options.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }
  if (options.execution_id != null) {
    conditions.push('execution_id = ?');
    params.push(options.execution_id);
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;
  const total = (db.prepare(`SELECT COUNT(*) as count FROM task_execution_logs ${whereClause}`).get(...params) as { count: number }).count;
  const items = db.prepare(`SELECT * FROM task_execution_logs ${whereClause} ORDER BY started_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as TaskExecutionLog[];

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

export function listExecutionGroups(taskId: number): Array<{
  execution_id: number;
  phase: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  log_count: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT
      execution_id,
      phase,
      CASE
        WHEN COUNT(CASE WHEN status = 'failed' THEN 1 END) > 0 THEN 'failed'
        WHEN COUNT(CASE WHEN status = 'running' THEN 1 END) > 0 THEN 'running'
        WHEN COUNT(CASE WHEN status = 'completed' THEN 1 END) = COUNT(*) THEN 'completed'
        ELSE 'pending'
      END as status,
      MIN(started_at) as started_at,
      MAX(completed_at) as completed_at,
      SUM(duration_ms) as duration_ms,
      COUNT(*) as log_count
    FROM task_execution_logs
    WHERE task_id = ? AND execution_id IS NOT NULL
    GROUP BY execution_id, phase
    ORDER BY MIN(started_at) DESC
  `).all(taskId) as Array<{
    execution_id: number;
    phase: string;
    status: string;
    started_at: string;
    completed_at: string | null;
    duration_ms: number | null;
    log_count: number;
  }>;
}
