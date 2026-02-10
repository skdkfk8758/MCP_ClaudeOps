import { execSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getMonorepoRoot, getMcpServerDist, registerProject,
  BACKEND_PORT, BACKEND_URL,
  log, ok, warn,
} from '../utils.js';

interface RestartOptions {
  force?: boolean;
  skipUpdate?: boolean;
  skipSetup?: boolean;
}

function runCmd(cmd: string, cwd?: string, timeout = 300_000): { success: boolean; output: string } {
  try {
    const output = execSync(cmd, { cwd, encoding: 'utf-8', stdio: 'pipe', timeout });
    return { success: true, output: output.trim() };
  } catch (e) {
    return { success: false, output: e instanceof Error ? e.message : String(e) };
  }
}

/** Step 1: GitHub 업데이트 감지 */
function checkForUpdates(root: string): boolean {
  log('Step 1/4: Checking for updates...');

  const fetch = runCmd('git fetch origin', root, 30_000);
  if (!fetch.success) {
    warn('git fetch failed (network issue?) — skipping update');
    return false;
  }

  const local = runCmd('git rev-parse HEAD', root);
  const remote = runCmd('git rev-parse @{u}', root);

  if (!local.success || !remote.success) {
    warn('Cannot compare local/remote — skipping update');
    return false;
  }

  if (local.output === remote.output) {
    ok('Already up to date');
    return false;
  }

  ok(`Update available (local: ${local.output.slice(0, 7)}, remote: ${remote.output.slice(0, 7)})`);
  return true;
}

/** Step 2: 업데이트 적용 (pull + install + build) */
function applyUpdate(root: string): boolean {
  log('Step 2/4: Applying update...');

  const pull = runCmd('git pull --ff-only', root);
  if (!pull.success) {
    warn('git pull --ff-only failed (conflict?) — using existing code');
    return false;
  }
  ok('git pull complete');

  const install = runCmd('pnpm install --frozen-lockfile', root);
  if (!install.success) {
    warn('pnpm install failed — continuing with existing dependencies');
  } else {
    ok('Dependencies installed');
  }

  const build = runCmd('pnpm turbo run build', root);
  if (!build.success) {
    warn('Build failed — restarting with existing dist/');
    return false;
  }
  ok('Build complete');
  return true;
}

/** Step 4: MCP/Hook 재등록 (현재 프로젝트만) */
function reregisterSetup(projectDir: string): void {
  log('Step 4/4: Re-registering MCP & hooks...');

  const monorepoRoot = getMonorepoRoot();
  const settingsPath = join(projectDir, '.claude', 'settings.local.json');
  const claudeDir = join(projectDir, '.claude');
  mkdirSync(claudeDir, { recursive: true });

  let settings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try { settings = JSON.parse(readFileSync(settingsPath, 'utf-8')); } catch { /* fresh */ }
  }

  // MCP 서버 등록
  const mcpServerDist = getMcpServerDist();
  if (existsSync(mcpServerDist)) {
    const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers['claudeops'] = {
      command: 'node',
      args: [mcpServerDist],
      env: { CLAUDEOPS_BACKEND_URL: BACKEND_URL },
    };
    settings.mcpServers = mcpServers;
    ok('MCP server registered');
  } else {
    warn('MCP server dist not found — skipping');
  }

  // Hook 설치
  const hooksDir = join(monorepoRoot, 'packages', 'hooks');
  const hookDefs: Record<string, string> = {
    SessionStart: `node "${join(hooksDir, 'session-start.js')}"`,
    SessionEnd: `node "${join(hooksDir, 'session-end.js')}"`,
    PreToolUse: `node "${join(hooksDir, 'pre-tool-use.js')}"`,
    PostToolUse: `node "${join(hooksDir, 'post-tool-use.js')}"`,
    SubagentStart: `node "${join(hooksDir, 'subagent-start.js')}"`,
    SubagentStop: `node "${join(hooksDir, 'subagent-stop.js')}"`,
    UserPromptSubmit: `node "${join(hooksDir, 'user-prompt-submit.js')}"`,
    Stop: `node "${join(hooksDir, 'stop.js')}"`,
  };

  const hooks: Record<string, unknown[]> = (settings.hooks ?? {}) as Record<string, unknown[]>;
  for (const [event, command] of Object.entries(hookDefs)) {
    const existing: unknown[] = hooks[event] || [];
    const filtered = (existing as Array<Record<string, unknown>>).filter((h) => {
      const innerHooks = h.hooks as Array<Record<string, string>> | undefined;
      if (innerHooks?.some((inner) =>
        inner.command?.includes(String(BACKEND_PORT)) || inner.command?.includes('packages/hooks/')
      )) return false;
      return true;
    });
    filtered.push({ hooks: [{ type: 'command', command, environment: { CLAUDEOPS_BACKEND_URL: BACKEND_URL } }] });
    hooks[event] = filtered;
  }
  settings.hooks = hooks;

  writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
  ok('8 hooks installed');

  // 프로젝트 레지스트리 갱신
  registerProject(projectDir);
  ok(`Project registered: ${projectDir}`);
}

export async function restart(options: RestartOptions): Promise<void> {
  const monorepoRoot = getMonorepoRoot();
  const projectDir = process.cwd();

  console.log('\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[34m  ClaudeOps - Restart\x1b[0m');
  console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  // Step 1 & 2: 업데이트 감지 + 적용
  if (options.skipUpdate) {
    log('Step 1/4: Skipping update check (--skip-update)');
    log('Step 2/4: Skipping update apply (--skip-update)');
  } else {
    const hasUpdate = checkForUpdates(monorepoRoot);
    if (hasUpdate) {
      applyUpdate(monorepoRoot);
    } else {
      log('Step 2/4: No update to apply');
    }
  }

  // Step 3: 서비스 재시작
  log('Step 3/4: Restarting services...');
  const { stop } = await import('./stop.js');
  await stop();
  const { start } = await import('./start.js');
  await start('all');

  // Step 4: Setup 재등록
  if (options.skipSetup) {
    log('Step 4/4: Skipping setup re-registration (--skip-setup)');
  } else {
    reregisterSetup(projectDir);
  }

  console.log('\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[32m  Restart Complete!\x1b[0m');
  console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
  console.log('  Restart Claude Code to apply hook/MCP changes.\n');
}
