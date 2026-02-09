import type { FastifyInstance } from 'fastify';
import { createTask, getTask, updateTask, deleteTask, listTasks, getTaskBoard, moveTask, getTaskHistory, linkTaskSession, getTaskStats } from '../models/task.js';
import { wsManager } from '../services/websocket.js';

export async function registerTaskRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/tasks
  app.post('/api/tasks', async (request, reply) => {
    const body = request.body as { title?: string; description?: string; status?: string; priority?: string; assignee?: string; due_date?: string; estimated_effort?: string; labels?: string[]; epic_id?: number };
    if (!body.title) return reply.status(400).send({ error: 'bad_request', message: 'title is required' });
    const task = createTask(body as Parameters<typeof createTask>[0]);
    wsManager.notifyTaskCreated(task);
    return reply.status(201).send(task);
  });

  // GET /api/tasks
  app.get('/api/tasks', async (request) => {
    const query = request.query as { status?: string; priority?: string; assignee?: string; label?: string; page?: string; page_size?: string };
    return listTasks({
      status: query.status, priority: query.priority, assignee: query.assignee, label: query.label,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });

  // GET /api/tasks/board
  app.get('/api/tasks/board', async () => {
    return getTaskBoard();
  });

  // GET /api/tasks/stats
  app.get('/api/tasks/stats', async () => {
    return getTaskStats();
  });

  // GET /api/tasks/:id
  app.get('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const task = getTask(parseInt(id));
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    return task;
  });

  // PATCH /api/tasks/:id
  app.patch('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const task = updateTask(parseInt(id), body as Parameters<typeof updateTask>[1]);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskUpdated(task);
    return task;
  });

  // DELETE /api/tasks/:id
  app.delete('/api/tasks/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id);
    const deleted = deleteTask(numId);
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskDeleted(numId);
    return { success: true };
  });

  // POST /api/tasks/:id/move
  app.post('/api/tasks/:id/move', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { status: string; position: number };
    if (!body.status || body.position === undefined) return reply.status(400).send({ error: 'bad_request', message: 'status and position required' });
    const task = moveTask(parseInt(id), body as Parameters<typeof moveTask>[1]);
    if (!task) return reply.status(404).send({ error: 'not_found', message: 'Task not found' });
    wsManager.notifyTaskMoved(task);
    return task;
  });

  // GET /api/tasks/:id/history
  app.get('/api/tasks/:id/history', async (request) => {
    const { id } = request.params as { id: string };
    return getTaskHistory(parseInt(id));
  });

  // POST /api/tasks/:id/link-session
  app.post('/api/tasks/:id/link-session', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { session_id?: string };
    if (!body.session_id) return reply.status(400).send({ error: 'bad_request', message: 'session_id is required' });
    const linked = linkTaskSession(parseInt(id), body.session_id);
    if (!linked) return reply.status(400).send({ error: 'link_failed', message: 'Failed to link session' });
    return { success: true };
  });
}
