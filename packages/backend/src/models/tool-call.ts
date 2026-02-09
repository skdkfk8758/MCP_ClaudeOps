import { getDb } from '../database/index.js';

export function createToolCall(data: {
  session_id: string;
  tool_name: string;
  agent_execution_id?: number;
  parameters?: string;
  duration_ms?: number;
  success?: boolean;
}): { id: number } {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO tool_calls (session_id, agent_execution_id, tool_name, parameters, duration_ms, success)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.session_id,
    data.agent_execution_id ?? null,
    data.tool_name,
    data.parameters ?? null,
    data.duration_ms ?? null,
    data.success !== false ? 1 : 0
  );
  return { id: Number(result.lastInsertRowid) };
}

export function createToolCallsBatch(calls: Array<{
  session_id: string; tool_name: string; parameters?: string;
  duration_ms?: number; success?: boolean;
}>): { count: number } {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO tool_calls (session_id, tool_name, parameters, duration_ms, success)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((items: typeof calls) => {
    for (const c of items) {
      stmt.run(c.session_id, c.tool_name, c.parameters ?? null, c.duration_ms ?? null, c.success !== false ? 1 : 0);
    }
    return items.length;
  });
  return { count: insertMany(calls) };
}

export function getToolStats(days: number = 30, topN: number = 20): Array<{
  tool_name: string; call_count: number; avg_duration_ms: number;
  success_rate: number; failure_count: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT tool_name,
      COUNT(*) as call_count,
      AVG(duration_ms) as avg_duration_ms,
      ROUND(SUM(CASE WHEN success = 1 THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as success_rate,
      SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failure_count
    FROM tool_calls
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY tool_name
    ORDER BY call_count DESC
    LIMIT ?
  `).all(topN) as Array<{
    tool_name: string; call_count: number; avg_duration_ms: number;
    success_rate: number; failure_count: number;
  }>;
}
