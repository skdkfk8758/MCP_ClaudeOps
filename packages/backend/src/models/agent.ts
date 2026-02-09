import { getDb } from '../database/index.js';
import type { AgentExecution } from '@claudeops/shared';

export function createAgentExecution(data: {
  session_id: string;
  agent_type: string;
  model: string;
  task_description?: string;
}): AgentExecution {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO agent_executions (session_id, agent_type, model, task_description)
    VALUES (?, ?, ?, ?)
  `).run(data.session_id, data.agent_type, data.model, data.task_description ?? null);
  return getAgentExecution(Number(result.lastInsertRowid))!;
}

export function getAgentExecution(id: number): AgentExecution | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM agent_executions WHERE id = ?').get(id) as AgentExecution | undefined;
}

export function updateAgentExecution(id: number, data: {
  status?: string;
  end_time?: string;
  token_input?: number;
  token_output?: number;
  cost_usd?: number;
  duration_ms?: number;
}): AgentExecution | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.status) { fields.push('status = ?'); values.push(data.status); }
  if (data.end_time) { fields.push('end_time = ?'); values.push(data.end_time); }
  if (data.token_input !== undefined) { fields.push('token_input = ?'); values.push(data.token_input); }
  if (data.token_output !== undefined) { fields.push('token_output = ?'); values.push(data.token_output); }
  if (data.cost_usd !== undefined) { fields.push('cost_usd = ?'); values.push(data.cost_usd); }
  if (data.duration_ms !== undefined) { fields.push('duration_ms = ?'); values.push(data.duration_ms); }

  if (fields.length === 0) return getAgentExecution(id);

  values.push(id);
  db.prepare(`UPDATE agent_executions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getAgentExecution(id);
}

export function getSessionAgents(sessionId: string): AgentExecution[] {
  const db = getDb();
  return db.prepare('SELECT * FROM agent_executions WHERE session_id = ? ORDER BY start_time ASC').all(sessionId) as AgentExecution[];
}

export function getAgentStats(options: { days?: number; agent_type?: string }): Array<{
  agent_type: string; model: string; total_calls: number; avg_duration_ms: number;
  success_rate: number; total_tokens: number; total_cost_usd: number;
}> {
  const db = getDb();
  const days = options.days ?? 30;
  const conditions = [`start_time >= datetime('now', '-${days} days')`];
  const params: unknown[] = [];

  if (options.agent_type) { conditions.push('agent_type = ?'); params.push(options.agent_type); }

  const rows = db.prepare(`
    SELECT agent_type, model,
      COUNT(*) as total_calls,
      AVG(duration_ms) as avg_duration_ms,
      ROUND(SUM(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100, 1) as success_rate,
      SUM(token_input + token_output) as total_tokens,
      SUM(cost_usd) as total_cost_usd
    FROM agent_executions
    WHERE ${conditions.join(' AND ')}
    GROUP BY agent_type, model
    ORDER BY total_calls DESC
  `).all(...params) as Array<{
    agent_type: string; model: string; total_calls: number; avg_duration_ms: number;
    success_rate: number; total_tokens: number; total_cost_usd: number;
  }>;

  return rows;
}

export function getAgentLeaderboard(metric: string, days: number = 30): Array<{
  rank: number; agent_type: string; model: string; metric_value: number; metric_name: string;
}> {
  const db = getDb();
  let orderBy: string;

  switch (metric) {
    case 'speed': orderBy = 'AVG(duration_ms) ASC'; break;
    case 'cost': orderBy = 'SUM(cost_usd) / COUNT(*) ASC'; break;
    case 'success_rate': orderBy = "SUM(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) / COUNT(*) DESC"; break;
    default: orderBy = 'COUNT(*) DESC';
  }

  const rows = db.prepare(`
    SELECT agent_type, model,
      CASE '${metric}'
        WHEN 'speed' THEN AVG(duration_ms)
        WHEN 'cost' THEN SUM(cost_usd) / COUNT(*)
        WHEN 'success_rate' THEN SUM(CASE WHEN status = 'completed' THEN 1.0 ELSE 0.0 END) / COUNT(*) * 100
        ELSE COUNT(*)
      END as metric_value
    FROM agent_executions
    WHERE start_time >= datetime('now', '-${days} days')
    GROUP BY agent_type, model
    ORDER BY ${orderBy}
    LIMIT 20
  `).all() as Array<{ agent_type: string; model: string; metric_value: number }>;

  return rows.map((r, i) => ({
    rank: i + 1,
    agent_type: r.agent_type,
    model: r.model,
    metric_value: r.metric_value,
    metric_name: metric,
  }));
}
