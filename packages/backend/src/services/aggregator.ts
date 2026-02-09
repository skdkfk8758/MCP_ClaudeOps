import { getDb } from '../database/index.js';
import { upsertDailyStats } from '../models/daily-stats.js';
import { wsManager } from './websocket.js';

let aggregationTimer: ReturnType<typeof setInterval> | null = null;

export function startAggregator(): void {
  if (aggregationTimer) return;
  aggregationTimer = setInterval(() => void aggregate(), 60_000);
  void aggregate(); // Initial run
}

export function stopAggregator(): void {
  if (aggregationTimer) {
    clearInterval(aggregationTimer);
    aggregationTimer = null;
  }
}

async function aggregate(): Promise<void> {
  try {
    const db = getDb();
    const today = new Date().toISOString().split('T')[0];

    const stats = db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM sessions WHERE date(start_time) = ?) as session_count,
        (SELECT COUNT(*) FROM events WHERE date(timestamp) = ?) as event_count,
        (SELECT COUNT(*) FROM agent_executions WHERE date(start_time) = ?) as agent_calls,
        (SELECT COUNT(*) FROM tool_calls WHERE date(timestamp) = ?) as tool_calls,
        (SELECT COALESCE(SUM(token_input), 0) FROM agent_executions WHERE date(start_time) = ?) as token_input,
        (SELECT COALESCE(SUM(token_output), 0) FROM agent_executions WHERE date(start_time) = ?) as token_output,
        (SELECT COALESCE(SUM(cost_usd), 0) FROM agent_executions WHERE date(start_time) = ?) as cost_usd,
        (SELECT COUNT(*) FROM errors WHERE date(timestamp) = ?) as errors
    `).get(today, today, today, today, today, today, today, today) as {
      session_count: number; event_count: number; agent_calls: number; tool_calls: number;
      token_input: number; token_output: number; cost_usd: number; errors: number;
    };

    upsertDailyStats(today, stats);
    wsManager.notifyStatsUpdated(stats);
  } catch {
    // Aggregation errors are non-fatal
  }
}
