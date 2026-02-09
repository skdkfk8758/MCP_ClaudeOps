import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { stop } from './stop.js';
import { log, ok, warn } from '../utils.js';

export async function teardown(): Promise<void> {
  console.log('\n\x1b[34m  ClaudeOps - Teardown\x1b[0m\n');

  // Stop services
  await stop();

  // Remove MCP server registration and hooks
  const projectDir = process.cwd();
  const settingsPath = join(projectDir, '.claude', 'settings.local.json');

  if (existsSync(settingsPath)) {
    log('Removing MCP server registration and hooks...');
    try {
      const settings = JSON.parse(readFileSync(settingsPath, 'utf-8'));

      // Remove MCP server
      if (settings.mcpServers?.claudeops) {
        delete settings.mcpServers.claudeops;
        ok('MCP server registration removed');
      }

      // Remove hooks
      const hookEvents = ['SessionStart', 'SessionEnd', 'PreToolUse', 'PostToolUse',
        'SubagentStart', 'SubagentStop', 'UserPromptSubmit', 'Stop'];

      for (const event of hookEvents) {
        if (settings.hooks?.[event]) {
          settings.hooks[event] = (settings.hooks[event] as Array<Record<string, unknown>>).filter((h) => {
            const innerHooks = h.hooks as Array<Record<string, string>> | undefined;
            return !innerHooks?.some((inner) => inner.command?.includes('48390'));
          });
          if (settings.hooks[event].length === 0) delete settings.hooks[event];
        }
      }

      writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
      ok('Hooks removed');
    } catch {
      warn('Could not update settings file');
    }
  }

  console.log('\n\x1b[32m  Teardown complete. Restart Claude Code to apply.\x1b[0m\n');
}
