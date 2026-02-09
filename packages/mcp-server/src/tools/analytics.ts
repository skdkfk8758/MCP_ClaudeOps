import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerAnalyticsTools(server: McpServer): void {
  server.tool(
    'claudeops_get_dashboard',
    'Get dashboard overview with KPIs: active sessions, tokens, costs, agents, errors',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/analytics/overview');
      return formatToolResponse(result, 'Dashboard Overview', response_format);
    }
  );

  server.tool(
    'claudeops_get_token_summary',
    'Get token usage summary by session or time period',
    {
      session_id: z.string().optional().describe('Specific session ID'),
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ session_id, days, response_format }) => {
      const params = new URLSearchParams();
      if (session_id) params.set('session_id', session_id);
      if (days) params.set('days', String(days));
      const result = await apiGet(`/api/tokens/usage?${params}`);
      return formatToolResponse(result, 'Token Summary', response_format);
    }
  );

  server.tool(
    'claudeops_estimate_cost',
    'Calculate estimated costs for a session or time period',
    {
      session_id: z.string().optional().describe('Specific session ID'),
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ session_id, days, response_format }) => {
      const params = new URLSearchParams();
      if (session_id) params.set('session_id', session_id);
      if (days) params.set('days', String(days));
      const result = await apiGet(`/api/tokens/cost?${params}`);
      return formatToolResponse(result, 'Cost Estimate', response_format);
    }
  );

  server.tool(
    'claudeops_get_cost_by_model',
    'Get cost breakdown by model tier (haiku, sonnet, opus)',
    {
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ days, response_format }) => {
      const params = new URLSearchParams();
      if (days) params.set('days', String(days));
      const result = await apiGet(`/api/tokens/cost-by-model?${params}`);
      return formatToolResponse(result, 'Cost by Model', response_format);
    }
  );

  server.tool(
    'claudeops_get_trends',
    'Get trend data over time for tokens, sessions, agents, or costs',
    {
      metric: z.enum(['tokens', 'sessions', 'agents', 'costs']).describe('Metric to trend'),
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days of history'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ metric, days, response_format }) => {
      const params = new URLSearchParams({ metric });
      if (days) params.set('days', String(days));
      const result = await apiGet(`/api/analytics/trends?${params}`);
      return formatToolResponse(result, `Trends: ${metric}`, response_format);
    }
  );

  server.tool(
    'claudeops_get_tool_stats',
    'Get tool usage frequency, success rates, and average duration',
    {
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days to analyze'),
      top_n: z.number().int().min(1).max(100).default(20).optional().describe('Number of top tools'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ days, top_n, response_format }) => {
      const params = new URLSearchParams();
      if (days) params.set('days', String(days));
      if (top_n) params.set('top_n', String(top_n));
      const result = await apiGet(`/api/analytics/tool-stats?${params}`);
      return formatToolResponse(result, 'Tool Statistics', response_format);
    }
  );

  server.tool(
    'claudeops_get_optimization_hints',
    'Get cost optimization suggestions based on usage patterns',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/analytics/optimization');
      return formatToolResponse(result, 'Optimization Hints', response_format);
    }
  );
}
