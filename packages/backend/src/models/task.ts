import { getDb } from '../database/index.js';
import type { Task, TaskCreate, TaskUpdate, TaskMove, TaskBoard, TaskHistoryEntry, TaskStats, TaskStatus } from '@claudeops/shared';
import { recalcEpicProgress } from './epic.js';

function enrichTask(row: Record<string, unknown>): Task {
  const db = getDb();
  const task = row as unknown as Task;
  task.labels = (db.prepare('SELECT label FROM task_labels WHERE task_id = ?').all(task.id) as { label: string }[]).map(r => r.label);
  task.blocks = (db.prepare('SELECT blocks_task_id FROM task_dependencies WHERE task_id = ?').all(task.id) as { blocks_task_id: number }[]).map(r => r.blocks_task_id);
  task.blocked_by = (db.prepare('SELECT task_id FROM task_dependencies WHERE blocks_task_id = ?').all(task.id) as { task_id: number }[]).map(r => r.task_id);
  task.session_ids = (db.prepare('SELECT session_id FROM task_sessions WHERE task_id = ?').all(task.id) as { session_id: string }[]).map(r => r.session_id);
  if (task.epic_id) {
    const epic = db.prepare('SELECT title FROM epics WHERE id = ?').get(task.epic_id) as { title: string } | undefined;
    task.epic_title = epic?.title;
  }
  // Load assignees
  const assigneeRows = db.prepare(`
    SELECT m.id, m.name, m.role, m.avatar_url
    FROM task_assignees ta
    JOIN team_members m ON ta.member_id = m.id
    WHERE ta.task_id = ?
  `).all(task.id) as { id: number; name: string; role: string; avatar_url: string | null }[];
  task.assignees = assigneeRows;
  task.assignee_ids = assigneeRows.map(a => a.id);
  return task;
}

export function createTask(data: TaskCreate): Task {
  const db = getDb();
  const maxPos = (db.prepare(`SELECT COALESCE(MAX(position), -1) + 1 as next_pos FROM tasks WHERE status = ?`).get(data.status ?? 'backlog') as { next_pos: number }).next_pos;

  const stmt = db.prepare(`
    INSERT INTO tasks (title, description, status, priority, assignee, due_date, estimated_effort, position, epic_id)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.title, data.description ?? null, data.status ?? 'backlog',
    data.priority ?? 'P2', data.assignee ?? null, data.due_date ?? null,
    data.estimated_effort ?? null, maxPos, data.epic_id ?? null
  );

  const taskId = result.lastInsertRowid as number;

  if (data.labels?.length) {
    const labelStmt = db.prepare('INSERT OR IGNORE INTO task_labels (task_id, label) VALUES (?, ?)');
    for (const label of data.labels) labelStmt.run(taskId, label);
  }

  return getTask(taskId)!;
}

export function getTask(id: number): Task | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id);
  if (!row) return undefined;
  return enrichTask(row as Record<string, unknown>);
}

export function updateTask(id: number, data: TaskUpdate): Task | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return undefined;

  const fields: string[] = [];
  const values: unknown[] = [];

  const trackableFields: (keyof TaskUpdate)[] = ['title', 'description', 'status', 'priority', 'assignee', 'due_date', 'estimated_effort', 'epic_id'];

  for (const field of trackableFields) {
    if (data[field] !== undefined) {
      fields.push(`${field} = ?`);
      values.push(data[field]);
      // Record history
      if (String(existing[field]) !== String(data[field])) {
        db.prepare('INSERT INTO task_history (task_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?)').run(
          id, field, existing[field] != null ? String(existing[field]) : null, data[field] != null ? String(data[field]) : null
        );
      }
    }
  }

  if (data.status === 'done' && existing.status !== 'done') {
    fields.push('completed_at = ?');
    values.push(new Date().toISOString());
  } else if (data.status && data.status !== 'done' && existing.status === 'done') {
    fields.push('completed_at = ?');
    values.push(null);
  }

  if (fields.length > 0) {
    fields.push("updated_at = datetime('now')");
    values.push(id);
    db.prepare(`UPDATE tasks SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  }

  // Handle labels
  if (data.labels !== undefined) {
    db.prepare('DELETE FROM task_labels WHERE task_id = ?').run(id);
    if (data.labels.length) {
      const labelStmt = db.prepare('INSERT OR IGNORE INTO task_labels (task_id, label) VALUES (?, ?)');
      for (const label of data.labels) labelStmt.run(id, label);
    }
  }

  const updatedTask = getTask(id);
  if (updatedTask?.epic_id) recalcEpicProgress(updatedTask.epic_id);
  return updatedTask;
}

