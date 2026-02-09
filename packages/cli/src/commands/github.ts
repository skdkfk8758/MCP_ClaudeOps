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

export function registerGitHubCommand(program: Command): void {
  const github = program.command('github').description('GitHub integration management');

  github
    .command('config')
    .description('Show GitHub configuration')
    .action(async () => {
      try {
        const config = await apiFetch<{
          repo_owner: string | null;
          repo_name: string | null;
          enabled: boolean;
          auto_sync: boolean;
        }>('/api/github/config');

        console.log('\n\x1b[34m━━━ GitHub Configuration ━━━\x1b[0m');
        const repoDisplay = config.repo_owner && config.repo_name
          ? `\x1b[36m${config.repo_owner}/${config.repo_name}\x1b[0m`
          : '\x1b[90mNot configured\x1b[0m';
        console.log(`  Repository: ${repoDisplay}`);
        console.log(`  Enabled:    ${config.enabled ? '\x1b[32mYes\x1b[0m' : '\x1b[31mNo\x1b[0m'}`);
        console.log(`  Auto-sync:  ${config.auto_sync ? '\x1b[32mYes\x1b[0m' : '\x1b[90mNo\x1b[0m'}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  github
    .command('setup')
    .description('Configure GitHub integration')
    .requiredOption('--owner <owner>', 'Repository owner')
    .requiredOption('--repo <repo>', 'Repository name')
    .option('--auto-sync', 'Enable automatic sync', false)
    .action(async (opts: { owner: string; repo: string; autoSync?: boolean }) => {
      try {
        await apiFetch('/api/github/config', {
          method: 'PUT',
          body: JSON.stringify({
            repo_owner: opts.owner,
            repo_name: opts.repo,
            enabled: true,
            auto_sync: opts.autoSync || false,
          }),
        });
        console.log(`\x1b[32m✓\x1b[0m GitHub configured: ${opts.owner}/${opts.repo}`);
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  github
    .command('sync')
    .description('Sync entity to GitHub')
    .argument('<type>', 'Entity type: epic or task')
    .argument('<id>', 'Entity ID')
    .action(async (type: string, id: string) => {
      try {
        if (type !== 'epic' && type !== 'task') {
          console.error('\x1b[31m✗\x1b[0m Type must be "epic" or "task"');
          process.exit(1);
        }

        const result = await apiFetch<{
          success: boolean;
          message?: string;
          issue_url?: string;
        }>(`/api/github/sync/${type}/${id}`, { method: 'POST' });

        console.log(`\x1b[32m✓\x1b[0m ${type} #${id} synced to GitHub`);
        if (result.issue_url) {
          console.log(`  Issue URL: \x1b[36m${result.issue_url}\x1b[0m`);
        }
        if (result.message) {
          console.log(`  ${result.message}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });

  github
    .command('post-report')
    .description('Post session report to GitHub issue')
    .argument('<report_id>', 'Report ID')
    .action(async (reportId: string) => {
      try {
        const result = await apiFetch<{
          success: boolean;
          message?: string;
          comment_url?: string;
        }>(`/api/github/sync/report/${reportId}`, { method: 'POST' });

        console.log(`\x1b[32m✓\x1b[0m Report #${reportId} posted to GitHub`);
        if (result.comment_url) {
          console.log(`  Comment URL: \x1b[36m${result.comment_url}\x1b[0m`);
        }
        if (result.message) {
          console.log(`  ${result.message}`);
        }
      } catch (e) {
        console.error(`\x1b[31m✗\x1b[0m ${e instanceof Error ? e.message : String(e)}`);
        process.exit(1);
      }
    });
}
