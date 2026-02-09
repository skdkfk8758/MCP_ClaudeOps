import type { FastifyInstance } from 'fastify';
import {
  createTeam, getTeam, updateTeam, deleteTeam, listTeams,
  addMember, updateMember, removeMember, listMembers,
  assignTask, unassignTask, getTaskAssignees,
  getMemberWorkload, getTeamWorkload,
} from '../models/team.js';
import { wsManager } from '../services/websocket.js';

export async function registerTeamRoutes(app: FastifyInstance): Promise<void> {
  // ─── Teams ───

  app.post('/api/teams', async (request, reply) => {
    const body = request.body as { name: string; description?: string; avatar_color?: string };
    const team = createTeam(body);
    wsManager.notifyTeamCreated(team);
    return reply.status(201).send(team);
  });

  app.get('/api/teams', async (_request, reply) => {
    const teams = listTeams();
    return reply.send({ items: teams, total: teams.length });
  });

  app.get('/api/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const team = getTeam(parseInt(id, 10));
    if (!team) return reply.status(404).send({ error: 'Team not found' });
    return reply.send(team);
  });

  app.patch('/api/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; description?: string; avatar_color?: string };
    const team = updateTeam(parseInt(id, 10), body);
    if (!team) return reply.status(404).send({ error: 'Team not found' });
    wsManager.notifyTeamUpdated(team);
    return reply.send(team);
  });

  app.delete('/api/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    const success = deleteTeam(numId);
    if (!success) return reply.status(404).send({ error: 'Team not found' });
    wsManager.notifyTeamDeleted(numId);
    return reply.send({ success: true });
  });

  // ─── Members ───

  app.post('/api/teams/:id/members', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name: string; role?: string; email?: string; avatar_url?: string; specialties?: string[] };
    const member = addMember({ team_id: parseInt(id, 10), ...body } as Parameters<typeof addMember>[0]);
    wsManager.notifyMemberAdded(member);
    return reply.status(201).send(member);
  });

  app.get('/api/members', async (request, reply) => {
    const query = request.query as { team_id?: string };
    const teamId = query.team_id ? parseInt(query.team_id, 10) : undefined;
    const members = listMembers(teamId);
    return reply.send({ items: members, total: members.length });
  });

  app.patch('/api/members/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name?: string; role?: string; email?: string; avatar_url?: string; status?: string; specialties?: string[] };
    const member = updateMember(parseInt(id, 10), body as Parameters<typeof updateMember>[1]);
    if (!member) return reply.status(404).send({ error: 'Member not found' });
    wsManager.notifyMemberUpdated(member);
    return reply.send(member);
  });

  app.delete('/api/members/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    const success = removeMember(numId);
    if (!success) return reply.status(404).send({ error: 'Member not found' });
    wsManager.notifyMemberRemoved(numId);
    return reply.send({ success: true });
  });

  app.get('/api/members/:id/workload', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workload = getMemberWorkload(parseInt(id, 10));
    if (!workload) return reply.status(404).send({ error: 'Member not found' });
    return reply.send(workload);
  });

  // ─── Task Assignment ───

  app.post('/api/tasks/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { member_ids: number[] };
    assignTask(parseInt(id, 10), body.member_ids);
    const assignees = getTaskAssignees(parseInt(id, 10));
    wsManager.notifyTaskAssigned({ task_id: parseInt(id, 10), assignees });
    return reply.send({ success: true, assignees });
  });

  app.delete('/api/tasks/:id/assign', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { member_ids: number[] };
    unassignTask(parseInt(id, 10), body.member_ids);
    const assignees = getTaskAssignees(parseInt(id, 10));
    return reply.send({ success: true, assignees });
  });

  // ─── Team Workload ───

  app.get('/api/teams/:id/workload', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workload = getTeamWorkload(parseInt(id, 10));
    if (!workload) return reply.status(404).send({ error: 'Team not found' });
    return reply.send(workload);
  });
}
