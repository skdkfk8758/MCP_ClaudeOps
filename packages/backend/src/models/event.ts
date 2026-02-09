import { getDb } from '../database/index.js';
import type { FlowEvent } from '@claudeops/shared';

export function createEvent(data: FlowEvent): { id: number } {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (session_id, event_type, payload) VALUES (?, ?, ?)
  `);
  const result = stmt.run(data.session_id, data.event_type, JSON.stringify(data.payload));
  return { id: Number(result.lastInsertRowid) };
}

export function createEventsBatch(events: FlowEvent[]): { count: number } {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO events (session_id, event_type, payload) VALUES (?, ?, ?)
  `);
  const insertMany = db.transaction((evts: FlowEvent[]) => {
    for (const evt of evts) {
      stmt.run(evt.session_id, evt.event_type, JSON.stringify(evt.payload));
    }
    return evts.length;
  });
  const count = insertMany(events);
  return { count };
}

export function listEvents(options: {
  session_id?: string;
  event_type?: string;
  page?: number;
  page_size?: number;
}): { total: number; page: number; page_size: number; pages: number; items: FlowEvent[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.session_id) { conditions.push('session_id = ?'); params.push(options.session_id); }
  if (options.event_type) { conditions.push('event_type = ?'); params.push(options.event_type); }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM events ${whereClause}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT * FROM events ${whereClause} ORDER BY timestamp DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset) as Array<{ id: number; session_id: string; event_type: string; timestamp: string; payload: string }>;

  const items: FlowEvent[] = rows.map(r => ({
    id: r.id,
    session_id: r.session_id,
    event_type: r.event_type as FlowEvent['event_type'],
    timestamp: r.timestamp,
    payload: r.payload ? JSON.parse(r.payload) : {},
  }));

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

export function getSessionEvents(sessionId: string): FlowEvent[] {
  const db = getDb();
  const rows = db.prepare('SELECT * FROM events WHERE session_id = ? ORDER BY timestamp ASC').all(sessionId) as Array<{ id: number; session_id: string; event_type: string; timestamp: string; payload: string }>;
  return rows.map(r => ({
    id: r.id,
    session_id: r.session_id,
    event_type: r.event_type as FlowEvent['event_type'],
    timestamp: r.timestamp,
    payload: r.payload ? JSON.parse(r.payload) : {},
  }));
}
