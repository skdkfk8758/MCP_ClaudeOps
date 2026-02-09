export const PORTS = {
  BACKEND: 48390,
  DASHBOARD: 48391,
} as const;

export const PATHS = {
  DATA_DIR: '~/.claudeops',
  DB_FILE: '~/.claudeops/claudeops.db',
  PID_DIR: '~/.claudeops/pids',
} as const;

export const DEFAULT_PRICING: Record<string, { input: number; output: number }> = {
  'haiku': { input: 0.80, output: 4.00 },
  'sonnet': { input: 3.00, output: 15.00 },
  'opus': { input: 15.00, output: 75.00 },
};

export const RETENTION_DAYS = 90;
export const CHARACTER_LIMIT = 25000;

export const API_ENDPOINTS = {
  SESSIONS: '/api/sessions',
  EVENTS: '/api/events',
  AGENTS: '/api/agents',
  ANALYTICS: '/api/analytics',
  TOKENS: '/api/tokens',
  HEALTH: '/health',
  CONFIG: '/api/config',
  EXPORT: '/api/export',
  TASKS: '/api/tasks',
} as const;
