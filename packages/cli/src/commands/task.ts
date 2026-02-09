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
  todo: '\x1b[36m',
  in_progress: '\x1b[33m',
  review: '\x1b[35m',
  done: '\x1b[32m',
};
const PRIORITY_COLORS: Record<string, string> = {
  P0: '\x1b[31m', P1: '\x1b[33m', P2: '\x1b[34m', P3: '\x1b[90m',
};
const RESET = '\x1b[0m';

export function registerTaskCommand(program: Command): void {
  const task = program.command('task').description('Manage tasks and kanban board');

  task
    .command('create <title>')
    .description('Create a new task')
    .option('-d, --description <text>', 'Description')
    .option('-s, --status <status>', 'Status (backlog|todo|in_progress|review|done)', 'backlog')
    .option('-p, --priority <priority>', 'Priority (P0|P1|P2|P3)', 'P2')
    .option('-a, --assignee <name>', 'Assignee')
    .option('-l, --label <labels...>', 'Labels')
    .option('-e, --effort <size>', 'Effort (S|M|L|XL)')
    .action(async (title: string, opts: Record<string, unknown>) => {
      try {
        const body: Record<string, unknown> = { title };
        if (opts.description) body.description = opts.description;
        if (opts.status) body.status = opts.status;
        if (opts.priority) body.priority = opts.priority;
        if (opts.assignee) body.assignee = opts.assignee;
        if (opts.label) body.labels = opts.label;
        if (opts.effort) body.estimated_effort = opts.effort;
        const task = await apiFetch<{ id: number; title: string }>('/api/tasks', {
          method: 'POST', body: JSON.stringify(body),
        });
        console.log(`\x1b[32m✓\x1b[0m Task #${task.id} created: ${task.title}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  task
    .command('list')
    .description('List tasks')
    .option('-s, --status <status>', 'Filter by status')
    .option('-p, --priority <priority>', 'Filter by priority')
    .option('-a, --assignee <name>', 'Filter by assignee')
    .action(async (opts: Record<string, string>) => {
      try {
        const params = new URLSearchParams();
        if (opts.status) params.set('status', opts.status);
        if (opts.priority) params.set('priority', opts.priority);
        if (opts.assignee) params.set('assignee', opts.assignee);
        const data = await apiFetch<{ items: Array<{ id: number; title: string; status: string; priority: string; assignee: string | null }> }>(`/api/tasks?${params}`);
        if (data.items.length === 0) { console.log('No tasks found.'); return; }
        for (const t of data.items) {
          const sc = STATUS_COLORS[t.status] || '';
          const pc = PRIORITY_COLORS[t.priority] || '';
          console.log(`  ${pc}${t.priority}${RESET} #${t.id} ${sc}[${t.status}]${RESET} ${t.title}${t.assignee ? ` (${t.assignee})` : ''}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  task
    .command('update <id>')
    .description('Update a task')
    .option('-t, --title <title>', 'New title')
    .option('-s, --status <status>', 'New status')
    .option('-p, --priority <priority>', 'New priority')
    .option('-a, --assignee <name>', 'New assignee')
    .action(async (id: string, opts: Record<string, string>) => {
      try {
        const body: Record<string, unknown> = {};
        if (opts.title) body.title = opts.title;
        if (opts.status) body.status = opts.status;
        if (opts.priority) body.priority = opts.priority;
        if (opts.assignee) body.assignee = opts.assignee;
        await apiFetch(`/api/tasks/${id}`, { method: 'PATCH', body: JSON.stringify(body) });
        console.log(`\x1b[32m✓\x1b[0m Task #${id} updated`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  task
    .command('board')
    .description('Show kanban board')
    .action(async () => {
      try {
        const board = await apiFetch<Record<string, Array<{ id: number; title: string; priority: string; assignee: string | null }>>>('/api/tasks/board');
        const columns = ['backlog', 'todo', 'in_progress', 'review', 'done'];
        const labels: Record<string, string> = { backlog: 'Backlog', todo: 'To Do', in_progress: 'In Progress', review: 'Review', done: 'Done' };
        console.log('\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
        console.log('\x1b[34m  ClaudeOps - Task Board\x1b[0m');
        console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
        for (const col of columns) {
          const tasks = board[col] || [];
          const sc = STATUS_COLORS[col] || '';
          console.log(`${sc}▌ ${labels[col]} (${tasks.length})${RESET}`);
          if (tasks.length === 0) {
            console.log('  (empty)');
          } else {
            for (const t of tasks) {
              const pc = PRIORITY_COLORS[t.priority] || '';
              console.log(`  ${pc}${t.priority}${RESET} #${t.id} ${t.title}${t.assignee ? ` \x1b[90m@${t.assignee}${RESET}` : ''}`);
            }
          }
          console.log();
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  task
    .command('link <taskId> <sessionId>')
    .description('Link a session to a task')
    .action(async (taskId: string, sessionId: string) => {
      try {
        await apiFetch(`/api/tasks/${taskId}/link-session`, {
          method: 'POST', body: JSON.stringify({ session_id: sessionId }),
        });
        console.log(`\x1b[32m✓\x1b[0m Session ${sessionId.slice(0, 8)}... linked to task #${taskId}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
