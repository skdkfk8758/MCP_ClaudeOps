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

const STATUS_COLORS: Record<string, string> = {
  backlog: '\x1b[90m',
  planning: '\x1b[36m',
  in_progress: '\x1b[33m',
  completed: '\x1b[32m',
};
const RESET = '\x1b[0m';

export function registerEpicCommand(program: Command): void {
  const epic = program.command('epic').description('Manage epics');

  epic
    .command('create <title>')
    .description('Create a new epic')
    .option('-p, --prd <prd_id>', 'PRD ID')
    .option('-d, --description <text>', 'Description')
    .option('-e, --effort <size>', 'Effort (S|M|L|XL)')
    .action(async (title: string, opts: Record<string, unknown>) => {
      try {
        const body: Record<string, unknown> = { title };
        if (opts.prd) body.prd_id = opts.prd;
        if (opts.description) body.description = opts.description;
        if (opts.effort) body.estimated_effort = opts.effort;
        const epic = await apiFetch<{ id: number; title: string }>('/api/epics', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        console.log(`\x1b[32m✓\x1b[0m Epic #${epic.id} created: ${epic.title}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  epic
    .command('list')
    .description('List epics')
    .option('-p, --prd <prd_id>', 'Filter by PRD ID')
    .option('-s, --status <status>', 'Filter by status (backlog|planning|in_progress|completed)')
    .action(async (opts: Record<string, string>) => {
      try {
        const params = new URLSearchParams();
        if (opts.prd) params.set('prd_id', opts.prd);
        if (opts.status) params.set('status', opts.status);
        const data = await apiFetch<{
          items: Array<{
            id: number;
            title: string;
            status: string;
            task_count: number;
            completed_tasks: number;
          }>;
        }>(`/api/epics?${params}`);
        if (data.items.length === 0) {
          console.log('No epics found.');
          return;
        }
        for (const e of data.items) {
          const sc = STATUS_COLORS[e.status] || '';
          const progress = `${e.completed_tasks}/${e.task_count}`;
          console.log(
            `  #${e.id} ${sc}[${e.status}]${RESET} ${e.title} (${progress} tasks)`
          );
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  epic
    .command('show <id>')
    .description('Show epic details')
    .action(async (id: string) => {
      try {
        const e = await apiFetch<{
          id: number;
          title: string;
          status: string;
          description: string | null;
          estimated_effort: string | null;
          task_count: number;
          completed_tasks: number;
          created_at: string;
        }>(`/api/epics/${id}`);
        console.log(`\n\x1b[34m━━━ Epic #${e.id} ━━━\x1b[0m`);
        console.log(`  Title: ${e.title}`);
        console.log(`  Status: ${STATUS_COLORS[e.status] || ''}${e.status}${RESET}`);
        if (e.description) console.log(`  Description: ${e.description}`);
        if (e.estimated_effort) console.log(`  Effort: ${e.estimated_effort}`);
        const progress = Math.round((e.completed_tasks / e.task_count) * 100) || 0;
        console.log(`  Progress: [${progress}%] ${e.completed_tasks}/${e.task_count} tasks`);
        console.log(`  Created: ${e.created_at}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
