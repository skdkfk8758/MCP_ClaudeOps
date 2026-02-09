import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/index.js';
import { getTokenUsage, getCostByModel } from '../models/token-usage.js';
import { calculateCost } from '@claudeops/shared';

export async function registerTokenRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/tokens/usage', async (request) => {
    const { session_id, days } = request.query as { session_id?: string; days?: string };
    return getTokenUsage({ session_id, days: days ? parseInt(days) : undefined });
  });

  app.get('/api/tokens/cost', async (request) => {
    const { session_id, days } = request.query as { session_id?: string; days?: string };
    const usage = getTokenUsage({ session_id, days: days ? parseInt(days) : undefined });

    let totalCost = 0;
    const byModel: Record<string, { input_cost: number; output_cost: number; total: number }> = {};

    for (const [model, data] of Object.entries(usage.by_model)) {
      const cost = calculateCost(data.input, data.output, model);
      byModel[model] = {
        input_cost: calculateCost(data.input, 0, model),
        output_cost: calculateCost(0, data.output, model),
        total: cost,
      };
      totalCost += cost;
    }

    return { total_usd: totalCost, input_cost_usd: 0, output_cost_usd: 0, by_model: byModel };
  });

  app.get('/api/tokens/cost-by-model', async (request) => {
    const { days } = request.query as { days?: string };
    return getCostByModel(days ? parseInt(days) : 30);
  });

  app.get('/api/tokens/budget', async () => {
    const db = getDb();
    const dailyLimit = (db.prepare("SELECT value FROM config WHERE key = 'budget.daily_limit'").get() as { value: string })?.value || '0';
    const monthlyLimit = (db.prepare("SELECT value FROM config WHERE key = 'budget.monthly_limit'").get() as { value: string })?.value || '0';

    const today = new Date().toISOString().split('T')[0];
    const todayCost = (db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as total FROM agent_executions WHERE date(start_time) = ?").get(today) as { total: number }).total;
    const monthCost = (db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as total FROM agent_executions WHERE start_time >= datetime('now', 'start of month')").get() as { total: number }).total;

    return {
      daily: { limit: parseFloat(dailyLimit), current: todayCost, remaining: Math.max(0, parseFloat(dailyLimit) - todayCost) },
      monthly: { limit: parseFloat(monthlyLimit), current: monthCost, remaining: Math.max(0, parseFloat(monthlyLimit) - monthCost) },
    };
  });

  app.put('/api/tokens/pricing', async (request) => {
    const { model, input_per_mtok, output_per_mtok } = request.body as { model: string; input_per_mtok: number; output_per_mtok: number };
    const db = getDb();
    db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(`pricing.${model}.input`, String(input_per_mtok));
    db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(`pricing.${model}.output`, String(output_per_mtok));
    return { model, input_per_mtok, output_per_mtok };
  });

  app.put('/api/tokens/budget-alerts', async (request) => {
    const { daily_limit, monthly_limit } = request.body as { daily_limit?: number; monthly_limit?: number };
    const db = getDb();
    if (daily_limit !== undefined) {
      db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run('budget.daily_limit', String(daily_limit));
    }
    if (monthly_limit !== undefined) {
      db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run('budget.monthly_limit', String(monthly_limit));
    }
    return { daily_limit, monthly_limit };
  });
}
