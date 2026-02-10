import type { FastifyInstance } from 'fastify';
import { createPrd, getPrd, updatePrd, deletePrd, listPrds } from '../models/prd.js';
import { wsManager } from '../services/websocket.js';

export async function registerPrdRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/prds
  app.post('/api/prds', async (request, reply) => {
    const body = request.body as { title?: string; description?: string; vision?: string; user_stories?: string[]; success_criteria?: string[]; constraints?: string; out_of_scope?: string; project_path?: string };
    if (!body.title) return reply.status(400).send({ error: 'bad_request', message: 'title is required' });
    const prd = createPrd(body as Parameters<typeof createPrd>[0]);
    wsManager.notifyPrdCreated(prd);
    return reply.status(201).send(prd);
  });

  // GET /api/prds
  app.get('/api/prds', async (request) => {
    const query = request.query as { status?: string; page?: string; page_size?: string };
    return listPrds({
      status: query.status,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/prds/:id
  app.get('/api/prds/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const prd = getPrd(parseInt(id));
    if (!prd) return reply.status(404).send({ error: 'not_found', message: 'PRD not found' });
    return prd;
  });

  // PATCH /api/prds/:id
  app.patch('/api/prds/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const prd = updatePrd(parseInt(id), body as Parameters<typeof updatePrd>[1]);
    if (!prd) return reply.status(404).send({ error: 'not_found', message: 'PRD not found' });
    wsManager.notifyPrdUpdated(prd);
    return prd;
  });

  // DELETE /api/prds/:id
  app.delete('/api/prds/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id);
    const deleted = deletePrd(numId);
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'PRD not found' });
    wsManager.notifyPrdDeleted(numId);
    return { success: true };
  });
}
