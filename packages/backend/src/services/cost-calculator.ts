import { getDb } from '../database/index.js';
import { calculateCost } from '@claudeops/shared';

export function recalculateAgentCost(agentExecutionId: number): void {
  const db = getDb();
  const agent = db.prepare('SELECT * FROM agent_executions WHERE id = ?').get(agentExecutionId) as {
    id: number; model: string; token_input: number; token_output: number;
  } | undefined;

  if (!agent) return;

  const pricing = getModelPricing(agent.model);
  const cost = calculateCost(agent.token_input, agent.token_output, agent.model, pricing ? { [agent.model]: pricing } : undefined);

  db.prepare('UPDATE agent_executions SET cost_usd = ? WHERE id = ?').run(cost, agent.id);
}

export function recalculateSessionCost(sessionId: string): void {
  const db = getDb();
  const totalCost = (db.prepare('SELECT COALESCE(SUM(cost_usd), 0) as total FROM agent_executions WHERE session_id = ?').get(sessionId) as { total: number }).total;
  db.prepare('UPDATE sessions SET cost_usd = ? WHERE id = ?').run(totalCost, sessionId);
}

function getModelPricing(model: string): { input: number; output: number } | null {
  const db = getDb();
  const inputRow = db.prepare("SELECT value FROM config WHERE key = ?").get(`pricing.${model}.input`) as { value: string } | undefined;
  const outputRow = db.prepare("SELECT value FROM config WHERE key = ?").get(`pricing.${model}.output`) as { value: string } | undefined;

  if (!inputRow || !outputRow) return null;
  return { input: parseFloat(inputRow.value), output: parseFloat(outputRow.value) };
}
