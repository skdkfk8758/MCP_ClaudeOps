import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiGet, apiPut, apiPost } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerConfigTools(server: McpServer): void {
  server.tool(
    'claudeops_set_pricing',
    'Set custom token pricing per model (USD per million tokens)',
    {
      model: z.string().describe('Model name (haiku, sonnet, opus)'),
      input_per_mtok: z.number().describe('Input price per million tokens'),
      output_per_mtok: z.number().describe('Output price per million tokens'),
    },
    async ({ model, input_per_mtok, output_per_mtok }) => {
      const result = await apiPut('/api/tokens/pricing', { model, input_per_mtok, output_per_mtok });
      return formatToolResponse(result, 'Pricing Updated');
    }
  );

  server.tool(
    'claudeops_get_config',
    'Get current ClaudeOps configuration including pricing and budget',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/config');
      return formatToolResponse(result, 'Configuration', response_format);
    }
  );

  server.tool(
    'claudeops_set_budget_alert',
    'Set daily and/or monthly cost alert thresholds',
    {
      daily_limit: z.number().optional().describe('Daily cost limit in USD (0 = no limit)'),
      monthly_limit: z.number().optional().describe('Monthly cost limit in USD (0 = no limit)'),
    },
    async ({ daily_limit, monthly_limit }) => {
      const result = await apiPut('/api/tokens/budget-alerts', { daily_limit, monthly_limit });
      return formatToolResponse(result, 'Budget Alert Set');
    }
  );

  server.tool(
    'claudeops_export_data',
    'Export session, event, agent, or cost data as JSON or CSV',
    {
      format: z.enum(['json', 'csv']).describe('Export format'),
      entity: z.enum(['sessions', 'events', 'agents', 'costs']).describe('Data to export'),
      days: z.number().int().min(1).max(365).default(30).optional().describe('Days of data'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ format, entity, days, response_format }) => {
      const result = await apiPost('/api/export', { format, entity, days });
      return formatToolResponse(result, 'Data Export', response_format);
    }
  );

  server.tool(
    'claudeops_server_status',
    'Get ClaudeOps backend server status including uptime, memory, and PID',
    {},
    async () => {
      const result = await apiGet('/api/server/status');
      return formatToolResponse(result, 'Server Status');
    }
  );

  server.tool(
    'claudeops_restart_server',
    'Restart the ClaudeOps backend server. The server will gracefully shutdown and respawn. API will be briefly unavailable (~2 seconds).',
    {
      confirm: z.boolean().describe('Must be true to confirm restart'),
    },
    async ({ confirm }) => {
      if (!confirm) {
        return { content: [{ type: 'text' as const, text: 'Restart cancelled. Set confirm=true to proceed.' }] };
      }
      const result = await apiPost('/api/server/restart', {});
      return formatToolResponse(result, 'Server Restart');
    }
  );
}
