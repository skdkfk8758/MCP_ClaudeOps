import { getDb } from '../database/index.js';
import type { PrdGitHubConfig, PrdGitHubConfigCreate, PrdGitHubConfigUpdate, GitHubConfig } from '@claudeops/shared';
import { getGitHubConfig } from './github.js';

export function getPrdGitHubConfig(prdId: number): PrdGitHubConfig | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM prd_github_config WHERE prd_id = ?').get(prdId) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return {
    id: row.id as number,
    prd_id: row.prd_id as number,
    repo_owner: row.repo_owner as string,
    repo_name: row.repo_name as string,
    default_branch: row.default_branch as string,
    enabled: Boolean(row.enabled),
    auto_sync: Boolean(row.auto_sync),
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

export function upsertPrdGitHubConfig(data: PrdGitHubConfigCreate & Partial<PrdGitHubConfigUpdate>): PrdGitHubConfig {
  const db = getDb();
  const existing = getPrdGitHubConfig(data.prd_id);

  if (existing) {
    const fields: string[] = [];
    const values: unknown[] = [];

    if (data.repo_owner !== undefined) { fields.push('repo_owner = ?'); values.push(data.repo_owner); }
    if (data.repo_name !== undefined) { fields.push('repo_name = ?'); values.push(data.repo_name); }
    if (data.default_branch !== undefined) { fields.push('default_branch = ?'); values.push(data.default_branch); }
    if (data.enabled !== undefined) { fields.push('enabled = ?'); values.push(data.enabled ? 1 : 0); }
    if (data.auto_sync !== undefined) { fields.push('auto_sync = ?'); values.push(data.auto_sync ? 1 : 0); }

    if (fields.length > 0) {
      fields.push("updated_at = datetime('now')");
      values.push(data.prd_id);
      db.prepare(`UPDATE prd_github_config SET ${fields.join(', ')} WHERE prd_id = ?`).run(...values);
    }
  } else {
    db.prepare(`
      INSERT INTO prd_github_config (prd_id, repo_owner, repo_name, default_branch, enabled, auto_sync)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      data.prd_id,
      data.repo_owner,
      data.repo_name,
      data.default_branch ?? 'main',
      data.enabled !== undefined ? (data.enabled ? 1 : 0) : 1,
      data.auto_sync !== undefined ? (data.auto_sync ? 1 : 0) : 0,
    );
  }

  return getPrdGitHubConfig(data.prd_id)!;
}

export function deletePrdGitHubConfig(prdId: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM prd_github_config WHERE prd_id = ?').run(prdId);
  return result.changes > 0;
}

/**
 * Resolution chain: Task → Epic → PRD → prd_github_config → (fallback to global github_config)
 */
export function getEffectiveGitHubConfig(entityType: 'task' | 'epic' | 'prd', entityId: number): { repo_owner: string; repo_name: string; default_branch: string } | null {
  const db = getDb();

  let prdId: number | null = null;

  if (entityType === 'prd') {
    prdId = entityId;
  } else if (entityType === 'epic') {
    const epic = db.prepare('SELECT prd_id FROM epics WHERE id = ?').get(entityId) as { prd_id: number | null } | undefined;
    prdId = epic?.prd_id ?? null;
  } else if (entityType === 'task') {
    const task = db.prepare('SELECT epic_id FROM tasks WHERE id = ?').get(entityId) as { epic_id: number | null } | undefined;
    if (task?.epic_id) {
      const epic = db.prepare('SELECT prd_id FROM epics WHERE id = ?').get(task.epic_id) as { prd_id: number | null } | undefined;
      prdId = epic?.prd_id ?? null;
    }
  }

  // Try PRD-level config first
  if (prdId) {
    const prdConfig = getPrdGitHubConfig(prdId);
    if (prdConfig && prdConfig.enabled) {
      return {
        repo_owner: prdConfig.repo_owner,
        repo_name: prdConfig.repo_name,
        default_branch: prdConfig.default_branch,
      };
    }
  }

  // Fall back to global config
  const globalConfig: GitHubConfig = getGitHubConfig();
  if (globalConfig.enabled && globalConfig.repo_owner && globalConfig.repo_name) {
    return {
      repo_owner: globalConfig.repo_owner,
      repo_name: globalConfig.repo_name,
      default_branch: 'main',
    };
  }

  return null;
}
