import { getDb } from '../database/index.js';

export function getDailyStats(days: number = 30): Array<{
  date: string; session_count: number; event_count: number; agent_calls: number;
  tool_calls: number; token_input: number; token_output: number; cost_usd: number; errors: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT * FROM daily_stats
    WHERE date >= date('now', '-${days} days')
    ORDER BY date ASC
  `).all() as Array<{
    date: string; session_count: number; event_count: number; agent_calls: number;
    tool_calls: number; token_input: number; token_output: number; cost_usd: number; errors: number;
  }>;
}

export function upsertDailyStats(date: string, data: {
  session_count: number; event_count: number; agent_calls: number;
  tool_calls: number; token_input: number; token_output: number;
  cost_usd: number; errors: number;
}): void {
  const db = getDb();
  db.prepare(`
    INSERT INTO daily_stats (date, session_count, event_count, agent_calls, tool_calls, token_input, token_output, cost_usd, errors)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(date) DO UPDATE SET
      session_count = excluded.session_count,
      event_count = excluded.event_count,
      agent_calls = excluded.agent_calls,
      tool_calls = excluded.tool_calls,
      token_input = excluded.token_input,
      token_output = excluded.token_output,
      cost_usd = excluded.cost_usd,
      errors = excluded.errors
  `).run(date, data.session_count, data.event_count, data.agent_calls, data.tool_calls,
    data.token_input, data.token_output, data.cost_usd, data.errors);
}
