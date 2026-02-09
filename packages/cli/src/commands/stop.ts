import { existsSync, readFileSync, unlinkSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { getPidDir, BACKEND_PORT, DASHBOARD_PORT, log, ok, warn } from '../utils.js';

function killByPid(pidFile: string, name: string): boolean {
  if (!existsSync(pidFile)) return false;
  const pid = readFileSync(pidFile, 'utf-8').trim();
  try {
    process.kill(parseInt(pid), 'SIGTERM');
    ok(`${name} stopped (pid ${pid})`);
    unlinkSync(pidFile);
    return true;
  } catch {
    unlinkSync(pidFile);
    return false;
  }
}

function killByPort(port: number, name: string): boolean {
  try {
    const pid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: 'utf-8' }).trim();
    if (pid) {
      process.kill(parseInt(pid), 'SIGTERM');
      ok(`${name} stopped (pid ${pid}, port ${port})`);
      return true;
    }
  } catch { /* not running */ }
  return false;
}

export async function stop(): Promise<void> {
  log('Stopping services...');
  const pidDir = getPidDir();

  if (!killByPid(join(pidDir, 'backend.pid'), 'Backend')) {
    if (!killByPort(BACKEND_PORT, 'Backend')) {
      warn('Backend was not running');
    }
  }

  if (!killByPid(join(pidDir, 'dashboard.pid'), 'Dashboard')) {
    if (!killByPort(DASHBOARD_PORT, 'Dashboard')) {
      warn('Dashboard was not running');
    }
  }

  ok('All services stopped');
}
