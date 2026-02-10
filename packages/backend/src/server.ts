import Fastify from 'fastify';
import cors from '@fastify/cors';
import websocket from '@fastify/websocket';
import { registerHealthRoutes } from './routes/health.js';
import { registerSessionRoutes } from './routes/sessions.js';
import { registerEventRoutes } from './routes/events.js';
import { registerAgentRoutes } from './routes/agents.js';
import { registerAnalyticsRoutes } from './routes/analytics.js';
import { registerTokenRoutes } from './routes/tokens.js';
import { registerConfigRoutes } from './routes/config.js';
import { registerWsRoutes } from './routes/ws.js';
import { registerTaskRoutes } from './routes/tasks.js';
import { registerPrdRoutes } from './routes/prds.js';
import { registerEpicRoutes } from './routes/epics.js';
import { registerReportRoutes } from './routes/reports.js';
import { registerGitHubRoutes } from './routes/github.js';
import { registerWorktreeRoutes } from './routes/worktrees.js';
import { registerContextRoutes } from './routes/contexts.js';
import { registerTeamRoutes } from './routes/teams.js';
import { registerProjectInitRoutes } from './routes/project-init.js';
import { registerServerRoutes } from './routes/server.js';
import { registerPipelineRoutes } from './routes/pipelines.js';
import { startAggregator } from './services/aggregator.js';
import { startCleanup } from './services/cleanup.js';

export async function createServer() {
  const app = Fastify({ logger: false });

  await app.register(cors, {
    origin: true,
    methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  });
  await app.register(websocket);

  // Register all routes
  await registerHealthRoutes(app);
  await registerSessionRoutes(app);
  await registerEventRoutes(app);
  await registerAgentRoutes(app);
  await registerAnalyticsRoutes(app);
  await registerTokenRoutes(app);
  await registerConfigRoutes(app);
  await registerWsRoutes(app);
  await registerTaskRoutes(app);
  await registerPrdRoutes(app);
  await registerEpicRoutes(app);
  await registerReportRoutes(app);
  await registerGitHubRoutes(app);
  await registerWorktreeRoutes(app);
  await registerContextRoutes(app);
  await registerTeamRoutes(app);
  await registerProjectInitRoutes(app);
  await registerServerRoutes(app);
  await registerPipelineRoutes(app);

  // Start background services
  startAggregator();
  startCleanup();

  // Global error handler
  app.setErrorHandler((error, _request, reply) => {
    console.error('Server error:', error);
    const message = error instanceof Error ? error.message : String(error);
    reply.status(500).send({
      error: 'internal_error',
      message,
      timestamp: new Date().toISOString(),
    });
  });

  return app;
}
