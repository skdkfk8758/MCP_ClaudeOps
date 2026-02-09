import { getDb } from '../database/index.js';
import type { Epic, EpicCreate, EpicUpdate } from '@claudeops/shared';

export function createEpic(data: EpicCreate): Epic {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO epics (prd_id, title, description, architecture_notes, tech_approach, estimated_effort)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.prd_id ?? null, data.title, data.description ?? null,
    data.architecture_notes ?? null, data.tech_approach ?? null,
    data.estimated_effort ?? null
  );
  return getEpic(result.lastInsertRowid as number)!;
}

export function getEpic(id: number): Epic | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM epics WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return enrichEpic(row);
}

export function updateEpic(id: number, data: EpicUpdate): Epic | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM epics WHERE id = ?').get(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['title', 'description', 'status', 'progress', 'architecture_notes', 'tech_approach', 'estimated_effort', 'prd_id'] as const;
  for (const field of updatableFields) {
    if ((data as Record<string, unknown>)[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push((data as Record<string, unknown>)[field]);
    }
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE epics SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getEpic(id);
}

export function deleteEpic(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM epics WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listEpics(options: { prd_id?: number; status?: string; page?: number; page_size?: number } = {}): { total: number; page: number; page_size: number; pages: number; items: Epic[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.prd_id) { conditions.push('prd_id = ?'); params.push(options.prd_id); }
  if (options.status) { conditions.push('status = ?'); params.push(options.status); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as count FROM epics ${whereClause}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM epics ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];
  const items = rows.map(enrichEpic);

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

export function recalcEpicProgress(epicId: number): void {
  const db = getDb();
  const stats = db.prepare(`
    SELECT COUNT(*) as total, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as done
    FROM tasks WHERE epic_id = ?
  `).get(epicId) as { total: number; done: number };

  const progress = stats.total > 0 ? Math.round((stats.done / stats.total) * 100) : 0;
  db.prepare("UPDATE epics SET progress = ?, updated_at = datetime('now') WHERE id = ?").run(progress, epicId);

  if (progress === 100) {
    db.prepare("UPDATE epics SET status = 'completed', updated_at = datetime('now') WHERE id = ? AND status != 'completed'").run(epicId);
  }
}

function enrichEpic(row: Record<string, unknown>): Epic {
  const db = getDb();
  const epic = { ...row } as unknown as Epic;
  const stats = db.prepare(`
    SELECT COUNT(*) as task_count, SUM(CASE WHEN status = 'done' THEN 1 ELSE 0 END) as completed_count
    FROM tasks WHERE epic_id = ?
  `).get(epic.id) as { task_count: number; completed_count: number };
  epic.task_count = stats.task_count;
  epic.completed_count = stats.completed_count ?? 0;
  return epic;
}
