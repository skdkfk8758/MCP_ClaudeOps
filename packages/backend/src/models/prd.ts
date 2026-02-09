import { getDb } from '../database/index.js';
import type { Prd, PrdCreate, PrdUpdate } from '@claudeops/shared';

export function createPrd(data: PrdCreate): Prd {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO prds (title, description, vision, user_stories, success_criteria, constraints, out_of_scope)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.title, data.description ?? null, data.vision ?? null,
    data.user_stories ? JSON.stringify(data.user_stories) : null,
    data.success_criteria ? JSON.stringify(data.success_criteria) : null,
    data.constraints ?? null, data.out_of_scope ?? null
  );
  return getPrd(result.lastInsertRowid as number)!;
}

export function getPrd(id: number): Prd | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM prds WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!row) return undefined;
  return enrichPrd(row);
}

export function updatePrd(id: number, data: PrdUpdate): Prd | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM prds WHERE id = ?').get(id);
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  const updatableFields = ['title', 'description', 'status', 'vision', 'constraints', 'out_of_scope'] as const;
  for (const field of updatableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
    }
  }
  if (data.user_stories !== undefined) {
    fields.push('user_stories = ?');
    values.push(JSON.stringify(data.user_stories));
  }
  if (data.success_criteria !== undefined) {
    fields.push('success_criteria = ?');
    values.push(JSON.stringify(data.success_criteria));
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE prds SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }
  return getPrd(id);
}

export function deletePrd(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM prds WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listPrds(options: { status?: string; page?: number; page_size?: number } = {}): { total: number; page: number; page_size: number; pages: number; items: Prd[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];
  if (options.status) { conditions.push('status = ?'); params.push(options.status); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
  const total = (db.prepare(`SELECT COUNT(*) as count FROM prds ${whereClause}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM prds ${whereClause} ORDER BY created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Record<string, unknown>[];
  const items = rows.map(enrichPrd);

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

function enrichPrd(row: Record<string, unknown>): Prd {
  const db = getDb();
  const prd = { ...row } as unknown as Prd;
  if (typeof prd.user_stories === 'string') prd.user_stories = JSON.parse(prd.user_stories as unknown as string);
  if (typeof prd.success_criteria === 'string') prd.success_criteria = JSON.parse(prd.success_criteria as unknown as string);
  const epicCount = db.prepare('SELECT COUNT(*) as count FROM epics WHERE prd_id = ?').get(prd.id) as { count: number };
  prd.epic_count = epicCount.count;
  return prd;
}
