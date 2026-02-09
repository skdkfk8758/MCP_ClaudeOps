import { execSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getMonorepoRoot, getBackendDir, getDashboardDir, getMcpServerDist,
  getPidDir, getDataDir, BACKEND_PORT, DASHBOARD_PORT, BACKEND_URL, DASHBOARD_URL,
  log, ok, warn, fail,
} from '../utils.js';

function isPortInUse(port: number): { inUse: boolean; pid?: string } {
  try {
    const pid = execSync(`lsof -iTCP:${port} -sTCP:LISTEN -t 2>/dev/null | head -1`, { encoding: 'utf-8' }).trim();
    if (pid) return { inUse: true, pid };
  } catch { /* port free */ }
  return { inUse: false };
}

function waitForHealth(url: string, maxSeconds: number): boolean {
  for (let i = 0; i < maxSeconds; i++) {
    try {
      execSync(`curl -sf "${url}" >/dev/null 2>&1`, { timeout: 3000 });
      return true;
    } catch { /* retry */ }
    execSync('sleep 1');
  }
  return false;
}

export async function setup(): Promise<void> {
  const monorepoRoot = getMonorepoRoot();
  const pidDir = getPidDir();
  const projectDir = process.cwd();
  const settingsPath = join(projectDir, '.claude', 'settings.local.json');

  console.log('\n\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[34m  ClaudeOps - Setup\x1b[0m');
  console.log('\x1b[34m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');

  // Step 1: Pre-flight
  log('Step 1/6: Pre-flight checks...');
  try {
    const nodeVersion = execSync('node -v', { encoding: 'utf-8' }).trim();
    const major = parseInt(nodeVersion.replace('v', '').split('.')[0], 10);
    if (major < 20) fail(`Node.js 20+ required (found ${nodeVersion})`);
    ok(`Node.js ${nodeVersion}`);
  } catch {
    fail('Node.js not found');
  }

  let needBackend = true;
  let needDashboard = true;

  const backendPort = isPortInUse(BACKEND_PORT);
  if (backendPort.inUse) { warn(`Port ${BACKEND_PORT} in use (pid ${backendPort.pid}) — reusing`); needBackend = false; }
  const dashboardPort = isPortInUse(DASHBOARD_PORT);
  if (dashboardPort.inUse) { warn(`Port ${DASHBOARD_PORT} in use (pid ${dashboardPort.pid}) — reusing`); needDashboard = false; }

  // Step 2: Build
  log('Step 2/6: Building packages...');
  try {
    execSync('pnpm turbo run build', { cwd: monorepoRoot, stdio: 'pipe' });
    ok('All packages built');
  } catch (e) {
    fail(`Build failed: ${e instanceof Error ? e.message : String(e)}`);
  }

  // Step 3: Start services
  log('Step 3/6: Starting services...');
  mkdirSync(pidDir, { recursive: true });
  mkdirSync(getDataDir(), { recursive: true });

  if (needBackend) {
    log(`Starting Backend (port ${BACKEND_PORT})...`);
    const proc = spawn('node', [join(getBackendDir(), 'dist', 'index.js')], {
      detached: true,
      stdio: 'ignore',
      env: { ...process.env, CLAUDEOPS_BACKEND_PORT: String(BACKEND_PORT) },
    });
    proc.unref();
    if (proc.pid) writeFileSync(join(pidDir, 'backend.pid'), String(proc.pid));
    if (waitForHealth(`${BACKEND_URL}/health`, 10)) {
      ok(`Backend running (pid ${proc.pid})`);
    } else {
      warn('Backend may still be starting');
    }
  } else {
    ok(`Backend already running on port ${BACKEND_PORT}`);
  }

  if (needDashboard) {
    log(`Starting Dashboard (port ${DASHBOARD_PORT})...`);
    const dashDir = getDashboardDir();
    if (existsSync(join(dashDir, '.next'))) {
      const proc = spawn('npx', ['next', 'start', '--port', String(DASHBOARD_PORT)], {
        cwd: dashDir, detached: true, stdio: 'ignore',
      });
      proc.unref();
      if (proc.pid) writeFileSync(join(pidDir, 'dashboard.pid'), String(proc.pid));
      if (waitForHealth(DASHBOARD_URL, 10)) {
        ok(`Dashboard running (pid ${proc.pid})`);
      } else {
        warn('Dashboard may still be starting');
      }
    } else {
      warn('Dashboard not built yet — run "pnpm turbo run build" first');
    }
  } else {
    ok(`Dashboard already running on port ${DASHBOARD_PORT}`);
  }

  // Step 4: Register MCP Server
  log('Step 4/6: Registering MCP Server...');
  const mcpServerDist = getMcpServerDist();
  if (!existsSync(mcpServerDist)) {
    warn('MCP Server dist not found — skipping registration');
  } else {
    const claudeDir = join(projectDir, '.claude');
    mkdirSync(claudeDir, { recursive: true });
    let settings: Record<string, unknown> = {};
    if (existsSync(settingsPath)) {
      try { settings = JSON.parse(readFileSync(settingsPath, 'utf-8')); } catch { /* fresh */ }
    }
    const mcpServers = (settings.mcpServers ?? {}) as Record<string, unknown>;
    mcpServers['claudeops'] = {
      command: 'node',
      args: [mcpServerDist],
      env: { CLAUDEOPS_BACKEND_URL: BACKEND_URL },
    };
    settings.mcpServers = mcpServers;
    writeFileSync(settingsPath, JSON.stringify(settings, null, 2));
    ok(`MCP Server registered in ${settingsPath}`);
  }

  // Step 5: Install Hooks
  log('Step 5/6: Installing hooks...');
  let hookSettings: Record<string, unknown> = {};
  if (existsSync(settingsPath)) {
    try { hookSettings = JSON.parse(readFileSync(settingsPath, 'utf-8')); } catch { /* fresh */ }
  }
  const hooks: Record<string, unknown[]> = (hookSettings.hooks ?? {}) as Record<string, unknown[]>;

  const hookDefs: Record<string, string> = {
    SessionStart: `node -e "const fs=require('fs');const d=JSON.parse(fs.readFileSync('/dev/stdin','utf8'));const sid=d.session_id||require('crypto').randomUUID();fetch('${BACKEND_URL}/api/sessions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:sid,project_path:d.cwd||process.cwd()}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SessionEnd: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/sessions/'+sid,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({end_time:new Date().toISOString(),status:'completed'}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    PreToolUse: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call_start',payload:{tool_name:d.tool_name}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    PostToolUse: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'tool_call_end',payload:{tool_name:d.tool_name,duration_ms:d.duration_ms,success:true}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SubagentStart: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/agents/executions',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,agent_type:d.agent_type||'unknown',model:d.model||'unknown',task_description:d.task_description}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    SubagentStop: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'subagent_stop',payload:d}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    UserPromptSubmit: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'user_prompt',payload:{prompt_length:d.prompt?d.prompt.length:0}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
    Stop: `node -e "const d=JSON.parse(require('fs').readFileSync('/dev/stdin','utf8'));const sid=d.session_id||'unknown';fetch('${BACKEND_URL}/api/events',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({session_id:sid,event_type:'stop',payload:{reason:d.reason||'unknown'}}),signal:AbortSignal.timeout(3000)}).catch(()=>{});console.log(JSON.stringify({continue:true}))"`,
  };

  for (const [event, command] of Object.entries(hookDefs)) {
    const existing: unknown[] = hooks[event] || [];
    const filtered = (existing as Array<Record<string, unknown>>).filter((h) => {
      const innerHooks = h.hooks as Array<Record<string, string>> | undefined;
      if (innerHooks?.some((inner) => inner.command?.includes(String(BACKEND_PORT)))) return false;
      return true;
    });
    filtered.push({ hooks: [{ type: 'command', command }] });
    hooks[event] = filtered;
  }

  hookSettings.hooks = hooks;
  mkdirSync(join(projectDir, '.claude'), { recursive: true });
  writeFileSync(settingsPath, JSON.stringify(hookSettings, null, 2));
  ok('8 hooks installed');

  // Step 6: Verification
  log('Step 6/6: Verification...');
  if (waitForHealth(`${BACKEND_URL}/health`, 3)) ok('Backend API healthy');
  else warn('Backend API not responding');

  console.log('\n\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m');
  console.log('\x1b[32m  ClaudeOps Setup Complete!\x1b[0m');
  console.log('\x1b[32m━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\x1b[0m\n');
  console.log(`  Backend:    \x1b[34m${BACKEND_URL}\x1b[0m`);
  console.log(`  Dashboard:  \x1b[34m${DASHBOARD_URL}\x1b[0m`);
  console.log(`  Settings:   \x1b[34m${settingsPath}\x1b[0m`);
  console.log('\n  Restart Claude Code to load MCP server and hooks.\n');
}