export function deleteTask(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listTasks(options: {
  status?: string; priority?: string; assignee?: string; label?: string;
  page?: number; page_size?: number;
}): { total: number; page: number; page_size: number; pages: number; items: Task[] } {
  const db = getDb();
  const page = options.page ?? 1;
  const pageSize = options.page_size ?? 50;
  const offset = (page - 1) * pageSize;

  const conditions: string[] = [];
  const params: unknown[] = [];

  if (options.status) { conditions.push('t.status = ?'); params.push(options.status); }
  if (options.priority) { conditions.push('t.priority = ?'); params.push(options.priority); }
  if (options.assignee) { conditions.push('t.assignee = ?'); params.push(options.assignee); }
  if (options.label) {
    conditions.push('EXISTS (SELECT 1 FROM task_labels tl WHERE tl.task_id = t.id AND tl.label = ?)');
    params.push(options.label);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const total = (db.prepare(`SELECT COUNT(*) as count FROM tasks t ${whereClause}`).get(...params) as { count: number }).count;
  const rows = db.prepare(`SELECT t.* FROM tasks t ${whereClause} ORDER BY t.position ASC, t.created_at DESC LIMIT ? OFFSET ?`).all(...params, pageSize, offset);
  const items = (rows as Record<string, unknown>[]).map(enrichTask);

  return { total, page, page_size: pageSize, pages: Math.ceil(total / pageSize), items };
}

export function getTaskBoard(): TaskBoard {
  const db = getDb();
  const statuses: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];
  const board: TaskBoard = { backlog: [], todo: [], in_progress: [], review: [], done: [] };

  for (const status of statuses) {
    const rows = db.prepare('SELECT * FROM tasks WHERE status = ? ORDER BY position ASC').all(status);
    board[status] = (rows as Record<string, unknown>[]).map(enrichTask);
  }

  return board;
}

export function moveTask(id: number, move: TaskMove): Task | undefined {
  const db = getDb();
  const existing = db.prepare('SELECT * FROM tasks WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  if (!existing) return undefined;

  const oldStatus = existing.status as string;
  const oldPosition = existing.position as number;

  if (oldStatus !== move.status) {
    db.prepare('INSERT INTO task_history (task_id, field_name, old_value, new_value) VALUES (?, ?, ?, ?)').run(
      id, 'status', oldStatus, move.status
    );
  }

  // Update position of other tasks
  db.prepare('UPDATE tasks SET position = position - 1 WHERE status = ? AND position > ?').run(oldStatus, oldPosition);
  db.prepare('UPDATE tasks SET position = position + 1 WHERE status = ? AND position >= ?').run(move.status, move.position);

  const updates: string[] = ['status = ?', 'position = ?', "updated_at = datetime('now')"];
  const values: unknown[] = [move.status, move.position];

  if (move.status === 'done' && oldStatus !== 'done') {
    updates.push('completed_at = ?');
    values.push(new Date().toISOString());
  } else if (move.status !== 'done' && oldStatus === 'done') {
    updates.push('completed_at = ?');
    values.push(null);
  }

  values.push(id);
  db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...values);

  return getTask(id);
}

export function getTaskHistory(taskId: number): TaskHistoryEntry[] {
  const db = getDb();
  return db.prepare('SELECT * FROM task_history WHERE task_id = ? ORDER BY changed_at DESC').all(taskId) as TaskHistoryEntry[];
}

export function linkTaskSession(taskId: number, sessionId: string): boolean {
  const db = getDb();
  try {
    db.prepare('INSERT OR IGNORE INTO task_sessions (task_id, session_id) VALUES (?, ?)').run(taskId, sessionId);
    return true;
  } catch {
    return false;
  }
}

export function getTaskStats(): TaskStats {
  const db = getDb();

  const total = (db.prepare('SELECT COUNT(*) as count FROM tasks').get() as { count: number }).count;

  const statusRows = db.prepare('SELECT status, COUNT(*) as count FROM tasks GROUP BY status').all() as { status: string; count: number }[];
  const by_status = { backlog: 0, todo: 0, in_progress: 0, review: 0, done: 0 } as Record<string, number>;
  for (const row of statusRows) by_status[row.status] = row.count;

  const priorityRows = db.prepare('SELECT priority, COUNT(*) as count FROM tasks GROUP BY priority').all() as { priority: string; count: number }[];
  const by_priority = { P0: 0, P1: 0, P2: 0, P3: 0 } as Record<string, number>;
  for (const row of priorityRows) by_priority[row.priority] = row.count;

  const doneCount = by_status.done ?? 0;
  const completion_rate = total > 0 ? Math.round((doneCount / total) * 100) : 0;

  const avgTime = db.prepare(`
    SELECT AVG((julianday(completed_at) - julianday(created_at)) * 24) as avg_hours
    FROM tasks WHERE completed_at IS NOT NULL
  `).get() as { avg_hours: number | null };

  const assigneeRows = db.prepare(`SELECT assignee, COUNT(*) as count FROM tasks WHERE assignee IS NOT NULL AND status != 'done' GROUP BY assignee`).all() as { assignee: string; count: number }[];
  const workload_by_assignee: Record<string, number> = {};
  for (const row of assigneeRows) workload_by_assignee[row.assignee] = row.count;

  return {
    total,
    by_status: by_status as TaskStats['by_status'],
    by_priority: by_priority as TaskStats['by_priority'],
    completion_rate,
    avg_time_to_complete_hours: avgTime.avg_hours ? Math.round(avgTime.avg_hours * 10) / 10 : null,
    workload_by_assignee,
  };
}
