import type { FastifyInstance } from 'fastify';
import { createSession, getSession, updateSession, listSessions, getActiveSessions } from '../models/session.js';
import { getSessionEvents } from '../models/event.js';
import { getSessionAgents } from '../models/agent.js';

export async function registerSessionRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/sessions
  app.post('/api/sessions', async (request, reply) => {
    const body = request.body as { id: string; project_path?: string };
    if (!body.id) return reply.status(400).send({ error: 'bad_request', message: 'id is required' });
    try {
      const session = createSession({ id: body.id, project_path: body.project_path });
      return reply.status(201).send(session);
    } catch {
      // session may already exist
      return reply.status(200).send(getSession(body.id));
    }
  });

  // GET /api/sessions
  app.get('/api/sessions', async (request) => {
    const query = request.query as { page?: string; page_size?: string; status?: string; sort?: string };
    return listSessions({
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
      status: query.status,
      sort: query.sort,
    });
  });

  // GET /api/sessions/active
  app.get('/api/sessions/active', async () => {
    return getActiveSessions();
  });

  // GET /api/sessions/:id
  app.get('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const session = getSession(id);
    if (!session) return reply.status(404).send({ error: 'not_found', message: 'Session not found' });
    return session;
  });

  // PUT /api/sessions/:id
  app.put('/api/sessions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Record<string, unknown>;
    const session = updateSession(id, body);
    if (!session) return reply.status(404).send({ error: 'not_found', message: 'Session not found' });
    return session;
  });

  // GET /api/sessions/:id/events
  app.get('/api/sessions/:id/events', async (request) => {
    const { id } = request.params as { id: string };
    return getSessionEvents(id);
  });

  // GET /api/sessions/:id/agents
  app.get('/api/sessions/:id/agents', async (request) => {
    const { id } = request.params as { id: string };
    return getSessionAgents(id);
  });
}
