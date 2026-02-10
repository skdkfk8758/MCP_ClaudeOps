import type { FastifyInstance } from 'fastify';
import {
  // Persona
  listPersonas, getPersona, createPersona, updatePersona, deletePersona,
  // Team
  createTeam, cloneTeam, getTeam, updateTeam, deleteTeam, listTeams,
  archiveTeam, activateTeam,
  // TeamAgent
  addAgentToTeam, updateTeamAgent, removeAgentFromTeam, listTeamAgents,
  // Task-Team
  assignTeamToTask, unassignTeamFromTask, getTaskTeams,
  // Workload
  getTeamWorkload,
  // Templates
  getTeamTemplates,
} from '../models/team.js';
import { wsManager } from '../services/websocket.js';

export async function registerTeamRoutes(app: FastifyInstance): Promise<void> {
  // ─── Personas ───

  app.get('/api/personas', async (request, reply) => {
    const query = request.query as { category?: string; source?: string; search?: string };
    const personas = listPersonas(query);
    return reply.send({ items: personas, total: personas.length });
  });

  app.get('/api/personas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const persona = getPersona(parseInt(id, 10));
    if (!persona) return reply.status(404).send({ error: 'Persona not found' });
    return reply.send(persona);
  });

  app.post('/api/personas', async (request, reply) => {
    const body = request.body as {
      agent_type: string;
      name: string;
      model?: string;
      category?: string;
      description?: string;
      system_prompt?: string;
      capabilities?: string[];
      tool_access?: string[];
      source?: string;
      color?: string;
    };
    try {
      const persona = createPersona(body as Parameters<typeof createPersona>[0]);
      wsManager.notifyPersonaCreated(persona);
      return reply.status(201).send(persona);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.patch('/api/personas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof updatePersona>[1];
    try {
      const persona = updatePersona(parseInt(id, 10), body);
      if (!persona) return reply.status(404).send({ error: 'Persona not found' });
      wsManager.notifyPersonaUpdated(persona);
      return reply.send(persona);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.delete('/api/personas/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    try {
      const success = deletePersona(numId);
      if (!success) return reply.status(404).send({ error: 'Persona not found' });
      wsManager.notifyPersonaDeleted(numId);
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  // ─── Teams ───

  app.post('/api/teams', async (request, reply) => {
    const body = request.body as {
      name: string;
      description?: string;
      avatar_color?: string;
      template_id?: string;
      agent_persona_ids?: number[];
    };
    try {
      const team = createTeam(body);
      wsManager.notifyTeamCreated(team);
      return reply.status(201).send(team);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.post('/api/teams/:id/clone', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { name: string };
    try {
      const team = cloneTeam(parseInt(id, 10), body.name);
      wsManager.notifyTeamCreated(team);
      return reply.status(201).send(team);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get('/api/teams', async (request, reply) => {
    const query = request.query as { status?: string };
    const teams = listTeams(query);
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
    const body = request.body as Parameters<typeof updateTeam>[1];
    try {
      const team = updateTeam(parseInt(id, 10), body);
      if (!team) return reply.status(404).send({ error: 'Team not found' });
      wsManager.notifyTeamUpdated(team);
      return reply.send(team);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.delete('/api/teams/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    try {
      const success = deleteTeam(numId);
      if (!success) return reply.status(404).send({ error: 'Team not found' });
      wsManager.notifyTeamDeleted(numId);
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.patch('/api/teams/:id/archive', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const team = archiveTeam(parseInt(id, 10));
      if (!team) return reply.status(404).send({ error: 'Team not found' });
      wsManager.notifyTeamArchived(team);
      return reply.send(team);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.patch('/api/teams/:id/activate', async (request, reply) => {
    const { id } = request.params as { id: string };
    try {
      const team = activateTeam(parseInt(id, 10));
      if (!team) return reply.status(404).send({ error: 'Team not found' });
      wsManager.notifyTeamActivated(team);
      return reply.send(team);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  // ─── TeamAgents ───

  app.post('/api/teams/:id/agents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Omit<Parameters<typeof addAgentToTeam>[0], 'team_id'>;
    try {
      const teamAgent = addAgentToTeam({
        team_id: parseInt(id, 10),
        ...body,
      });
      wsManager.notifyTeamAgentAdded(teamAgent);
      return reply.status(201).send(teamAgent);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.patch('/api/team-agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as Parameters<typeof updateTeamAgent>[1];
    try {
      const teamAgent = updateTeamAgent(parseInt(id, 10), body);
      if (!teamAgent) return reply.status(404).send({ error: 'TeamAgent not found' });
      wsManager.notifyTeamAgentUpdated(teamAgent);
      return reply.send(teamAgent);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.delete('/api/team-agents/:id', async (request, reply) => {
    const { id } = request.params as { id: string };
    const numId = parseInt(id, 10);
    try {
      const success = removeAgentFromTeam(numId);
      if (!success) return reply.status(404).send({ error: 'TeamAgent not found' });
      wsManager.notifyTeamAgentRemoved({ id: numId });
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get('/api/teams/:id/agents', async (request, reply) => {
    const { id } = request.params as { id: string };
    const agents = listTeamAgents(parseInt(id, 10));
    return reply.send({ items: agents, total: agents.length });
  });

  // ─── Task-Team Assignment ───

  app.post('/api/tasks/:id/assign-team', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { team_id: number; auto_execute?: boolean };
    try {
      const assignment = assignTeamToTask(parseInt(id, 10), body.team_id, body.auto_execute);
      wsManager.notifyTaskTeamAssigned(assignment);
      return reply.status(201).send(assignment);
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.delete('/api/tasks/:id/assign-team', async (request, reply) => {
    const { id } = request.params as { id: string };
    const body = request.body as { team_id: number };
    try {
      const success = unassignTeamFromTask(parseInt(id, 10), body.team_id);
      if (!success) return reply.status(404).send({ error: 'Assignment not found' });
      wsManager.notifyTaskTeamUnassigned({ task_id: parseInt(id, 10), team_id: body.team_id });
      return reply.send({ success: true });
    } catch (err) {
      return reply.status(400).send({ error: err instanceof Error ? err.message : 'Unknown error' });
    }
  });

  app.get('/api/tasks/:id/teams', async (request, reply) => {
    const { id } = request.params as { id: string };
    const teams = getTaskTeams(parseInt(id, 10));
    return reply.send({ items: teams, total: teams.length });
  });

  // ─── Templates & Workload ───

  app.get('/api/team-templates', async (_request, reply) => {
    const templates = getTeamTemplates();
    return reply.send({ items: templates, total: templates.length });
  });

  app.get('/api/teams/:id/workload', async (request, reply) => {
    const { id } = request.params as { id: string };
    const workload = getTeamWorkload(parseInt(id, 10));
    if (!workload) return reply.status(404).send({ error: 'Team not found' });
    return reply.send(workload);
  });
}
