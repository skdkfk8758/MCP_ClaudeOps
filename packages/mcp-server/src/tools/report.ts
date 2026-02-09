import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerReportTools(server: McpServer): void {
  server.tool(
    'claudeops_generate_session_report',
    'Generate a session report with token usage, tools used, and files changed',
    {
      session_id: z.string().describe('Session ID to generate report for'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ session_id, response_format }) => {
      const result = await apiPost(`/api/reports/session/${session_id}`, {});
      return formatToolResponse(result, 'Session Report', response_format);
    }
  );

  server.tool(
    'claudeops_generate_standup',
    'Generate a daily standup report with completed/in-progress tasks and token usage',
    {
      date: z.string().optional().describe('Date for report (YYYY-MM-DD, default: today)'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ date, response_format }) => {
      const result = await apiPost('/api/reports/standup', { date });
      return formatToolResponse(result, 'Standup Report', response_format);
    }
  );
}
