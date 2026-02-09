import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadRegistry, log, warn } from '../utils.js';

export async function list(): Promise<void> {
  console.log('\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[34m  ClaudeOps - Registered Projects\x1b[0m');
  console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  const projects = loadRegistry();

  if (projects.length === 0) {
    warn('No registered projects. Run "claudeops setup" in a project directory first.');
    return;
  }

  log(`${projects.length} registered project(s):\n`);

  for (let i = 0; i < projects.length; i++) {
    const p = projects[i];
    const settingsPath = join(p.path, '.claude', 'settings.local.json');
    let hasMcp = false;
    let hasHooks = false;

    if (existsSync(settingsPath)) {
      try {
        const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));
        hasMcp = !!settings.mcpServers?.claudeops;
        hasHooks = !!settings.hooks?.SessionStart;
      } catch { /* ignore parse errors */ }
    }

    const exists = existsSync(p.path);
    const date = p.setupAt.split('T')[0];
    const mcpIcon = hasMcp ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const hookIcon = hasHooks ? '\x1b[32m✓\x1b[0m' : '\x1b[31m✗\x1b[0m';
    const pathColor = exists ? '\x1b[36m' : '\x1b[31m';

    console.log(`  ${i + 1}. ${pathColor}${p.path}\x1b[0m`);
    console.log(`     Setup: ${date}  |  MCP: ${mcpIcon}  Hooks: ${hookIcon}${exists ? '' : '  \x1b[31m(not found)\x1b[0m'}`);
  }

  console.log('');
}
