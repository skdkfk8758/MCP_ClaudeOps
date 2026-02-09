import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiPut, apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerSessionTools(server: McpServer): void {
  server.tool(
    'claudeops_start_session',
    'Start a new tracking session for Claude Code operations',
    {
      session_id: z.string().describe('Unique session identifier'),
      project_path: z.string().optional().describe('Working directory path'),
    },
    async ({ session_id, project_path }) => {
      const result = await apiPost('/api/sessions', { id: session_id, project_path });
      return formatToolResponse(result, 'Session Started');
    }
  );

  server.tool(
    'claudeops_end_session',
    'End an active session with summary and token usage',
    {
      session_id: z.string().describe('Session ID to end'),
      summary: z.string().optional().describe('Session summary'),
      token_input: z.number().optional().describe('Total input tokens'),
      token_output: z.number().optional().describe('Total output tokens'),
    },
    async ({ session_id, summary, token_input, token_output }) => {
      const result = await apiPut(`/api/sessions/${session_id}`, {
        end_time: new Date().toISOString(),
        status: 'completed',
        summary, token_input, token_output,
      });
      return formatToolResponse(result, 'Session Ended');
    }
  );

  server.tool(
    'claudeops_list_sessions',
    'List recent sessions with stats, filtering, and pagination',
    {
      limit: z.number().int().min(1).max(100).default(20).optional().describe('Max results'),
      status: z.string().optional().describe('Filter by status: active, completed, interrupted'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ limit, status, response_format }) => {
      const params = new URLSearchParams();
      if (limit) params.set('page_size', String(limit));
      if (status) params.set('status', status);
      const result = await apiGet(`/api/sessions?${params}`);
      return formatToolResponse(result, 'Sessions', response_format);
    }
  );
}
