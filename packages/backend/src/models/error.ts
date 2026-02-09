import { getDb } from '../database/index.js';

export function createError(data: {
  session_id: string; error_type: string; message: string;
  stack_trace?: string; tool_name?: string;
}): { id: number } {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO errors (session_id, error_type, message, stack_trace, tool_name)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.session_id, data.error_type, data.message, data.stack_trace ?? null, data.tool_name ?? null);
  return { id: Number(result.lastInsertRowid) };
}

export function getErrorSummary(days: number = 30): Array<{
  error_type: string; count: number; latest: string;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT error_type, COUNT(*) as count, MAX(timestamp) as latest
    FROM errors
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY error_type ORDER BY count DESC
  `).all() as Array<{ error_type: string; count: number; latest: string }>;
}
