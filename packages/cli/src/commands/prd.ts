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
  active: '\x1b[33m',
  completed: '\x1b[32m',
  archived: '\x1b[90m',
};
const RESET = '\x1b[0m';

export function registerPrdCommand(program: Command): void {
  const prd = program.command('prd').description('Manage Product Requirements Documents');

  prd
    .command('create <title>')
    .description('Create a new PRD')
    .option('-d, --description <text>', 'Description')
    .option('-v, --vision <text>', 'Vision statement')
    .action(async (title: string, opts: Record<string, unknown>) => {
      try {
        const body: Record<string, unknown> = { title };
        if (opts.description) body.description = opts.description;
        if (opts.vision) body.vision = opts.vision;
        const prd = await apiFetch<{ id: number; title: string }>('/api/prds', {
          method: 'POST',
          body: JSON.stringify(body),
        });
        console.log(`\x1b[32m✓\x1b[0m PRD #${prd.id} created: ${prd.title}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  prd
    .command('list')
    .description('List PRDs')
    .option('-s, --status <status>', 'Filter by status (backlog|active|completed|archived)')
    .action(async (opts: Record<string, string>) => {
      try {
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        const data = await apiFetch<{
          items: Array<{ id: number; title: string; status: string; epic_count: number }>;
        }>(`/api/prds?${params}`);
        if (data.items.length === 0) {
          console.log('No PRDs found.');
          return;
        }
        for (const p of data.items) {
          const sc = STATUS_COLORS[p.status] || '';
          console.log(
            `  #${p.id} ${sc}[${p.status}]${RESET} ${p.title} (${p.epic_count} epics)`
          );
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  prd
    .command('show <id>')
    .description('Show PRD details')
    .action(async (id: string) => {
      try {
        const p = await apiFetch<{
          id: number;
          title: string;
          status: string;
          vision: string | null;
          description: string | null;
          epic_count: number;
          created_at: string;
        }>(`/api/prds/${id}`);
        console.log(`\n\x1b[34m━━━ PRD #${p.id} ━━━\x1b[0m`);
        console.log(`  Title: ${p.title}`);
        console.log(`  Status: ${STATUS_COLORS[p.status] || ''}${p.status}${RESET}`);
        if (p.vision) console.log(`  Vision: ${p.vision}`);
        if (p.description) console.log(`  Description: ${p.description}`);
        console.log(`  Epics: ${p.epic_count}`);
        console.log(`  Created: ${p.created_at}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
