import { getDb } from '../database/index.js';
import type { TaskCommit } from '@claudeops/shared';

export function upsertCommit(data: Omit<TaskCommit, 'id' | 'tracked_at'>): TaskCommit {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO task_commits (task_id, commit_hash, commit_message, author, committed_at, files_changed, insertions, deletions, branch_name)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(task_id, commit_hash) DO UPDATE SET
      commit_message = excluded.commit_message,
      author = excluded.author,
      committed_at = excluded.committed_at,
      files_changed = excluded.files_changed,
      insertions = excluded.insertions,
      deletions = excluded.deletions,
      branch_name = excluded.branch_name
  `);
  stmt.run(
    data.task_id, data.commit_hash, data.commit_message,
    data.author, data.committed_at,
    data.files_changed, data.insertions, data.deletions,
    data.branch_name
  );

  return getCommitByHash(data.task_id, data.commit_hash)!;
}

export function getTaskCommits(taskId: number): TaskCommit[] {
  const db = getDb();
  return db.prepare('SELECT * FROM task_commits WHERE task_id = ? ORDER BY committed_at DESC').all(taskId) as TaskCommit[];
}

export function getCommitByHash(taskId: number, hash: string): TaskCommit | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM task_commits WHERE task_id = ? AND commit_hash = ?').get(taskId, hash) as TaskCommit | undefined;
}

export function deleteTaskCommit(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM task_commits WHERE id = ?').run(id);
  return result.changes > 0;
}
