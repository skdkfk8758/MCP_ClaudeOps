import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost, apiGet, apiRequest } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerTaskTools(server: McpServer): void {
  server.tool(
    'claudeops_create_task',
    'Create a new task for tracking work items on the kanban board',
    {
      title: z.string().describe('Task title'),
      description: z.string().optional().describe('Task description'),
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional().describe('Initial status (default: backlog)'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('Priority level (default: P2)'),
      assignee: z.string().optional().describe('Assignee name'),
      due_date: z.string().optional().describe('Due date (ISO format)'),
      estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('Estimated effort'),
      labels: z.array(z.string()).optional().describe('Labels/tags'),
      epic_id: z.number().int().optional().describe('Parent Epic ID'),
    },
    async (params) => {
      const result = await apiPost('/api/tasks', params);
      return formatToolResponse(result, 'Task Created');
    }
  );

  server.tool(
    'claudeops_update_task',
    'Update an existing task',
    {
      task_id: z.number().int().describe('Task ID to update'),
      title: z.string().optional().describe('New title'),
      description: z.string().optional().describe('New description'),
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional().describe('New status'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('New priority'),
      assignee: z.string().optional().describe('New assignee'),
      due_date: z.string().optional().describe('New due date'),
      estimated_effort: z.enum(['S', 'M', 'L', 'XL']).optional().describe('New effort estimate'),
      labels: z.array(z.string()).optional().describe('Replace labels'),
    },
    async ({ task_id, ...updates }) => {
      const result = await apiRequest(`/api/tasks/${task_id}`, { method: 'PATCH', body: updates });
      return formatToolResponse(result, 'Task Updated');
    }
  );

  server.tool(
    'claudeops_list_tasks',
    'List tasks with optional filters',
    {
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).optional().describe('Filter by status'),
      priority: z.enum(['P0', 'P1', 'P2', 'P3']).optional().describe('Filter by priority'),
      assignee: z.string().optional().describe('Filter by assignee'),
      label: z.string().optional().describe('Filter by label'),
      limit: z.number().int().min(1).max(100).optional().describe('Max results'),
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ limit, response_format, ...filters }) => {
      const params = new URLSearchParams();
      if (filters.status) params.set('status', filters.status);
      if (filters.priority) params.set('priority', filters.priority);
      if (filters.assignee) params.set('assignee', filters.assignee);
      if (filters.label) params.set('label', filters.label);
      if (limit) params.set('page_size', String(limit));
      const result = await apiGet(`/api/tasks?${params}`);
      return formatToolResponse(result, 'Tasks', response_format);
    }
  );

  server.tool(
    'claudeops_move_task',
    'Move a task to a different kanban column and/or position',
    {
      task_id: z.number().int().describe('Task ID to move'),
      status: z.enum(['backlog', 'todo', 'in_progress', 'review', 'done']).describe('Target column'),
      position: z.number().int().min(0).describe('Position in column (0-based)'),
    },
    async ({ task_id, status, position }) => {
      const result = await apiPost(`/api/tasks/${task_id}/move`, { status, position });
      return formatToolResponse(result, 'Task Moved');
    }
  );

  server.tool(
    'claudeops_get_task_board',
    'Get the full kanban board with all columns and tasks',
    {
      response_format: z.enum(['markdown', 'json']).default('markdown').optional(),
    },
    async ({ response_format }) => {
      const result = await apiGet('/api/tasks/board');
      return formatToolResponse(result, 'Task Board', response_format);
    }
  );

  server.tool(
    'claudeops_link_session_to_task',
    'Link a Claude Code session to a task for traceability',
    {
      task_id: z.number().int().describe('Task ID'),
      session_id: z.string().describe('Session ID to link'),
    },
    async ({ task_id, session_id }) => {
      const result = await apiPost(`/api/tasks/${task_id}/link-session`, { session_id });
      return formatToolResponse(result, 'Session Linked');
    }
  );
}
