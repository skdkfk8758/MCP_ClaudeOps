import type { FastifyInstance } from 'fastify';
import { setContext, getContext, listContexts, deleteContext } from '../models/project-context.js';
import { wsManager } from '../services/websocket.js';

export async function registerContextRoutes(app: FastifyInstance): Promise<void> {
  // PUT /api/contexts - Set/update context
  app.put('/api/contexts', async (request, reply) => {
    const body = request.body as { project_path: string; context_type: string; title: string; content: string };
    try {
      const context = setContext(body.project_path, body.context_type, body.title, body.content);
      wsManager.notifyContextUpdated(context);
      return reply.send(context);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/contexts - Get contexts
  app.get('/api/contexts', async (request, reply) => {
    const query = request.query as { project_path: string; context_type?: string };
    if (!query.project_path) {
      return reply.status(400).send({ error: 'project_path is required' });
    }
    const contexts = query.context_type
      ? getContext(query.project_path, query.context_type)
      : listContexts(query.project_path);
    return reply.send(contexts);
  });

  // DELETE /api/contexts/:id - Delete context
  app.delete('/api/contexts/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deleteContext(parseInt(id, 10));
    if (!deleted) return reply.status(404).send({ error: 'Context not found' });
    wsManager.notifyContextDeleted(parseInt(id, 10));
    return reply.send({ success: true });
  });
}
