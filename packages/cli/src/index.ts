#!/usr/bin/env node
import { Command } from 'commander';
import { registerTaskCommand } from './commands/task.js';
import { registerPrdCommand } from './commands/prd.js';
import { registerEpicCommand } from './commands/epic.js';
import { registerReportCommand } from './commands/report.js';
import { registerGitHubCommand } from './commands/github.js';
import { registerWorktreeCommand } from './commands/worktree.js';

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

program
  .command('upgrade')
  .description('Upgrade ClaudeOps and re-setup registered projects')
  .option('--global', 'Upgrade global installation only')
  .option('--db', 'Run DB migration only')
  .action(async (options: { global?: boolean; db?: boolean }) => {
    const { upgrade } = await import('./commands/upgrade.js');
    await upgrade(options);
  });

program
  .command('restart')
  .description('Restart services (auto-updates from GitHub if available)')
  .option('--force', 'Continue even if build fails')
  .option('--skip-update', 'Skip GitHub update check')
  .option('--skip-setup', 'Skip MCP/hook re-registration')
  .action(async (options: { force?: boolean; skipUpdate?: boolean; skipSetup?: boolean }) => {
    const { restart } = await import('./commands/restart.js');
    await restart(options);
  });

program
  .command('list')
  .description('List registered projects')
  .action(async () => {
    const { list } = await import('./commands/list.js');
    await list();
  });

registerTaskCommand(program);
registerPrdCommand(program);
registerEpicCommand(program);
registerReportCommand(program);
registerGitHubCommand(program);
registerWorktreeCommand(program);

program.parse();
