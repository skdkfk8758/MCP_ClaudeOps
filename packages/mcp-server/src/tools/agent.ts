import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiPut, apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerAgentTools(server: McpServer): void {
  server.tool(
    'claudeops_spawn_agent',
    'Record agent spawn event',
    {
      session_id: z.string().describe('Session ID'),
      agent_type: z.string().describe('Agent type (executor, architect, etc.)'),
      model: z.string().describe('Model used (haiku, sonnet, opus)'),
      task_description: z.string().optional().describe('Task description'),
    },
    async ({ session_id, agent_type, model, task_description }) => {
      const result = await apiPost('/api/agents/executions', { session_id, agent_type, model, task_description });
      return formatToolResponse(result, 'Agent Spawned');
    }
  );

  server.tool(
    'claudeops_complete_agent',
    'Record agent completion with status and token usage',
    {
      agent_execution_id: z.number().describe('Agent execution ID'),
      status: z.enum(['completed', 'failed']).describe('Completion status'),
      duration_ms: z.number().optional().describe('Duration in milliseconds'),
      token_input: z.number().optional().describe('Input tokens used'),
      token_output: z.number().optional().describe('Output tokens used'),
    },
    async ({ agent_execution_id, status, duration_ms, token_input, token_output }) => {
      const result = await apiPut(`/api/agents/executions/${agent_execution_id}`, {
        status, end_time: new Date().toISOString(), duration_ms, token_input, token_output,
      });
      return formatToolResponse(result, 'Agent Completed');
    }
  );

  server.tool(
    'claudeops_get_agent_stats',
    'Get agent performance statistics by type and model',
    {
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      agent_type: z.string().optional().describe('Filter by agent type'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ days, agent_type, response_format }) => {
      const params = new URLSearchParams();
      if (days) params.set('days', String(days));
      if (agent_type) params.set('agent_type', agent_type);
      const result = await apiGet(`/api/agents/stats?${params}`);
      return formatToolResponse(result, 'Agent Statistics', response_format);
    }
  );

  server.tool(
    'claudeops_get_agent_leaderboard',
    'Rank agents by efficiency, cost, or success rate',
    {
      metric: z.enum(['speed', 'cost', 'success_rate']).describe('Ranking metric'),
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ metric, days, response_format }) => {
      const params = new URLSearchParams({ metric });
      if (days) params.set('days', String(days));
      const result = await apiGet(`/api/agents/leaderboard?${params}`);
      return formatToolResponse(result, 'Agent Leaderboard', response_format);
    }
  );
}
