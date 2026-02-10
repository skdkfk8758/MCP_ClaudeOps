import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerGitHubTools(server: McpServer): void {
  server.tool(
    'claudeops_sync_epic_to_github',
    'Sync an Epic and its Tasks to GitHub Issues. Creates new issues or updates existing ones.',
    {
      epic_id: z.number().int().describe('ID of the epic to sync'),
    },
    async ({ epic_id }) => {
      const result = await apiPost(`/api/github/sync/epic/${epic_id}`, {});
      return formatToolResponse(result, 'GitHub Epic Sync');
    }
  );

  server.tool(
    'claudeops_sync_task_to_github',
    'Sync a single Task to a GitHub Issue. Creates new issue or updates existing one.',
    {
      task_id: z.number().int().describe('ID of the task to sync'),
    },
    async ({ task_id }) => {
      const result = await apiPost(`/api/github/sync/task/${task_id}`, {});
      return formatToolResponse(result, 'GitHub Task Sync');
    }
  );

  server.tool(
    'claudeops_post_report_to_github',
    'Post a session report as a comment on the linked GitHub Issue.',
    {
      report_id: z.number().int().describe('ID of the report to post'),
    },
    async ({ report_id }) => {
      const result = await apiPost(`/api/github/sync/report/${report_id}`, {});
      return formatToolResponse(result, 'GitHub Report Post');
    }
  );

  server.tool(
    'claudeops_set_prd_github',
    'Set GitHub repository configuration for a specific PRD. This overrides the global GitHub config for all Epics/Tasks under this PRD.',
    {
      prd_id: z.number().int().describe('PRD ID to configure'),
      repo_owner: z.string().describe('GitHub repository owner'),
      repo_name: z.string().describe('GitHub repository name'),
      default_branch: z.string().optional().describe('Default branch name (default: main)'),
      enabled: z.boolean().optional().describe('Enable/disable (default: true)'),
      auto_sync: z.boolean().optional().describe('Auto-sync on changes (default: false)'),
    },
    async ({ prd_id, ...config }) => {
      const result = await apiRequest(`/api/prds/${prd_id}/github`, {
        method: 'PUT',
        body: config,
      });
      return formatToolResponse(result, 'PRD GitHub Config Set');
    }
  );

  server.tool(
    'claudeops_get_prd_github',
    'Get the GitHub repository configuration for a specific PRD.',
    {
      prd_id: z.number().int().describe('PRD ID'),
    },
    async ({ prd_id }) => {
      const result = await apiGet(`/api/prds/${prd_id}/github`);
      return formatToolResponse(result, 'PRD GitHub Config');
    }
  );

  server.tool(
    'claudeops_remove_prd_github',
    'Remove the GitHub repository configuration for a specific PRD, falling back to global config.',
    {
      prd_id: z.number().int().describe('PRD ID'),
    },
    async ({ prd_id }) => {
      const result = await apiRequest(`/api/prds/${prd_id}/github`, { method: 'DELETE' });
      return formatToolResponse(result, 'PRD GitHub Config Removed');
    }
  );
}
