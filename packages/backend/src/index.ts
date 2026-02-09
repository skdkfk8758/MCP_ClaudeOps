import { createServer } from './server.js';

const PORT = parseInt(process.env.CLAUDEOPS_BACKEND_PORT || '48390', 10);

async function main(): Promise<void> {
  const server = await createServer();
  await server.listen({ port: PORT, host: '0.0.0.0' });
  console.log(`ClaudeOps Backend running on port ${PORT}`);
}

main().catch((error) => {
  console.error('Failed to start backend:', error);
  process.exit(1);
});
