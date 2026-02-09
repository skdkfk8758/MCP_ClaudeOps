import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerTeamTools(server: McpServer): void {
  server.tool(
    'claudeops_create_team',
    'Create a new team for organizing members and tracking workload',
    {
      name: z.string().describe('Team name'),
      description: z.string().optional().describe('Team description'),
      avatar_color: z.string().optional().describe('Team color hex (default: #6366f1)'),
    },
    async (params) => {
      const result = await apiPost('/api/teams', params);
      return formatToolResponse(result, 'Team Created');
    }
  );

  server.tool(
    'claudeops_list_teams',
    'List all teams with member counts',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/teams');
      return formatToolResponse(result, 'Teams', response_format);
    }
  );

  server.tool(
    'claudeops_add_team_member',
    'Add a new member to a team',
    {
      team_id: z.number().int().describe('Team ID to add member to'),
      name: z.string().describe('Member name'),
      role: z.enum(['lead', 'member', 'observer']).optional().describe('Member role (default: member)'),
      email: z.string().optional().describe('Member email'),
      specialties: z.array(z.string()).optional().describe('Member specialties (e.g. ["frontend", "backend"])'),
    },
    async ({ team_id, ...memberData }) => {
      const result = await apiPost(`/api/teams/${team_id}/members`, memberData);
      return formatToolResponse(result, 'Member Added');
    }
  );

  server.tool(
    'claudeops_list_members',
    'List team members with optional team filter',
    {
      team_id: z.number().int().optional().describe('Filter by team ID'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ team_id, response_format }) => {
      const params = new URLSearchParams();
      if (team_id) params.set('team_id', String(team_id));
      const result = await apiGet(`/api/members?${params}`);
      return formatToolResponse(result, 'Members', response_format);
    }
  );

  server.tool(
    'claudeops_assign_task',
    'Assign one or more team members to a task',
    {
      task_id: z.number().int().describe('Task ID to assign members to'),
      member_ids: z.array(z.number().int()).describe('Member IDs to assign'),
    },
    async ({ task_id, member_ids }) => {
      const result = await apiPost(`/api/tasks/${task_id}/assign`, { member_ids });
      return formatToolResponse(result, 'Task Assigned');
    }
  );

  server.tool(
    'claudeops_get_workload',
    'Get workload overview for a team or specific member',
    {
      team_id: z.number().int().optional().describe('Team ID for team workload'),
      member_id: z.number().int().optional().describe('Member ID for individual workload'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ team_id, member_id, response_format }) => {
      if (member_id) {
        const result = await apiGet(`/api/members/${member_id}/workload`);
        return formatToolResponse(result, 'Member Workload', response_format);
      }
      if (team_id) {
        const result = await apiGet(`/api/teams/${team_id}/workload`);
        return formatToolResponse(result, 'Team Workload', response_format);
      }
      return { content: [{ type: 'text' as const, text: 'Error: Provide either team_id or member_id' }] };
    }
  );
}
