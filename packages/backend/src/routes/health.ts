import type { FastifyInstance } from 'fastify';
import { getDb } from '../database/index.js';

export async function registerHealthRoutes(app: FastifyInstance): Promise<void> {
  app.get('/health', async () => {
    let dbStatus = 'ok';
    try {
      getDb().prepare('SELECT 1').get();
    } catch {
      dbStatus = 'error';
    }
    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      database: dbStatus,
    };
  });
}
