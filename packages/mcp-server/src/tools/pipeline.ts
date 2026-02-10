import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

const stepSchema = z.object({
  step: z.number().int(),
  parallel: z.boolean(),
  agents: z.array(z.object({
    type: z.string(),
    model: z.enum(['haiku', 'sonnet', 'opus']),
    prompt: z.string(),
    task_id: z.number().int().optional(),
  })),
});

export function registerPipelineTools(server: McpServer): void {
  server.tool(
    'claudeops_create_pipeline',
    'Create a new agent pipeline with sequential/parallel execution steps',
    {
      name: z.string().describe('Pipeline name'),
      description: z.string().optional().describe('Pipeline description'),
      epic_id: z.number().int().optional().describe('Link to an Epic'),
      steps: z.array(stepSchema).describe('Execution steps with agents'),
      graph_data: z.string().optional().describe('React Flow graph JSON for visual editor state'),
    },
    async (params) => {
      const result = await apiPost('/api/pipelines', params);
      return formatToolResponse(result, 'Pipeline Created');
    }
  );

  server.tool(
    'claudeops_list_pipelines',
    'List pipelines with optional filters',
    {
      epic_id: z.number().int().optional().describe('Filter by Epic ID'),
      status: z.enum(['draft', 'ready', 'running', 'completed', 'failed']).optional().describe('Filter by status'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ limit, response_format, ...filters }) => {
      const params = new URLSearchParams();
      if (filters.epic_id) params.set('epic_id', String(filters.epic_id));
      if (filters.status) params.set('status', filters.status);
      if (limit) params.set('page_size', String(limit));
      const result = await apiGet(`/api/pipelines?${params}`);
      return formatToolResponse(result, 'Pipelines', response_format);
    }
  );

  server.tool(
    'claudeops_get_pipeline',
    'Get pipeline details including steps and execution history',
    {
      pipeline_id: z.number().int().describe('Pipeline ID'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ pipeline_id, response_format }) => {
      const result = await apiGet(`/api/pipelines/${pipeline_id}`);
      return formatToolResponse(result, 'Pipeline Details', response_format);
    }
  );

  server.tool(
    'claudeops_execute_pipeline',
    'Execute a pipeline (real or simulation mode)',
    {
      pipeline_id: z.number().int().describe('Pipeline ID to execute'),
      project_path: z.string().describe('Project directory path for Claude CLI execution'),
      simulate: z.boolean().optional().describe('Run in simulation mode (no actual CLI calls)'),
    },
    async ({ pipeline_id, ...body }) => {
      const result = await apiPost(`/api/pipelines/${pipeline_id}/execute`, body);
      return formatToolResponse(result, 'Pipeline Execution Started');
    }
  );

  server.tool(
    'claudeops_cancel_pipeline',
    'Cancel a running pipeline execution',
    {
      pipeline_id: z.number().int().describe('Pipeline ID to cancel'),
    },
    async ({ pipeline_id }) => {
      const result = await apiPost(`/api/pipelines/${pipeline_id}/cancel`, {});
      return formatToolResponse(result, 'Pipeline Execution Cancelled');
    }
  );

  server.tool(
    'claudeops_get_pipeline_status',
    'Get the current execution status of a pipeline',
    {
      pipeline_id: z.number().int().describe('Pipeline ID'),
      execution_id: z.number().int().optional().describe('Specific execution ID (defaults to latest)'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ pipeline_id, execution_id, response_format }) => {
      if (execution_id) {
        const result = await apiGet(`/api/pipeline-executions/${execution_id}`);
        return formatToolResponse(result, 'Pipeline Execution Status', response_format);
      }
      const result = await apiGet(`/api/pipelines/${pipeline_id}/executions`);
      return formatToolResponse(result, 'Pipeline Executions', response_format);
    }
  );

  server.tool(
    'claudeops_get_presets',
    'Get available pipeline preset templates',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/pipeline-presets');
      return formatToolResponse(result, 'Pipeline Presets', response_format);
    }
  );
}
