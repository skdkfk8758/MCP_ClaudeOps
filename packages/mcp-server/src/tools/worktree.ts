import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiPut } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerWorktreeTools(server: McpServer): void {
  server.tool(
    'claudeops_create_worktree',
    'Create a git worktree for isolated development. Optionally linked to an epic.',
    {
      name: z.string().describe('Name of the worktree'),
      project_path: z.string().describe('Path to the git project'),
      epic_id: z.number().int().optional().describe('Optional epic ID to link'),
    },
    async ({ name, project_path, epic_id }) => {
      const result = await apiPost('/api/worktrees', {
        name,
        project_path,
        epic_id,
      });
      return formatToolResponse(result, 'Create Worktree');
    }
  );

  server.tool(
    'claudeops_list_worktrees',
    'List all git worktrees with optional filters',
    {
      status: z.string().optional().describe('Filter by status (active, merged, abandoned)'),
      epic_id: z.number().int().optional().describe('Filter by epic ID'),
    },
    async ({ status, epic_id }) => {
      const params = new URLSearchParams();
      if (status) params.append('status', status);
      if (epic_id !== undefined) params.append('epic_id', epic_id.toString());

      const query = params.toString();
      const result = await apiGet(`/api/worktrees${query ? `?${query}` : ''}`);
      return formatToolResponse(result, 'List Worktrees');
    }
  );

  server.tool(
    'claudeops_merge_worktree',
    'Merge a worktree branch back into main and remove the worktree',
    {
      id: z.number().int().describe('ID of the worktree to merge'),
    },
    async ({ id }) => {
      const result = await apiPost(`/api/worktrees/${id}/merge`, {});
      return formatToolResponse(result, 'Merge Worktree');
    }
  );

  server.tool(
    'claudeops_set_project_context',
    'Set or update a project context document (brief, tech, architecture, rules)',
    {
      project_path: z.string().describe('Path to the project'),
      context_type: z.enum(['brief', 'tech', 'architecture', 'rules']).describe('Type of context document'),
      title: z.string().describe('Title of the context document'),
      content: z.string().describe('Content of the context document'),
    },
    async ({ project_path, context_type, title, content }) => {
      const result = await apiPut('/api/contexts', {
        project_path,
        context_type,
        title,
        content,
      });
      return formatToolResponse(result, 'Set Project Context');
    }
  );

  server.tool(
    'claudeops_get_project_context',
    'Get project context documents',
    {
      project_path: z.string().describe('Path to the project'),
      context_type: z.string().optional().describe('Filter by context type (brief, tech, architecture, rules)'),
    },
    async ({ project_path, context_type }) => {
      const params = new URLSearchParams();
      params.append('project_path', project_path);
      if (context_type) params.append('context_type', context_type);

      const query = params.toString();
      const result = await apiGet(`/api/contexts?${query}`);
      return formatToolResponse(result, 'Get Project Context');
    }
  );
}
