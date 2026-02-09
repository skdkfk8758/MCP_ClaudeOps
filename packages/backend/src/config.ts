import { homedir } from 'node:os';
import { join } from 'node:path';

export const config = {
  port: parseInt(process.env.CLAUDEOPS_BACKEND_PORT || '48390', 10),
  host: '0.0.0.0',
  dataDir: process.env.CLAUDEOPS_DATA_DIR || join(homedir(), '.claudeops'),
  dbPath: process.env.CLAUDEOPS_DB_PATH || join(homedir(), '.claudeops', 'claudeops.db'),
  retentionDays: parseInt(process.env.CLAUDEOPS_RETENTION_DAYS || '90', 10),
  dashboardPort: parseInt(process.env.CLAUDEOPS_DASHBOARD_PORT || '48391', 10),
};
