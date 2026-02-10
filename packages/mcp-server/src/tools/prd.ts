import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerPrdTools(server: McpServer): void {
  server.tool(
    'claudeops_create_prd',
    'Create a new Product Requirements Document (PRD) for project planning',
    {
      title: z.string().describe('PRD title'),
      description: z.string().optional().describe('PRD description'),
      vision: z.string().optional().describe('Product vision statement'),
      user_stories: z.array(z.string()).optional().describe('User stories'),
      success_criteria: z.array(z.string()).optional().describe('Success criteria'),
      constraints: z.string().optional().describe('Constraints and limitations'),
      out_of_scope: z.string().optional().describe('Out of scope items'),
      project_path: z.string().optional().describe('Project directory path for task execution'),
    },
    async (params) => {
      const result = await apiPost('/api/prds', params);
      return formatToolResponse(result, 'PRD Created');
    }
  );

  server.tool(
    'claudeops_list_prds',
    'List all Product Requirements Documents with optional status filter',
    {
      status: z.enum(['backlog', 'active', 'completed', 'archived']).optional().describe('Filter by status'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ limit, response_format, ...filters }) => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (limit) params.set('page_size', String(limit));
      const result = await apiGet(`/api/prds?${params}`);
      return formatToolResponse(result, 'PRDs', response_format);
    }
  );

  server.tool(
    'claudeops_update_prd',
    'Update an existing PRD',
    {
      prd_id: z.number().int().describe('PRD ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['backlog', 'active', 'completed', 'archived']).optional().describe('New status'),
      vision: z.string().optional().describe('New vision'),
      user_stories: z.array(z.string()).optional().describe('Replace user stories'),
      success_criteria: z.array(z.string()).optional().describe('Replace success criteria'),
      constraints: z.string().optional().describe('New constraints'),
      out_of_scope: z.string().optional().describe('New out of scope'),
      project_path: z.string().optional().describe('Project directory path for task execution'),
    },
    async ({ prd_id, ...updates }) => {
      const result = await apiRequest(`/api/prds/${prd_id}`, { method: 'PATCH', body: updates });
      return formatToolResponse(result, 'PRD Updated');
    }
  );
}
