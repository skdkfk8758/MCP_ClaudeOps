import { getDb } from '../database/index.js';

interface ContextRecord {
  id: number;
  project_path: string;
  context_type: string;
  title: string;
  content: string;
  created_at: string;
  updated_at: string;
}

export function setContext(projectPath: string, contextType: string, title: string, content: string): ContextRecord {
  const db = getDb();
  db.prepare(`
    INSERT INTO project_contexts (project_path, context_type, title, content)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(project_path, context_type) DO UPDATE SET
      title = excluded.title,
      content = excluded.content,
      updated_at = datetime('now')
  `).run(projectPath, contextType, title, content);

  return db.prepare(
    'SELECT * FROM project_contexts WHERE project_path = ? AND context_type = ?'
  ).get(projectPath, contextType) as ContextRecord;
}

export function getContext(projectPath: string, contextType?: string): ContextRecord[] {
  const db = getDb();
  if (contextType) {
    const row = db.prepare(
      'SELECT * FROM project_contexts WHERE project_path = ? AND context_type = ?'
    ).get(projectPath, contextType) as ContextRecord | undefined;
    return row ? [row] : [];
  }
  return db.prepare(
    'SELECT * FROM project_contexts WHERE project_path = ? ORDER BY updated_at DESC'
  ).all(projectPath) as ContextRecord[];
}

export function listContexts(projectPath: string): ContextRecord[] {
  const db = getDb();
  return db.prepare(
    'SELECT * FROM project_contexts WHERE project_path = ? ORDER BY updated_at DESC'
  ).all(projectPath) as ContextRecord[];
}

export function deleteContext(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM project_contexts WHERE id = ?').run(id);
  return result.changes > 0;
}
