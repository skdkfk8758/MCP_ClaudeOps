import { execSync } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getMonorepoRoot, getDataDir, getMcpServerDist,
  loadRegistry, BACKEND_PORT, BACKEND_URL,
  log, ok, warn, fail,
} from '../utils.js';

function runStep(label: string, cmd: string, cwd?: string): boolean {
  try {
    execSync(cmd, { cwd, stdio: 'pipe', timeout: 300_000 });
    ok(label);
    return true;
  } catch (e) {
    warn(`${label}: ${e instanceof Error ? e.message : String(e)}`);
    return false;
  }
}

function upgradeGlobal(): boolean {
  const root = getMonorepoRoot();
  log('Pulling latest changes...');
  if (!runStep('git pull', 'git pull --ff-only', root)) {
    warn('git pull failed — you may need to resolve conflicts manually');
    return false;
  }

  log('Installing dependencies...');
  runStep('pnpm install', 'pnpm install --frozen-lockfile', root);

  log('Building packages...');
  if (!runStep('pnpm turbo run build', 'pnpm turbo run build', root)) {
    fail('Build failed — upgrade aborted');
  }

  ok('Global upgrade complete');
  return true;
}

function migrateDb(): void {
  log('Running DB migration...');
  const dbPath = join(getDataDir(), 'claudeops.db');
  if (!existsSync(dbPath)) {
    warn('No database found — skipping migration');
    return;
  }

  const migrations: string[] = [
    // v1.5: Team management tables
    `CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    )`,
    `CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      role TEXT DEFAULT 'member',
      created_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (team_id) REFERENCES teams(id)
    )`,
    `CREATE TABLE IF NOT EXISTS task_assignees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      member_id INTEGER NOT NULL,
      assigned_at TEXT DEFAULT (datetime('now')),
      FOREIGN KEY (member_id) REFERENCES team_members(id)
    )`,
  ];

  try {
    for (const sql of migrations) {
      execSync(`sqlite3 "${dbPath}" "${sql.replace(/\n/g, ' ')}"`, { stdio: 'pipe' });
    }
    ok('DB migration complete');
  } catch (e) {
    warn(`DB migration issue: ${e instanceof Error ? e.message : String(e)}`);
  }
}

function upgradeProjects(): void {
  const projects = loadRegistry();
  if (projects.length === 0) {
    warn('No registered projects found');
    return;
  }

  log(`Updating ${projects.length} registered project(s)...`);
  const mcpServerDist = getMcpServerDist();
  const hooksDir = join(getMonorepoRoot(), 'packages', 'hooks');

  for (const project of projects) {
    if (!existsSync(project.path)) {
      warn(`Project not found: ${project.path} — skipping`);
      continue;
    }

    const settingsPath = join(project.path, '.claude', 'settings.local.json');
    if (!existsSync(settingsPath)) {
      warn(`No settings found: ${project.path} — skipping`);
      continue;
    }

    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // Update MCP server path
      if (settings.mcpServers?.claudeops) {
        settings.mcpServers.claudeops = {
          command: 'node',
          args: [mcpServerDist],
          env: { CLAUDEOPS_BACKEND_URL: BACKEND_URL },
        };
      }

      // Update hook paths
      if (settings.hooks) {
        const hookEvents = ['SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse',
          'SubagentStart', 'SubagentStop', 'UserPromptSubmit', 'Stop'];
        const hookFiles: Record<string, string> = {
          SessionStart: 'session-start.js',
          SessionEnd: 'session-end.js',
          PreToolUse: 'pre-tool-use.js',
          PostToolUse: 'post-tool-use.js',
          SubagentStart: 'subagent-start.js',
          SubagentStop: 'subagent-stop.js',
          UserPromptSubmit: 'user-prompt-submit.js',
          Stop: 'stop.js',
        };

        for (const event of hookEvents) {
          const existing: unknown[] = settings.hooks[event] || [];
          const filtered = (existing as Array<Record<string, unknown>>).filter((h) => {
            const innerHooks = h.hooks as Array<Record<string, string>> | undefined;
            if (innerHooks?.some((inner) =>
              inner.command?.includes(String(BACKEND_PORT)) || inner.command?.includes('packages/hooks/')
            )) return false;
            return true;
          });
          const command = `node "${join(hooksDir, hookFiles[event])}"`;
          filtered.push({ hooks: [{ type: 'command', command, environment: { CLAUDEOPS_BACKEND_URL: BACKEND_URL } }] });
          settings.hooks[event] = filtered;
        }
      }

      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      ok(`Updated: ${project.path}`);
    } catch (e) {
      warn(`Failed to update ${project.path}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }
}

function restartServices(): void {
  log('Restarting services...');
  try {
    execSync('claudeops stop', { stdio: 'pipe', timeout: 10_000 });
  } catch { /* may not be running */ }
  try {
    execSync('claudeops start', { stdio: 'pipe', timeout: 30_000 });
    ok('Services restarted');
  } catch (e) {
    warn(`Service restart issue: ${e instanceof Error ? e.message : String(e)}`);
  }
}

export async function upgrade(options: { global?: boolean; db?: boolean }): Promise<void> {
  console.log('\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[34m  ClaudeOps - Upgrade\x1b[0m');
  console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  if (options.db) {
    migrateDb();
  } else if (options.global) {
    upgradeGlobal();
    migrateDb();
    restartServices();
  } else {
    // Full upgrade: global + projects + db + restart
    upgradeGlobal();
    migrateDb();
    upgradeProjects();
    restartServices();
  }

  console.log('\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[32m  Upgrade Complete!\x1b[0m');
  console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
  console.log('  Restart Claude Code to apply changes.\n');
}
