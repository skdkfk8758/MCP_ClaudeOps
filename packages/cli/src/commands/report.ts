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

export function registerReportCommand(program: Command): void {
  const report = program.command('report').description('Generate reports');

  report
    .command('session <sessionId>')
    .description('Generate session report')
    .action(async (sessionId: string) => {
      try {
        const data = await apiFetch<{ content: string }>(`/api/reports/session/${sessionId}`);
        console.log(data.content);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  report
    .command('standup')
    .description('Generate standup report')
    .option('-d, --date <date>', 'Date (YYYY-MM-DD)')
    .action(async (opts: Record<string, string>) => {
      try {
        const params = new URLSearchParams();
        if (opts.date) params.set('date', opts.date);
        const data = await apiFetch<{ content: string }>(`/api/reports/standup?${params}`);
        console.log(data.content);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
