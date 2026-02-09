import { getDb } from '../database/index.js';
import type { GitHubConfig, GitHubConfigUpdate, GitHubSyncLog } from '@claudeops/shared';

export function getGitHubConfig(): GitHubConfig {
  const db = getDb();
  const row = db.prepare('SELECT * FROM github_config WHERE id = 1').get() as Record<string, unknown>;
  return {
    id: row.id as number,
    repo_owner: row.repo_owner as string | null,
    repo_name: row.repo_name as string | null,
    enabled: Boolean(row.enabled),
    auto_sync: Boolean(row.auto_sync),
    updated_at: row.updated_at as string,
  };
}

export function updateGitHubConfig(data: GitHubConfigUpdate): GitHubConfig {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.repo_owner !== undefined) { fields.push('repo_owner = ?'); values.push(data.repo_owner); }
  if (data.repo_name !== undefined) { fields.push('repo_name = ?'); values.push(data.repo_name); }
  if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
  if (data.auto_sync !== undefined) { fields.push('auto_sync = ?'); values.push(data.auto_sync ? 1 : 0); }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    db.prepare(`UPDATE github_config SET ${fields.join(', ')} WHERE id = 1`).run(...values);
  }
  return getGitHubConfig();
}

export function createSyncLog(entityType: string, entityId: number, action: string, githubUrl?: string): GitHubSyncLog {
  const db = getDb();
  const result = db.prepare(
    'INSERT INTO github_sync_log (entity_type, entity_id, action, github_url) VALUES (?, ?, ?, ?)'
  ).run(entityType, entityId, action, githubUrl ?? null);
  return db.prepare('SELECT * FROM github_sync_log WHERE id = ?').get(result.lastInsertRowid) as GitHubSyncLog;
}

export function listSyncLogs(options: { entity_type?: string; entity_id?: number; page?: number; page_size?: number } = {}): { total: number; page: number; page_size: number; pages: number; items: GitHubSyncLog[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.entity_type) { conditions.push('entity_type = ?'); params.push(options.entity_type); }
  if (options.entity_id) { conditions.push('entity_id = ?'); params.push(options.entity_id); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as count FROM github_sync_log ${whereClause}`).get(...params) as { count: number }).count;
  const items = db.prepare(`SELECT * FROM github_sync_log ${whereClause} ORDER BY synced_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as GitHubSyncLog[];

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}
