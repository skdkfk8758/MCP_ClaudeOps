import type { FastifyInstance } from 'fastify';
import { createWorktree, listWorktrees, getWorktree, mergeWorktree, removeWorktree } from '../models/worktree.js';
import { wsManager } from '../services/websocket.js';

export async function registerWorktreeRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/worktrees - Create worktree
  app.post('/api/worktrees', async (request, reply) => {
    const body = request.body as { epic_id?: number; name: string; project_path: string };
    try {
      const worktree = createWorktree(body.epic_id, body.name, body.project_path);
      wsManager.notifyWorktreeCreated(worktree);
      return reply.status(201).send(worktree);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/worktrees - List worktrees
  app.get('/api/worktrees', async (request, reply) => {
    const query = request.query as { status?: string; epic_id?: string };
    const worktrees = listWorktrees({
      status: query.status,
      epic_id: query.epic_id ? parseInt(query.epic_id, 10) : undefined,
    });
    return reply.send(worktrees);
  });

  // GET /api/worktrees/:id - Get worktree
  app.get('/api/worktrees/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const worktree = getWorktree(parseInt(id, 10));
    if (!worktree) return reply.status(404).send({ error: 'Worktree not found' });
    return reply.send(worktree);
  });

  // POST /api/worktrees/:id/merge - Merge worktree to main
  app.post('/api/worktrees/:id/merge', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const worktree = mergeWorktree(parseInt(id, 10));
      if (!worktree) return reply.status(404).send({ error: 'Worktree not found' });
      wsManager.notifyWorktreeUpdated(worktree);
      return reply.send(worktree);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // DELETE /api/worktrees/:id - Remove worktree
  app.delete('/api/worktrees/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const worktree = removeWorktree(parseInt(id, 10));
      if (!worktree) return reply.status(404).send({ error: 'Worktree not found' });
      wsManager.notifyWorktreeDeleted(worktree.id);
      return reply.send({ success: true });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });
}
