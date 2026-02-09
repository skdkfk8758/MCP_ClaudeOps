import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/index.js';

export async function registerConfigRoutes(app: FastifyInstance): Promise<void> {
  app.get('/api/config', async () => {
    const db = getDb();
    const rows = db.prepare('SELECT * FROM config ORDER BY key').all() as Array<{ key: string; value: string; updated_at: string }>;
    const config: Record<string, string> = {};
    for (const row of rows) {
      config[row.key] = row.value;
    }
    return config;
  });

  app.put('/api/config', async (request) => {
    const body = request.body as Record<string, string>;
    const db = getDb();
    for (const [key, value] of Object.entries(body)) {
      db.prepare("INSERT OR REPLACE INTO config (key, value, updated_at) VALUES (?, ?, datetime('now'))").run(key, value);
    }
    return { updated: Object.keys(body).length };
  });

  app.post('/api/export', async (request) => {
    const { format, entity, days } = request.body as { format: string; entity: string; days?: number };
    const db = getDb();
    const numDays = days || 30;

    let data: unknown[];
    switch (entity) {
      case 'sessions':
        data = db.prepare(`SELECT * FROM sessions WHERE start_time >= datetime('now', '-${numDays} days') ORDER BY start_time DESC`).all();
        break;
      case 'events':
        data = db.prepare(`SELECT * FROM events WHERE timestamp >= datetime('now', '-${numDays} days') ORDER BY timestamp DESC LIMIT 1000`).all();
        break;
      case 'agents':
        data = db.prepare(`SELECT * FROM agent_executions WHERE start_time >= datetime('now', '-${numDays} days') ORDER BY start_time DESC`).all();
        break;
      case 'costs':
        data = db.prepare(`SELECT * FROM daily_stats WHERE date >= date('now', '-${numDays} days') ORDER BY date DESC`).all();
        break;
      default:
        data = [];
    }

    if (format === 'csv' && data.length > 0) {
      const headers = Object.keys(data[0] as Record<string, unknown>);
      const csv = [headers.join(','), ...data.map(row => headers.map(h => JSON.stringify((row as Record<string, unknown>)[h] ?? '')).join(','))].join('\n');
      return { format: 'csv', entity, count: data.length, data: csv };
    }

    return { format: 'json', entity, count: data.length, data };
  });
}
