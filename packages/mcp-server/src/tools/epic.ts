import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerEpicTools(server: McpServer): void {
  server.tool(
    'claudeops_create_epic',
    'Create a new Epic linked to a PRD for feature tracking',
    {
      title: z.string().describe('Epic title'),
      prd_id: z.number().int().optional().describe('Parent PRD ID'),
      description: z.string().optional().describe('Epic description'),
      architecture_notes: z.string().optional().describe('Architecture notes'),
      tech_approach: z.string().optional().describe('Technical approach'),
      estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('Estimated effort'),
    },
    async (params) => {
      const result = await apiPost('/api/epics', params);
      return formatToolResponse(result, 'Epic Created');
    }
  );

  server.tool(
    'claudeops_list_epics',
    'List Epics with optional PRD and status filters',
    {
      prd_id: z.number().int().optional().describe('Filter by PRD ID'),
      status: z.enum(['backlog', 'planning', 'in_progress', 'completed']).optional().describe('Filter by status'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ limit, response_format, ...filters }) => {
      const params = new URLSearchParams();
      if (filters.prd_id) params.set('prd_id', String(filters.prd_id));
      if (filters.status) params.set('status', filters.status);
      if (limit) params.set('page_size', String(limit));
      const result = await apiGet(`/api/epics?${params}`);
      return formatToolResponse(result, 'Epics', response_format);
    }
  );

  server.tool(
    'claudeops_update_epic',
    'Update an existing Epic',
    {
      epic_id: z.number().int().describe('Epic ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['backlog', 'planning', 'in_progress', 'completed']).optional().describe('New status'),
      prd_id: z.number().int().optional().describe('New parent PRD ID'),
      architecture_notes: z.string().optional().describe('New architecture notes'),
      tech_approach: z.string().optional().describe('New tech approach'),
      estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('New effort estimate'),
    },
    async ({ epic_id, ...updates }) => {
      const result = await apiRequest(`/api/epics/${epic_id}`, { method: 'PATCH', body: updates });
      return formatToolResponse(result, 'Epic Updated');
    }
  );
}
