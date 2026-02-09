import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost } from '../client/api-client.js';
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
}
