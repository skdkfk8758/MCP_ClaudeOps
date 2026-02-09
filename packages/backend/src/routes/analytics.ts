import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/index.js';
import { getAgentStats } from '../models/agent.js';
import { getToolStats } from '../models/tool-call.js';
import { getFileHotspots } from '../models/file-change.js';
import { getErrorSummary } from '../models/error.js';

export async function registerAnalyticsRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/analytics/overview', async () => {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const activeSessions = (db.prepare("SELECT COUNT(*) as count FROM sessions WHERE status = 'active'").get() as { count: number }).count;
    const sessionsToday = (db.prepare("SELECT COUNT(*) as count FROM sessions WHERE date(start_time) = ?").get(today) as { count: number }).count;
    const tokensToday = db.prepare("SELECT COALESCE(SUM(token_input + token_output), 0) as total FROM agent_executions WHERE date(start_time) = ?").get(today) as { total: number };
    const costToday = db.prepare("SELECT COALESCE(SUM(cost_usd), 0) as total FROM agent_executions WHERE date(start_time) = ?").get(today) as { total: number };
    const agentsToday = (db.prepare("SELECT COUNT(*) as count FROM agent_executions WHERE date(start_time) = ?").get(today) as { count: number }).count;
    const toolCallsToday = (db.prepare("SELECT COUNT(*) as count FROM tool_calls WHERE date(timestamp) = ?").get(today) as { count: number }).count;
    const errorsToday = (db.prepare("SELECT COUNT(*) as count FROM errors WHERE date(timestamp) = ?").get(today) as { count: number }).count;

    return {
      active_sessions: activeSessions,
      total_sessions_today: sessionsToday,
      total_tokens_today: tokensToday.total,
      total_cost_today: costToday.total,
      total_agents_today: agentsToday,
      total_tool_calls_today: toolCallsToday,
      total_errors_today: errorsToday,
    };
  });

  app.get('/api/analytics/trends', async (request) => {
    const { metric, days } = request.query as { metric?: string; days?: string };
    const db = getDb();
    const numDays = days ? parseInt(days) : 30;

    let query: string;
    switch (metric) {
      case 'tokens':
        query = `SELECT date(start_time) as date, SUM(token_input + token_output) as value FROM agent_executions WHERE start_time >= datetime('now', '-${numDays} days') GROUP BY date(start_time) ORDER BY date`;
        break;
      case 'sessions':
        query = `SELECT date(start_time) as date, COUNT(*) as value FROM sessions WHERE start_time >= datetime('now', '-${numDays} days') GROUP BY date(start_time) ORDER BY date`;
        break;
      case 'agents':
        query = `SELECT date(start_time) as date, COUNT(*) as value FROM agent_executions WHERE start_time >= datetime('now', '-${numDays} days') GROUP BY date(start_time) ORDER BY date`;
        break;
      case 'costs':
        query = `SELECT date(start_time) as date, SUM(cost_usd) as value FROM agent_executions WHERE start_time >= datetime('now', '-${numDays} days') GROUP BY date(start_time) ORDER BY date`;
        break;
      default:
        query = `SELECT date(start_time) as date, COUNT(*) as value FROM sessions WHERE start_time >= datetime('now', '-${numDays} days') GROUP BY date(start_time) ORDER BY date`;
    }

    const rows = db.prepare(query).all() as Array<{ date: string; value: number }>;
    return rows.map(r => ({ ...r, metric: metric || 'sessions' }));
  });

  app.get('/api/analytics/tool-stats', async (request) => {
    const { days, top_n } = request.query as { days?: string; top_n?: string };
    return getToolStats(days ? parseInt(days) : 30, top_n ? parseInt(top_n) : 20);
  });

  app.get('/api/analytics/agent-stats', async (request) => {
    const { days, agent_type } = request.query as { days?: string; agent_type?: string };
    return getAgentStats({ days: days ? parseInt(days) : 30, agent_type });
  });

  app.get('/api/analytics/file-hotspots', async (request) => {
    const { days } = request.query as { days?: string };
    return getFileHotspots(days ? parseInt(days) : 30);
  });

  app.get('/api/analytics/error-summary', async (request) => {
    const { days } = request.query as { days?: string };
    return getErrorSummary(days ? parseInt(days) : 30);
  });

  app.get('/api/analytics/optimization', async () => {
    const db = getDb();
    const hints: Array<{ type: string; severity: string; message: string; estimated_savings_usd?: number; details: Record<string, unknown> }> = [];

    // Check for opus agents that could use sonnet
    const expensiveAgents = db.prepare(`
      SELECT agent_type, COUNT(*) as count, AVG(duration_ms) as avg_ms, SUM(cost_usd) as total_cost
      FROM agent_executions WHERE model = 'opus' AND start_time >= datetime('now', '-7 days')
      GROUP BY agent_type HAVING avg_ms < 5000 AND count > 3
    `).all() as Array<{ agent_type: string; count: number; avg_ms: number; total_cost: number }>;

    for (const agent of expensiveAgents) {
      hints.push({
        type: 'model_downgrade',
        severity: 'warning',
        message: `Agent "${agent.agent_type}" uses Opus but completes quickly (avg ${Math.round(agent.avg_ms)}ms). Consider downgrading to Sonnet.`,
        estimated_savings_usd: agent.total_cost * 0.8,
        details: agent as unknown as Record<string, unknown>,
      });
    }

    // Check for redundant tool calls
    const redundantTools = db.prepare(`
      SELECT tool_name, session_id, COUNT(*) as count
      FROM tool_calls WHERE timestamp >= datetime('now', '-7 days')
      GROUP BY tool_name, session_id HAVING count > 10
      ORDER BY count DESC LIMIT 5
    `).all() as Array<{ tool_name: string; session_id: string; count: number }>;

    for (const t of redundantTools) {
      hints.push({
        type: 'redundant_tools',
        severity: 'info',
        message: `"${t.tool_name}" called ${t.count} times in session ${t.session_id.slice(0, 8)}...`,
        details: t as unknown as Record<string, unknown>,
      });
    }

    return hints;
  });
}
