import { join } from 'node:path';
import { homedir } from 'node:os';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const BACKEND_PORT = parseInt(process.env.CLAUDEOPS_BACKEND_PORT || '48390', 10);
export const DASHBOARD_PORT = parseInt(process.env.CLAUDEOPS_DASHBOARD_PORT || '48391', 10);
export const BACKEND_URL = process.env.CLAUDEOPS_BACKEND_URL || `http://localhost:${BACKEND_PORT}`;
export const DASHBOARD_URL = `http://localhost:${DASHBOARD_PORT}`;

export function getDataDir(): string {
  return process.env.CLAUDEOPS_DATA_DIR || join(homedir(), '.claudeops');
}

export function getPidDir(): string {
  return join(getDataDir(), 'pids');
}

export function getMonorepoRoot(): string {
  // 1. 환경변수 (install.sh에서 설정)
  if (process.env.CLAUDEOPS_HOME) return process.env.CLAUDEOPS_HOME;

  // 2. 상대 경로 (개발 환경, 기존 방식)
  const relativeRoot = join(__dirname, '..', '..', '..');
  if (existsSync(join(relativeRoot, 'pnpm-workspace.yaml'))) return relativeRoot;

  // 3. 표준 설치 위치
  const standardDir = join(homedir(), '.claudeops-install');
  if (existsSync(join(standardDir, 'pnpm-workspace.yaml'))) return standardDir;

  // 4. Fallback
  return relativeRoot;
}

export function getBackendDir(): string {
  return join(getMonorepoRoot(), 'packages', 'backend');
}

export function getDashboardDir(): string {
  return join(getMonorepoRoot(), 'packages', 'dashboard');
}

export function getMcpServerDist(): string {
  return join(getMonorepoRoot(), 'packages', 'mcp-server', 'dist', 'index.js');
}

export function log(msg: string): void {
  console.log(`\x1b[34m[ClaudeOps]\x1b[0m ${msg}`);
}

export function ok(msg: string): void {
  console.log(`\x1b[32m[  OK  ]\x1b[0m ${msg}`);
}

export function warn(msg: string): void {
  console.log(`\x1b[33m[ WARN ]\x1b[0m ${msg}`);
}

export function fail(msg: string): never {
  console.error(`\x1b[31m[FAIL  ]\x1b[0m ${msg}`);
  process.exit(1);
}
