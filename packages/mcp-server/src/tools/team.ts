import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiPatch, apiDelete } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerTeamTools(server: McpServer): void {
  // ─── Persona 도구 ───

  server.tool(
    'claudeops_list_personas',
    'List agent personas (preset + custom). Filter by category, source, or search keyword.',
    {
      category: z.string().optional().describe('Filter by category (build-analysis, review, domain, product, coordination, custom)'),
      source: z.string().optional().describe('Filter by source (preset or custom)'),
      search: z.string().optional().describe('Search in name, description, agent_type'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format, ...filter }) => {
      const params = new URLSearchParams();
      if (filter.category) params.set('category', filter.category);
      if (filter.source) params.set('source', filter.source);
      if (filter.search) params.set('search', filter.search);
      const result = await apiGet(`/api/personas?${params}`);
      return formatToolResponse(result, 'Agent Personas', response_format);
    }
  );

  server.tool(
    'claudeops_create_persona',
    'Create a custom agent persona with optional system prompt and capabilities',
    {
      agent_type: z.string().describe('Unique agent type identifier (e.g. "my-reviewer")'),
      name: z.string().describe('Display name'),
      model: z.enum(['haiku', 'sonnet', 'opus']).optional().describe('Model tier (default: sonnet)'),
      category: z.string().optional().describe('Category (default: custom)'),
      description: z.string().optional().describe('Agent description'),
      system_prompt: z.string().optional().describe('System prompt (max 2000 chars)'),
      capabilities: z.array(z.string()).optional().describe('Capabilities list'),
      tool_access: z.array(z.string()).optional().describe('Allowed MCP tools (null = all)'),
      color: z.string().optional().describe('UI color hex'),
    },
    async (params) => {
      const result = await apiPost('/api/personas', params);
      return formatToolResponse(result, 'Persona Created');
    }
  );

  server.tool(
    'claudeops_update_persona',
    'Update a persona (preset: only system_prompt, custom: all fields)',
    {
      id: z.number().int().describe('Persona ID'),
      name: z.string().optional().describe('Display name'),
      model: z.enum(['haiku', 'sonnet', 'opus']).optional().describe('Model tier'),
      description: z.string().optional().describe('Description'),
      system_prompt: z.string().optional().describe('System prompt (max 2000 chars)'),
      capabilities: z.array(z.string()).optional().describe('Capabilities'),
      color: z.string().optional().describe('UI color hex'),
    },
    async ({ id, ...data }) => {
      const result = await apiPatch(`/api/personas/${id}`, data);
      return formatToolResponse(result, 'Persona Updated');
    }
  );

  server.tool(
    'claudeops_delete_persona',
    'Delete a custom persona (preset personas cannot be deleted)',
    {
      id: z.number().int().describe('Persona ID to delete'),
    },
    async ({ id }) => {
      const result = await apiDelete(`/api/personas/${id}`);
      return formatToolResponse(result, 'Persona Deleted');
    }
  );

  // ─── Team 도구 ───

  server.tool(
    'claudeops_create_team',
    'Create a new team. Optionally use a template_id or provide agent_persona_ids.',
    {
      name: z.string().describe('Team name'),
      description: z.string().optional().describe('Team description'),
      avatar_color: z.string().optional().describe('Team color hex (default: #6366f1)'),
      template_id: z.string().optional().describe('Create from template (feature-development, bug-investigation, code-review, product-discovery, refactoring)'),
      agent_persona_ids: z.array(z.number().int()).optional().describe('Persona IDs to add to team'),
    },
    async (params) => {
      const result = await apiPost('/api/teams', params);
      return formatToolResponse(result, 'Team Created');
    }
  );

  server.tool(
    'claudeops_list_teams',
    'List all teams with agent counts',
    {
      status: z.enum(['active', 'archived']).optional().describe('Filter by status'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ status, response_format }) => {
      const params = new URLSearchParams();
      if (status) params.set('status', status);
      const result = await apiGet(`/api/teams?${params}`);
      return formatToolResponse(result, 'Teams', response_format);
    }
  );

  server.tool(
    'claudeops_get_team',
    'Get team details including agents',
    {
      id: z.number().int().describe('Team ID'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ id, response_format }) => {
      const result = await apiGet(`/api/teams/${id}`);
      return formatToolResponse(result, 'Team Details', response_format);
    }
  );

  server.tool(
    'claudeops_clone_team',
    'Clone an existing team with a new name',
    {
      id: z.number().int().describe('Source team ID to clone'),
      name: z.string().describe('New team name'),
    },
    async ({ id, name }) => {
      const result = await apiPost(`/api/teams/${id}/clone`, { name });
      return formatToolResponse(result, 'Team Cloned');
    }
  );

  server.tool(
    'claudeops_archive_team',
    'Archive a team (soft delete)',
    {
      id: z.number().int().describe('Team ID to archive'),
    },
    async ({ id }) => {
      const result = await apiPatch(`/api/teams/${id}/archive`, {});
      return formatToolResponse(result, 'Team Archived');
    }
  );

  // ─── TeamAgent 도구 ───

  server.tool(
    'claudeops_add_agent_to_team',
    'Add an agent persona to a team',
    {
      team_id: z.number().int().describe('Team ID'),
      persona_id: z.number().int().describe('Persona ID to add'),
      role: z.enum(['lead', 'worker', 'reviewer', 'observer']).optional().describe('Agent role (default: worker)'),
      instance_label: z.string().optional().describe('Instance label for multiple same-type agents (e.g. "executor-1")'),
      context_prompt: z.string().optional().describe('Additional context prompt for this agent in this team'),
      max_concurrent: z.number().int().optional().describe('Max concurrent executions (default: 1)'),
    },
    async ({ team_id, ...data }) => {
      const result = await apiPost(`/api/teams/${team_id}/agents`, data);
      return formatToolResponse(result, 'Agent Added to Team');
    }
  );

  server.tool(
    'claudeops_remove_agent_from_team',
    'Remove an agent from a team',
    {
      team_agent_id: z.number().int().describe('TeamAgent ID to remove'),
    },
    async ({ team_agent_id }) => {
      const result = await apiDelete(`/api/team-agents/${team_agent_id}`);
      return formatToolResponse(result, 'Agent Removed');
    }
  );

  // ─── Task-Team Assignment 도구 ───

  server.tool(
    'claudeops_assign_team_to_task',
    'Assign a team to a task with optional auto-execution',
    {
      task_id: z.number().int().describe('Task ID'),
      team_id: z.number().int().describe('Team ID to assign'),
      auto_execute: z.boolean().optional().describe('Auto-execute pipeline when assigned (default: false)'),
    },
    async ({ task_id, team_id, auto_execute }) => {
      const result = await apiPost(`/api/tasks/${task_id}/assign-team`, { team_id, auto_execute });
      return formatToolResponse(result, 'Team Assigned to Task');
    }
  );

  server.tool(
    'claudeops_unassign_team_from_task',
    'Remove a team assignment from a task',
    {
      task_id: z.number().int().describe('Task ID'),
      team_id: z.number().int().describe('Team ID to unassign'),
    },
    async ({ task_id, team_id }) => {
      const result = await apiDelete(`/api/tasks/${task_id}/assign-team`, { team_id });
      return formatToolResponse(result, 'Team Unassigned');
    }
  );

  // ─── Template & Workload 도구 ───

  server.tool(
    'claudeops_list_team_templates',
    'List available team templates (preset team compositions)',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/team-templates');
      return formatToolResponse(result, 'Team Templates', response_format);
    }
  );

  server.tool(
    'claudeops_get_workload',
    'Get workload overview for a team',
    {
      team_id: z.number().int().describe('Team ID'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ team_id, response_format }) => {
      const result = await apiGet(`/api/teams/${team_id}/workload`);
      return formatToolResponse(result, 'Team Workload', response_format);
    }
  );
}
