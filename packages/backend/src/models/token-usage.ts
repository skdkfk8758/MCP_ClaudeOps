import { getDb } from '../database/index.js';

export function getTokenUsage(options: { session_id?: string; days?: number }): {
  total_input: number; total_output: number; total: number;
  by_model: Record<string, { input: number; output: number; total: number }>;
} {
  const db = getDb();

  if (options.session_id) {
    const session = db.prepare('SELECT token_input, token_output FROM sessions WHERE id = ?').get(options.session_id) as { token_input: number; token_output: number } | undefined;
    const agents = db.prepare(`
      SELECT model, SUM(token_input) as input, SUM(token_output) as output
      FROM agent_executions WHERE session_id = ? GROUP BY model
    `).all(options.session_id) as Array<{ model: string; input: number; output: number }>;

    const byModel: Record<string, { input: number; output: number; total: number }> = {};
    for (const a of agents) {
      byModel[a.model] = { input: a.input, output: a.output, total: a.input + a.output };
    }

    return {
      total_input: session?.token_input ?? 0,
      total_output: session?.token_output ?? 0,
      total: (session?.token_input ?? 0) + (session?.token_output ?? 0),
      by_model: byModel,
    };
  }

  const days = options.days ?? 30;
  const agents = db.prepare(`
    SELECT model, SUM(token_input) as input, SUM(token_output) as output
    FROM agent_executions WHERE start_time >= datetime('now', '-${days} days') GROUP BY model
  `).all() as Array<{ model: string; input: number; output: number }>;

  const byModel: Record<string, { input: number; output: number; total: number }> = {};
  let totalInput = 0, totalOutput = 0;
  for (const a of agents) {
    byModel[a.model] = { input: a.input, output: a.output, total: a.input + a.output };
    totalInput += a.input;
    totalOutput += a.output;
  }

  return { total_input: totalInput, total_output: totalOutput, total: totalInput + totalOutput, by_model: byModel };
}

export function getCostByModel(days: number = 30): Array<{
  model: string; input_cost: number; output_cost: number; total_cost: number; token_count: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT model,
      SUM(token_input) as token_input,
      SUM(token_output) as token_output,
      SUM(cost_usd) as total_cost,
      SUM(token_input + token_output) as token_count
    FROM agent_executions
    WHERE start_time >= datetime('now', '-${days} days')
    GROUP BY model ORDER BY total_cost DESC
  `).all() as Array<{
    model: string; input_cost: number; output_cost: number; total_cost: number; token_count: number;
  }>;
}
