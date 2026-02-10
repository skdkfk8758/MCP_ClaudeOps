import type { FastifyInstance } from 'fastify';
import { getGitHubConfig, updateGitHubConfig, listSyncLogs } from '../models/github.js';
import { getPrdGitHubConfig, upsertPrdGitHubConfig, deletePrdGitHubConfig } from '../models/prd-github.js';
import { syncEpicToGitHub, syncTaskToGitHub, postReportToGitHub } from '../services/github-sync.js';
import { wsManager } from '../services/websocket.js';

export async function registerGitHubRoutes(app: FastifyInstance): Promise<void> {
  // GET /api/github/config
  app.get('/api/github/config', async (_request, reply) => {
    const config = getGitHubConfig();
    return reply.send(config);
  });

  // PUT /api/github/config
  app.put('/api/github/config', async (request, reply) => {
    const body = request.body as { repo_owner?: string; repo_name?: string; enabled?: boolean; auto_sync?: boolean };
    const config = updateGitHubConfig(body);
    wsManager.notifyGitHubConfigUpdated(config);
    return reply.send(config);
  });

  // POST /api/github/sync/epic/:id
  app.post('/api/github/sync/epic/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = syncEpicToGitHub(parseInt(id, 10));
      wsManager.notifyGitHubSynced({ type: 'epic', id: parseInt(id, 10), ...result });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/github/sync/task/:id
  app.post('/api/github/sync/task/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = syncTaskToGitHub(parseInt(id, 10));
      wsManager.notifyGitHubSynced({ type: 'task', id: parseInt(id, 10), ...result });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // POST /api/github/sync/report/:id
  app.post('/api/github/sync/report/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const result = postReportToGitHub(parseInt(id, 10));
      wsManager.notifyGitHubSynced({ type: 'report', id: parseInt(id, 10), ...result });
      return reply.send(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return reply.status(400).send({ error: message });
    }
  });

  // GET /api/github/sync-logs
  app.get('/api/github/sync-logs', async (request, reply) => {
    const query = request.query as { entity_type?: string; entity_id?: string; page?: string; page_size?: string };
    const result = listSyncLogs({
      entity_type: query.entity_type,
      entity_id: query.entity_id ? parseInt(query.entity_id, 10) : undefined,
      page: query.page ? parseInt(query.page, 10) : undefined,
      page_size: query.page_size ? parseInt(query.page_size, 10) : undefined,
    });
    return reply.send(result);
  });

  // GET /api/prds/:id/github — PRD GitHub config
  app.get('/api/prds/:id/github', async (request, reply) => {
    const { id } = request.params as { id: string };
    const config = getPrdGitHubConfig(parseInt(id, 10));
    if (!config) return reply.send({ configured: false });
    return reply.send({ configured: true, ...config });
  });

  // PUT /api/prds/:id/github — Create/Update PRD GitHub config
  app.put('/api/prds/:id/github', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { repo_owner?: string; repo_name?: string; default_branch?: string; enabled?: boolean; auto_sync?: boolean };
    if (!body.repo_owner || !body.repo_name) {
      return reply.status(400).send({ error: 'bad_request', message: 'repo_owner and repo_name are required' });
    }
    const config = upsertPrdGitHubConfig({
      prd_id: parseInt(id, 10),
      repo_owner: body.repo_owner,
      repo_name: body.repo_name,
      default_branch: body.default_branch,
      enabled: body.enabled,
      auto_sync: body.auto_sync,
    });
    wsManager.notifyGitHubConfigUpdated({ type: 'prd', ...config });
    return reply.send(config);
  });

  // DELETE /api/prds/:id/github — Remove PRD GitHub config
  app.delete('/api/prds/:id/github', async (request, reply) => {
    const { id } = request.params as { id: string };
    const deleted = deletePrdGitHubConfig(parseInt(id, 10));
    if (!deleted) return reply.status(404).send({ error: 'not_found', message: 'PRD GitHub config not found' });
    return reply.send({ success: true });
  });
}
