import { Command } from 'commander';

const BACKEND_URL = process.env.CLAUDEOPS_BACKEND_URL || 'http://localhost:48390';

async function apiFetch<T>(path: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  if (!res.ok) throw new Error(`API error: ${res.status} ${res.statusText}`);
  return res.json() as Promise<T>;
}

export function registerWorktreeCommand(program: Command): void {
  const worktree = program.command('worktree').description('Git worktree management');

  worktree
    .command('create <name>')
    .description('Create a new git worktree')
    .requiredOption('--project <path>', 'Project path')
    .option('--epic <id>', 'Link to epic ID')
    .action(async (name: string, opts: { project: string; epic?: string }) => {
      try {
        const result = await apiFetch<{
          id: number;
          name: string;
          path: string;
        }>('/api/worktrees', {
          method: 'POST',
          body: JSON.stringify({
            name,
            project_path: opts.project,
            epic_id: opts.epic ? parseInt(opts.epic, 10) : undefined,
          }),
        });

        console.log(`\x1b[32m✓\x1b[0m Worktree created: ${result.name}`);
        console.log(`  ID:   ${result.id}`);
        console.log(`  Path: \x1b[36m${result.path}\x1b[0m`);
        if (opts.epic) {
          console.log(`  Epic: #${opts.epic}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  worktree
    .command('list')
    .description('List all worktrees')
    .option('--status <status>', 'Filter by status (active, merged, abandoned)')
    .option('--epic <id>', 'Filter by epic ID')
    .action(async (opts: { status?: string; epic?: string }) => {
      try {
        const params = new URLSearchParams();
        if (opts.status) params.append('status', opts.status);
        if (opts.epic) params.append('epic_id', opts.epic);

        const query = params.toString();
        const worktrees = await apiFetch<Array<{
          id: number;
          name: string;
          path: string;
          status: string;
          epic_id?: number;
          created_at: string;
        }>>(`/api/worktrees${query ? `?${query}` : ''}`);

        if (worktrees.length === 0) {
          console.log('\x1b[90mNo worktrees found\x1b[0m');
          return;
        }

        console.log('\n\x1b[34m━━━ Worktrees ━━━\x1b[0m');
        for (const wt of worktrees) {
          const statusColor = wt.status === 'active' ? '\x1b[32m' : '\x1b[90m';
          console.log(`\n  #${wt.id} \x1b[1m${wt.name}\x1b[0m`);
          console.log(`  Status: ${statusColor}${wt.status}\x1b[0m`);
          console.log(`  Path:   \x1b[36m${wt.path}\x1b[0m`);
          if (wt.epic_id) {
            console.log(`  Epic:   #${wt.epic_id}`);
          }
          console.log(`  Created: ${new Date(wt.created_at).toLocaleString()}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  worktree
    .command('merge <id>')
    .description('Merge worktree branch and remove worktree')
    .action(async (id: string) => {
      try {
        const result = await apiFetch<{
          success: boolean;
          message?: string;
        }>(`/api/worktrees/${id}/merge`, {
          method: 'POST',
        });

        console.log(`\x1b[32m✓\x1b[0m Worktree #${id} merged successfully`);
        if (result.message) {
          console.log(`  ${result.message}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  worktree
    .command('remove <id>')
    .description('Remove a worktree')
    .action(async (id: string) => {
      try {
        await apiFetch(`/api/worktrees/${id}`, {
          method: 'DELETE',
        });

        console.log(`\x1b[32m✓\x1b[0m Worktree #${id} removed`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  const context = worktree.command('context').description('Project context management');

  context
    .command('set')
    .description('Set project context document')
    .requiredOption('--project <path>', 'Project path')
    .requiredOption('--type <type>', 'Context type (brief, tech, architecture, rules)')
    .requiredOption('--title <title>', 'Context title')
    .requiredOption('--content <content>', 'Context content')
    .action(async (opts: { project: string; type: string; title: string; content: string }) => {
      try {
        if (!['brief', 'tech', 'architecture', 'rules'].includes(opts.type)) {
          console.error('\x1b[31m✗\x1b[0m Type must be one of: brief, tech, architecture, rules');
          process.exit(1);
        }

        await apiFetch('/api/contexts', {
          method: 'PUT',
          body: JSON.stringify({
            project_path: opts.project,
            context_type: opts.type,
            title: opts.title,
            content: opts.content,
          }),
        });

        console.log(`\x1b[32m✓\x1b[0m Context updated: ${opts.type}`);
        console.log(`  Project: ${opts.project}`);
        console.log(`  Title:   ${opts.title}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  context
    .command('get')
    .description('Get project context documents')
    .requiredOption('--project <path>', 'Project path')
    .option('--type <type>', 'Filter by context type')
    .action(async (opts: { project: string; type?: string }) => {
      try {
        const params = new URLSearchParams();
        params.append('project_path', opts.project);
        if (opts.type) params.append('context_type', opts.type);

        const contexts = await apiFetch<Array<{
          id: number;
          context_type: string;
          title: string;
          content: string;
          updated_at: string;
        }>>(`/api/contexts?${params.toString()}`);

        if (contexts.length === 0) {
          console.log('\x1b[90mNo contexts found\x1b[0m');
          return;
        }

        console.log('\n\x1b[34m━━━ Project Contexts ━━━\x1b[0m');
        for (const ctx of contexts) {
          console.log(`\n  \x1b[1m${ctx.context_type}\x1b[0m: ${ctx.title}`);
          console.log(`  Updated: ${new Date(ctx.updated_at).toLocaleString()}`);
          console.log(`\n  ${ctx.content.substring(0, 200)}${ctx.content.length > 200 ? '...' : ''}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
