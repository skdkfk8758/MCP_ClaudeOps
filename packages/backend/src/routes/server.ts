import type { FastifyInstance } from 'fastify';
import { spawn } from 'node:child_process';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

export async function registerServerRoutes(app: FastifyInstance): Promise<void> {
  const backendRoot = resolve(dirname(fileURLToPath(import.meta.url)), '../..');

  // GET /api/server/status — server health + uptime
  app.get('/api/server/status', async () => {
    return {
      status: 'running',
      uptime_seconds: Math.floor(process.uptime()),
      pid: process.pid,
      node_version: process.version,
      memory_mb: Math.round(process.memoryUsage().rss / 1024 / 1024),
      timestamp: new Date().toISOString(),
    };
  });

  // POST /api/server/restart — gracefully restart the backend
  app.post('/api/server/restart', async (_request, reply) => {
    reply.send({ status: 'restarting', message: 'Server will restart in 1 second' });

    setTimeout(async () => {
      try {
        // 1. Close server to release the port
        await app.close();

        // 2. Spawn a fresh server process using npx tsx (works in both dev and prod)
        const child = spawn('npx', ['tsx', 'src/index.ts'], {
          detached: true,
          stdio: 'ignore',
          cwd: backendRoot,
          env: { ...process.env },
        });
        child.unref();

        // 3. Exit current process
        process.exit(0);
      } catch (err) {
        console.error('Restart failed:', err);
      }
    }, 1000);
  });
}
