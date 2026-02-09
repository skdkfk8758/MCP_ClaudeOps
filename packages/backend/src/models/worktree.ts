import { execSync } from 'node:child_process';
import { getDb } from '../database/index.js';

interface WorktreeRecord {
  id: number;
  epic_id: number | null;
  name: string;
  path: string;
  branch: string;
  status: string;
  created_at: string;
  merged_at: string | null;
  epic_title?: string;
}

export function createWorktree(epicId: number | undefined, name: string, projectPath: string): WorktreeRecord {
  const db = getDb();
  const branch = `worktree/${name}`;
  const wtPath = `${projectPath}/../worktrees/${name}`;

  execSync(`git worktree add ${wtPath} -b ${branch}`, { cwd: projectPath, timeout: 30000 });

  const stmt = db.prepare(`
    INSERT INTO worktrees (epic_id, name, path, branch, status)
    VALUES (?, ?, ?, ?, 'active')
  `);
  const result = stmt.run(epicId ?? null, name, wtPath, branch);
  return getWorktree(result.lastInsertRowid as number)!;
}

export function listWorktrees(filter?: { status?: string; epic_id?: number }): WorktreeRecord[] {
  const db = getDb();
  const conditions: string[] = [];
  const params: unknown[] = [];

  if (filter?.status) { conditions.push('status = ?'); params.push(filter.status); }
  if (filter?.epic_id) { conditions.push('epic_id = ?'); params.push(filter.epic_id); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  return db.prepare(`SELECT * FROM worktrees ${whereClause} ORDER BY created_at DESC`).all(...params) as WorktreeRecord[];
}

export function getWorktree(id: number): WorktreeRecord | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT w.*, e.title as epic_title
    FROM worktrees w
    LEFT JOIN epics e ON w.epic_id = e.id
    WHERE w.id = ?
  `).get(id) as WorktreeRecord | undefined;
  return row;
}

export function mergeWorktree(id: number): WorktreeRecord | undefined {
  const db = getDb();
  const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(id) as WorktreeRecord | undefined;
  if (!wt) return undefined;

  execSync(`git -C ${wt.path} checkout main && git merge ${wt.branch}`, { timeout: 30000 });
  execSync(`git worktree remove ${wt.path}`, { timeout: 30000 });

  db.prepare("UPDATE worktrees SET status = 'merged', merged_at = datetime('now') WHERE id = ?").run(id);
  return getWorktree(id);
}

export function removeWorktree(id: number): WorktreeRecord | undefined {
  const db = getDb();
  const wt = db.prepare('SELECT * FROM worktrees WHERE id = ?').get(id) as WorktreeRecord | undefined;
  if (!wt) return undefined;

  execSync(`git worktree remove ${wt.path} --force`, { timeout: 30000 });

  db.prepare("UPDATE worktrees SET status = 'removed' WHERE id = ?").run(id);
  return getWorktree(id);
}
