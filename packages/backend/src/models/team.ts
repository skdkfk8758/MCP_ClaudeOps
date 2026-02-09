import { getDb } from '../database/index.js';
import type { Team, TeamCreate, TeamUpdate, TeamMember, MemberCreate, MemberUpdate, MemberWorkload, TeamWorkload } from '@claudeops/shared';

// ─── Teams ───

export function createTeam(data: TeamCreate): Team {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO teams (name, description, avatar_color)
    VALUES (?, ?, ?)
  `);
  const result = stmt.run(data.name, data.description ?? null, data.avatar_color ?? '#6366f1');
  return getTeam(result.lastInsertRowid as number)!;
}

export function getTeam(id: number): Team | undefined {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as Team | undefined;
  if (!team) return undefined;
  const count = db.prepare('SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?').get(id) as { cnt: number };
  team.member_count = count.cnt;
  team.members = listMembers(id);
  return team;
}

export function updateTeam(id: number, data: TeamUpdate): Team | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { fields.push('description = ?'); values.push(data.description); }
  if (data.avatar_color !== undefined) { fields.push('avatar_color = ?'); values.push(data.avatar_color); }
  if (fields.length === 0) return getTeam(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getTeam(id);
}

export function deleteTeam(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listTeams(): Team[] {
  const db = getDb();
  const teams = db.prepare('SELECT * FROM teams ORDER BY created_at DESC').all() as Team[];
  for (const team of teams) {
    const count = db.prepare('SELECT COUNT(*) as cnt FROM team_members WHERE team_id = ?').get(team.id) as { cnt: number };
    team.member_count = count.cnt;
  }
  return teams;
}

// ─── Members ───

export function addMember(data: MemberCreate): TeamMember {
  const db = getDb();
  const stmt = db.prepare(`
    INSERT INTO team_members (team_id, name, role, email, avatar_url, status, specialties)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const result = stmt.run(
    data.team_id, data.name, data.role ?? 'member',
    data.email ?? null, data.avatar_url ?? null,
    data.status ?? 'active',
    data.specialties ? JSON.stringify(data.specialties) : null
  );
  return getMember(result.lastInsertRowid as number)!;
}

export function getMember(id: number): TeamMember | undefined {
  const db = getDb();
  const row = db.prepare(`
    SELECT m.*, t.name as team_name
    FROM team_members m
    JOIN teams t ON m.team_id = t.id
    WHERE m.id = ?
  `).get(id) as (TeamMember & { specialties: string | null }) | undefined;
  if (!row) return undefined;
  row.specialties = row.specialties ? JSON.parse(row.specialties as unknown as string) : [];
  // Count active tasks
  const taskCount = db.prepare(`
    SELECT COUNT(*) as cnt FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.member_id = ? AND t.status != 'done'
  `).get(id) as { cnt: number };
  row.active_task_count = taskCount.cnt;
  return row;
}

