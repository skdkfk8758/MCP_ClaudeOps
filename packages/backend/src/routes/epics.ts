import type { FastifyInstance } from 'fastify';
import { createEpic, getEpic, updateEpic, deleteEpic, listEpics } from '../models/epic.js';
import { wsManager } from '../services/websocket.js';
import { getEpicSessionStats } from '../models/epic-session.js';

export async function registerEpicRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/epics
  app.post('/api/epics', async (request, reply) => {
    const body = request.body as { prd_id?: number; title?: string; description?: string; architecture_notes?: string; tech_approach?: string; estimated_effort?: string };
    if (!body.title) return reply.status(400).send({ error: 'bad_request', message: 'title is required' });
    const epic = createEpic(body as Parameters<typeof createEpic>[0]);
    wsManager.notifyEpicCreated(epic);
    return reply.status(201).send(epic);
  });

  // GET /api/epics
  app.get('/api/epics', async (request) => {
    const query = request.query as { prd_id?: string; status?: string; page?: string; page_size?: string };
    return listEpics({
      prd_id: query.prd_id ? parseInt(query.prd_id) : undefined,
      status: query.status,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/epics/:id
  app.get('/api/epics/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const epic = getEpic(parseInt(id));
    if (!epic) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    return epic;
  });

  // PATCH /api/epics/:id
  app.patch('/api/epics/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const epic = updateEpic(parseInt(id), body as Parameters<typeof updateEpic>[1]);
    if (!epic) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    wsManager.notifyEpicUpdated(epic);
    return epic;
  });

  // DELETE /api/epics/:id
  app.delete('/api/epics/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id);
    const deleted = deleteEpic(numId);
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    wsManager.notifyEpicDeleted(numId);
    return { success: true };
  });

  // POST /api/epics/:id/branch — set branch name
  app.post('/api/epics/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { branch_name?: string };
    if (!body.branch_name) return reply.status(400).send({ error: 'bad_request', message: 'branch_name is required' });
    const epic = updateEpic(parseInt(id), { branch_name: body.branch_name } as Parameters<typeof updateEpic>[1]);
    if (!epic) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    wsManager.notifyEpicUpdated(epic);
    return epic;
  });

  // DELETE /api/epics/:id/branch — remove branch name
  app.delete('/api/epics/:id/branch', async (request, reply) => {
    const { id } = request.params as { id: string };
    const epic = updateEpic(parseInt(id), { branch_name: null } as Parameters<typeof updateEpic>[1]);
    if (!epic) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    wsManager.notifyEpicUpdated(epic);
    return epic;
  });

  // GET /api/epics/:id/sessions — 에픽 세션 통계
  app.get('/api/epics/:id/sessions', async (request, reply) => {
    const { id } = request.params as { id: string };
    const epicId = parseInt(id);
    const epic = getEpic(epicId);
    if (!epic) return reply.status(404).send({ error: 'not_found', message: 'Epic not found' });
    return getEpicSessionStats(epicId);
  });
}
