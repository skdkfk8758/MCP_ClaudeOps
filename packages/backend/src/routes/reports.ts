import type { FastifyInstance } from 'fastify';
import { generateSessionReport, generateStandupReport, getReport, listReports } from '../models/report.js';
import { wsManager } from '../services/websocket.js';

export async function registerReportRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/reports/session/:sessionId
  app.post('/api/reports/session/:sessionId', async (request, reply) => {
    const { sessionId } = request.params as { sessionId: string };
    try {
      const report = generateSessionReport(sessionId);
      wsManager.notifyReportCreated(report);
      return reply.status(201).send(report);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(404).send({ error: 'not_found', message });
    }
  });

  // POST /api/reports/standup
  app.post('/api/reports/standup', async (request, reply) => {
    const body = request.body as { date?: string } | null;
    const report = generateStandupReport(body?.date);
    return reply.status(200).send(report);
  });

  // GET /api/reports
  app.get('/api/reports', async (request) => {
    const query = request.query as { page?: string; page_size?: string };
    return listReports({
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/reports/:id
  app.get('/api/reports/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const report = getReport(parseInt(id));
    if (!report) return reply.status(404).send({ error: 'not_found', message: 'Report not found' });
    return report;
  });
}
