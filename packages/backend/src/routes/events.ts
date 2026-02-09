import type { FastifyInstance } from 'fastify';
import { createEvent, createEventsBatch, listEvents } from '../models/event.js';
import { createToolCallsBatch } from '../models/tool-call.js';
import { createFileChangesBatch } from '../models/file-change.js';
import { createError } from '../models/error.js';
import type { FlowEvent } from '@claudeops/shared';

export async function registerEventRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/events
  app.post('/api/events', async (request, reply) => {
    const body = request.body as FlowEvent;
    if (!body.session_id || !body.event_type) {
      return reply.status(400).send({ error: 'bad_request', message: 'session_id and event_type required' });
    }
    const result = createEvent(body);
    return reply.status(201).send(result);
  });

  // POST /api/events/batch
  app.post('/api/events/batch', async (request, reply) => {
    const { events } = request.body as { events: FlowEvent[] };
    if (!Array.isArray(events)) {
      return reply.status(400).send({ error: 'bad_request', message: 'events array required' });
    }
    const result = createEventsBatch(events);
    return reply.status(201).send(result);
  });

  // POST /api/events/tool-calls/batch
  app.post('/api/events/tool-calls/batch', async (request, reply) => {
    const { tool_calls } = request.body as { tool_calls: Array<{
      session_id: string; tool_name: string; parameters?: string;
      duration_ms?: number; success?: boolean;
    }> };
    const result = createToolCallsBatch(tool_calls);
    return reply.status(201).send(result);
  });

  // POST /api/events/file-changes/batch
  app.post('/api/events/file-changes/batch', async (request, reply) => {
    const { file_changes } = request.body as { file_changes: Array<{
      session_id: string; file_path: string; change_type: string;
      lines_added?: number; lines_removed?: number;
    }> };
    const result = createFileChangesBatch(file_changes);
    return reply.status(201).send(result);
  });

  // POST /api/events/errors
  app.post('/api/events/errors', async (request, reply) => {
    const body = request.body as {
      session_id: string; error_type: string; message: string;
      stack_trace?: string; tool_name?: string;
    };
    const result = createError(body);
    return reply.status(201).send(result);
  });

  // GET /api/events
  app.get('/api/events', async (request) => {
    const query = request.query as { session_id?: string; event_type?: string; page?: string; page_size?: string };
    return listEvents({
      session_id: query.session_id,
      event_type: query.event_type,
      page: query.page ? parseInt(query.page) : undefined,
      page_size: query.page_size ? parseInt(query.page_size) : undefined,
    });
  });
}
