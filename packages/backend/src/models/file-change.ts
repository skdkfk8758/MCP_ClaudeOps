import { getDb } from '../database/index.js';

export function createFileChange(data: {
  session_id: string; file_path: string; change_type: string;
  lines_added?: number; lines_removed?: number;
}): { id: number } {
  const db = getDb();
  const result = db.prepare(`
    INSERT INTO file_changes (session_id, file_path, change_type, lines_added, lines_removed)
    VALUES (?, ?, ?, ?, ?)
  `).run(data.session_id, data.file_path, data.change_type, data.lines_added ?? 0, data.lines_removed ?? 0);
  return { id: Number(result.lastInsertRowid) };
}

export function createFileChangesBatch(changes: Array<{
  session_id: string; file_path: string; change_type: string;
  lines_added?: number; lines_removed?: number;
}>): { count: number } {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO file_changes (session_id, file_path, change_type, lines_added, lines_removed)
    VALUES (?, ?, ?, ?, ?)
  `);
  const insertMany = db.transaction((items: typeof changes) => {
    for (const c of items) {
      stmt.run(c.session_id, c.file_path, c.change_type, c.lines_added ?? 0, c.lines_removed ?? 0);
    }
    return items.length;
  });
  return { count: insertMany(changes) };
}

export function getFileHotspots(days: number = 30, limit: number = 20): Array<{
  file_path: string; change_count: number; total_added: number; total_removed: number;
}> {
  const db = getDb();
  return db.prepare(`
    SELECT file_path, COUNT(*) as change_count,
      SUM(lines_added) as total_added, SUM(lines_removed) as total_removed
    FROM file_changes
    WHERE timestamp >= datetime('now', '-${days} days')
    GROUP BY file_path ORDER BY change_count DESC LIMIT ?
  `).all(limit) as Array<{
    file_path: string; change_count: number; total_added: number; total_removed: number;
  }>;
}
