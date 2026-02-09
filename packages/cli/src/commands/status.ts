import { existsSync, readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import { join } from 'node:path';
import { getPidDir, getDataDir, BACKEND_PORT, DASHBOARD_PORT, BACKEND_URL } from '../utils.js';

export async function status(): Promise<void> {
  console.log('\n\x1b[34m  ClaudeOps Status\x1b[0m\n');

  // Backend
  const pidDir = getPidDir();
  const backendPid = existsSync(join(pidDir, 'backend.pid'))
    ? readFileSync(join(pidDir, 'backend.pid'), 'utf-8').trim() : null;

  let backendRunning = false;
  try {
    execSync(`lsof -iTCP:${BACKEND_PORT} -sTCP:LISTEN -t 2>/dev/null`, { encoding: 'utf-8' });
    backendRunning = true;
  } catch { /* not running */ }

  let backendHealthy = false;
  if (backendRunning) {
    try { execSync(`curl -sf "${BACKEND_URL}/health" >/dev/null 2>&1`, { timeout: 3000 }); backendHealthy = true; }
    catch { /* unhealthy */ }
  }

  console.log(`  Backend:    ${backendRunning ? (backendHealthy ? '\x1b[32mhealthy\x1b[0m' : '\x1b[33mrunning\x1b[0m') : '\x1b[31mstopped\x1b[0m'} (port ${BACKEND_PORT}${backendPid ? `, pid ${backendPid}` : ''})`);

  // Dashboard
  let dashboardRunning = false;
  try {
    execSync(`lsof -iTCP:${DASHBOARD_PORT} -sTCP:LISTEN -t 2>/dev/null`, { encoding: 'utf-8' });
    dashboardRunning = true;
  } catch { /* not running */ }

  console.log(`  Dashboard:  ${dashboardRunning ? '\x1b[32mrunning\x1b[0m' : '\x1b[31mstopped\x1b[0m'} (port ${DASHBOARD_PORT})`);

  // Database
  const dbPath = join(getDataDir(), 'claudeops.db');
  const dbExists = existsSync(dbPath);
  console.log(`  Database:   ${dbExists ? '\x1b[32mexists\x1b[0m' : '\x1b[33mnot created\x1b[0m'} (${dbPath})`);

  console.log('');
}