export function updateMember(id: number, data: MemberUpdate): TeamMember | undefined {
  const db = getDb();
  const fields: string[] = [];
  const values: unknown[] = [];
  if (data.name !== undefined) { fields.push('name = ?'); values.push(data.name); }
  if (data.role !== undefined) { fields.push('role = ?'); values.push(data.role); }
  if (data.email !== undefined) { fields.push('email = ?'); values.push(data.email); }
  if (data.avatar_url !== undefined) { fields.push('avatar_url = ?'); values.push(data.avatar_url); }
  if (data.status !== undefined) { fields.push('status = ?'); values.push(data.status); }
  if (data.specialties !== undefined) { fields.push('specialties = ?'); values.push(JSON.stringify(data.specialties)); }
  if (fields.length === 0) return getMember(id);
  fields.push("updated_at = datetime('now')");
  values.push(id);
  db.prepare(`UPDATE team_members SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return getMember(id);
}

export function removeMember(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM team_members WHERE id = ?').run(id);
  return result.changes > 0;
}

export function listMembers(teamId?: number): TeamMember[] {
  const db = getDb();
  let query = `
    SELECT m.*, t.name as team_name
    FROM team_members m
    JOIN teams t ON m.team_id = t.id
  `;
  const params: unknown[] = [];
  if (teamId) {
    query += ' WHERE m.team_id = ?';
    params.push(teamId);
  }
  query += ' ORDER BY m.role ASC, m.name ASC';
  const rows = db.prepare(query).all(...params) as (TeamMember & { specialties: string | null })[];
  return rows.map(row => {
    row.specialties = row.specialties ? JSON.parse(row.specialties as unknown as string) : [];
    const taskCount = db.prepare(`
      SELECT COUNT(*) as cnt FROM task_assignees ta
      JOIN tasks t ON ta.task_id = t.id
      WHERE ta.member_id = ? AND t.status != 'done'
    `).get(row.id) as { cnt: number };
    row.active_task_count = taskCount.cnt;
    return row;
  });
}

// ─── Task Assignment ───

export function assignTask(taskId: number, memberIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare('INSERT OR IGNORE INTO task_assignees (task_id, member_id) VALUES (?, ?)');
  for (const memberId of memberIds) {
    stmt.run(taskId, memberId);
  }
}

export function unassignTask(taskId: number, memberIds: number[]): void {
  const db = getDb();
  const stmt = db.prepare('DELETE FROM task_assignees WHERE task_id = ? AND member_id = ?');
  for (const memberId of memberIds) {
    stmt.run(taskId, memberId);
  }
}

export function getTaskAssignees(taskId: number): TeamMember[] {
  const db = getDb();
  const rows = db.prepare(`
    SELECT m.*, t.name as team_name
    FROM task_assignees ta
    JOIN team_members m ON ta.member_id = m.id
    JOIN teams t ON m.team_id = t.id
    WHERE ta.task_id = ?
  `).all(taskId) as (TeamMember & { specialties: string | null })[];
  return rows.map(row => {
    row.specialties = row.specialties ? JSON.parse(row.specialties as unknown as string) : [];
    return row;
  });
}

// ─── Workload ───

export function getMemberWorkload(memberId: number): MemberWorkload | undefined {
  const db = getDb();
  const member = getMember(memberId);
  if (!member) return undefined;

  const tasks = db.prepare(`
    SELECT t.status, t.priority FROM task_assignees ta
    JOIN tasks t ON ta.task_id = t.id
    WHERE ta.member_id = ?
  `).all(memberId) as { status: string; priority: string }[];

  const by_status: Record<string, number> = {};
  const by_priority: Record<string, number> = {};
  for (const t of tasks) {
    by_status[t.status] = (by_status[t.status] ?? 0) + 1;
    by_priority[t.priority] = (by_priority[t.priority] ?? 0) + 1;
  }

  return {
    member_id: member.id,
    member_name: member.name,
    team_name: member.team_name ?? '',
    role: member.role,
    total_tasks: tasks.length,
    by_status,
    by_priority,
  };
}

export function getTeamWorkload(teamId: number): TeamWorkload | undefined {
  const db = getDb();
  const team = db.prepare('SELECT * FROM teams WHERE id = ?').get(teamId) as Team | undefined;
  if (!team) return undefined;

  const members = listMembers(teamId);
  const memberWorkloads: MemberWorkload[] = [];
  let totalTasks = 0;
  const byStatus: Record<string, number> = {};

  for (const m of members) {
    const wl = getMemberWorkload(m.id);
    if (wl) {
      memberWorkloads.push(wl);
      totalTasks += wl.total_tasks;
      for (const [s, c] of Object.entries(wl.by_status)) {
        byStatus[s] = (byStatus[s] ?? 0) + (c as number);
      }
    }
  }

  return {
    team_id: teamId,
    team_name: team.name,
    members: memberWorkloads,
    total_tasks: totalTasks,
    by_status: byStatus,
  };
}
