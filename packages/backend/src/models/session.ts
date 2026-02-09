import { getDb } from '../database/index.js';
import type { Session, SessionCreate, SessionUpdate } from '@claudeops/shared';

export function createSession(data: SessionCreate): Session {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO sessions (id, project_path) VALUES (?, ?)
  `);
  stmt.run(data.id, data.project_path ?? null);
  return getSession(data.id)!;
}

export function getSession(id: string): Session | undefined {
  const db = getDb();
  return db.prepare('SELECT * FROM sessions WHERE id = ?').get(id) as Session | undefined;
}

export function updateSession(id: string, data: SessionUpdate): Session | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];

  if (data.end_time !== undefined) { fields.push('end_time = ?'); values.push(data.end_time); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.summary !== undefined) { fields.push('summary = ?'); values.push(data.summary); }
  if (data.token_input !== undefined) { fields.push('token_input = ?'); values.push(data.token_input); }
  if (data.token_output !== undefined) { fields.push('token_output = ?'); values.push(data.token_output); }
  if (data.cost_usd !== undefined) { fields.push('cost_usd = ?'); values.push(data.cost_usd); }

  if (fields.length === 0) return getSession(id);

  values.push(id);
  db.prepare(`UPDATE sessions SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getSession(id);
}

export function listSessions(options: {
  page?: number;
  page_size?: number;
  status?: string;
  sort?: string;
}): { total: number; page: number; page_size: number; pages: number; items: Session[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 20;
  const offset = (page - 1) * pageSize;

  let whereClause = '';
  const params: unknown[] = [];

  if (options.status) {
    whereClause = 'WHERE status = ?';
    params.push(options.status);
  }

  const sortColumn = options.sort?.replace('-', '') || 'start_time';
  const sortDir = options.sort?.startsWith('-') ? 'DESC' : 'DESC';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM sessions ${whereClause}`).get(...params) as { count: number }).count;
  const items = db.prepare(`SELECT * FROM sessions ${whereClause} ORDER BY ${sortColumn} ${sortDir} LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Session[];

  return {
    total,
    page,
    page_size: pageSize,
    pages: Math.ceil(total / pageSize),
    items,
  };
}

export function getActiveSessions(): Session[] {
  const db = getDb();
  return db.prepare("SELECT * FROM sessions WHERE status = 'active' ORDER BY start_time DESC").all() as Session[];
}
