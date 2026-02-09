import type { FastifyInstance } from 'fastify';
import { createAgentExecution, updateAgentExecution, getAgentStats, getAgentLeaderboard } from '../models/agent.js';

export async function registerAgentRoutes(app: FastifyInstance): Promise<void> {
  // POST /api/agents/executions
  app.post('/api/agents/executions', async (request, reply) => {
    const body = request.body as {
      session_id: string; agent_type: string; model: string; task_description?: string;
    };
    const result = createAgentExecution(body);
    return reply.status(201).send(result);
  });

  // PUT /api/agents/executions/:id
  app.put('/api/agents/executions/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as {
      status?: string; end_time?: string; token_input?: number;
      token_output?: number; cost_usd?: number; duration_ms?: number;
    };
    const result = updateAgentExecution(parseInt(id), body);
    if (!result) return reply.status(404).send({ error: 'not_found', message: 'Agent execution not found' });
    return result;
  });

  // GET /api/agents/stats
  app.get('/api/agents/stats', async (request) => {
    const query = request.query as { days?: string; agent_type?: string };
    return getAgentStats({
      days: query.days ? parseInt(query.days) : undefined,
      agent_type: query.agent_type,
    });
  });

  // GET /api/agents/leaderboard
  app.get('/api/agents/leaderboard', async (request) => {
    const query = request.query as { metric?: string; days?: string };
    return getAgentLeaderboard(query.metric ?? 'speed', query.days ? parseInt(query.days) : 30);
  });
}
