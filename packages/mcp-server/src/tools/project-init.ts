import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

const memberSchema = z.object({
  name: z.string().describe('Member name'),
  role: z.enum(['lead', 'member', 'observer']).optional().describe('Member role (default: member)'),
  email: z.string().optional().describe('Member email'),
  specialties: z.array(z.string()).optional().describe('Member specialties'),
});

const taskSchema = z.object({
  title: z.string().describe('Task title'),
  description: z.string().optional().describe('Task description'),
  status: z.enum(['backlog', 'todo', 'design', 'implementation', 'review', 'done']).optional().describe('Task status'),
  priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('Task priority'),
  estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('Estimated effort'),
  labels: z.array(z.string()).optional().describe('Task labels'),
  assignee: z.string().optional().describe('Task assignee'),
});

const epicSchema = z.object({
  title: z.string().describe('Epic title'),
  description: z.string().optional().describe('Epic description'),
  status: z.enum(['backlog', 'planning', 'in_progress', 'completed']).optional().describe('Epic status'),
  tech_approach: z.string().optional().describe('Technical approach'),
  estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('Estimated effort'),
  tasks: z.array(taskSchema).optional().describe('Tasks within this epic'),
});

export function registerProjectInitTools(server: McpServer): void {
  server.tool(
    'claudeops_init_project',
    'Initialize project management data (team, PRD, epics, tasks) in one bulk call. ' +
    'Create .claudeops/project-init.json for auto-initialization during setup.',
    {
      team: z.object({
        name: z.string().describe('Team name'),
        description: z.string().optional().describe('Team description'),
        avatar_color: z.string().optional().describe('Team color hex (default: #6366f1)'),
        members: z.array(memberSchema).optional().describe('Team members to add'),
      }).optional().describe('Team to create with members'),
      prd: z.object({
        title: z.string().describe('PRD title'),
        description: z.string().optional().describe('PRD description'),
        status: z.enum(['backlog', 'active', 'completed', 'archived']).optional().describe('PRD status'),
        vision: z.string().optional().describe('Product vision'),
        user_stories: z.array(z.string()).optional().describe('User stories'),
        success_criteria: z.array(z.string()).optional().describe('Success criteria'),
        constraints: z.string().optional().describe('Constraints'),
        out_of_scope: z.string().optional().describe('Out of scope items'),
        project_path: z.string().optional().describe('Project directory path'),
      }).optional().describe('PRD to create'),
      epics: z.array(epicSchema).optional().describe('Epics with nested tasks to create'),
    },
    async (params) => {
      const result = await apiPost('/api/projects/init', params);
      return formatToolResponse(result, 'Project Initialized');
    }
  );
}
