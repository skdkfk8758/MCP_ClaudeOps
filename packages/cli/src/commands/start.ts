import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import {
  getBackendDir, getDashboardDir, getPidDir, getDataDir,
  BACKEND_PORT, DASHBOARD_PORT, BACKEND_URL, DASHBOARD_URL,
  log, ok, warn,
} from '../utils.js';

function isPortInUse(port: number): boolean {
  try {
    const pid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: 'utf-8' }).trim();
    return pid.length > 0;
  } catch { return false; }
}

function waitForHealth(url: string, maxSeconds: number): boolean {
  for (let i = 0; i < maxSeconds; i++) {
    try { execSync(`curl -sf "${url}" >/dev/null 2>&1`, { timeout: 3000 }); return true; }
    catch { execSync('sleep 1'); }
  }
  return false;
}

export async function start(service: string): Promise<void> {
  const pidDir = getPidDir();
  mkdirSync(pidDir, { recursive: true });
  mkdirSync(getDataDir(), { recursive: true });

  if (service === 'all' || service === 'backend') {
    if (isPortInUse(BACKEND_PORT)) {
      ok(`Backend already running on port ${BACKEND_PORT}`);
    } else {
      log('Starting backend...');
      const proc = spawn('node', [join(getBackendDir(), 'dist', 'index.js')], {
        detached: true, stdio: 'ignore',
        env: { ...process.env, CLAUDEOPS_BACKEND_PORT: String(BACKEND_PORT) },
      });
      proc.unref();
      if (proc.pid) writeFileSync(join(pidDir, 'backend.pid'), String(proc.pid));
      if (waitForHealth(`${BACKEND_URL}/health`, 10)) ok(`Backend started (pid ${proc.pid})`);
      else warn('Backend may still be starting');
    }
  }

  if (service === 'all' || service === 'dashboard') {
    if (isPortInUse(DASHBOARD_PORT)) {
      ok(`Dashboard already running on port ${DASHBOARD_PORT}`);
    } else {
      const dashDir = getDashboardDir();
      if (!existsSync(join(dashDir, '.next'))) {
        warn('Dashboard not built — run setup first');
        return;
      }
      log('Starting dashboard...');
      const proc = spawn('npx', ['next', 'start', '--port', String(DASHBOARD_PORT)], {
        cwd: dashDir, detached: true, stdio: 'ignore',
      });
      proc.unref();
      if (proc.pid) writeFileSync(join(pidDir, 'dashboard.pid'), String(proc.pid));
      if (waitForHealth(DASHBOARD_URL, 10)) ok(`Dashboard started (pid ${proc.pid})`);
      else warn('Dashboard may still be starting');
    }
  }
}
