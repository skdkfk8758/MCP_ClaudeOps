#!/usr/bin/env node
import { Command } from 'commander';
import { registerTaskCommand } from './commands/task.js';

const program = new Command();

program
  .name('claudeops')
  .description('ClaudeOps - Claude Code Operations Dashboard CLI')
  .version('1.0.0');

program
  .command('setup')
  .description('Full setup: build, start services, register MCP server, install hooks')
  .action(async () => {
    const { setup } = await import('./commands/setup.js');
    await setup();
  });

program
  .command('start')
  .description('Start ClaudeOps services')
  .argument('[service]', 'Service to start (backend, dashboard, all)', 'all')
  .action(async (service: string) => {
    const { start } = await import('./commands/start.js');
    await start(service);
  });

program
  .command('stop')
  .description('Stop all running services')
  .action(async () => {
    const { stop } = await import('./commands/stop.js');
    await stop();
  });

program
  .command('status')
  .description('Show status of services')
  .action(async () => {
    const { status } = await import('./commands/status.js');
    await status();
  });

program
  .command('teardown')
  .description('Stop services and remove registrations')
  .action(async () => {
    const { teardown } = await import('./commands/teardown.js');
    await teardown();
  });

registerTaskCommand(program);

program.parse();
