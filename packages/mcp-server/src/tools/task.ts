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
      status: z.enum(['backlog', 'todo', 'design', 'implementation', 'review', 'verification', 'done']).optional().describe('Initial status (default: backlog)'),
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
      status: z.enum(['backlog', 'todo', 'design', 'implementation', 'review', 'verification', 'done']).optional().describe('New status'),
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
      status: z.enum(['backlog', 'todo', 'design', 'implementation', 'review', 'verification', 'done']).optional().describe('Filter by status'),
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
      status: z.enum(['backlog', 'todo', 'design', 'implementation', 'review', 'verification', 'done']).describe('Target column'),
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

  server.tool(
    'claudeops_set_task_branch',
    'Set or remove a branch name for a Task',
    {
      task_id: z.number().int().describe('Task ID'),
      branch_name: z.string().optional().describe('Branch name (omit to remove)'),
    },
    async ({ task_id, branch_name }) => {
      if (branch_name) {
        const result = await apiPost(`/api/tasks/${task_id}/branch`, { branch_name });
        return formatToolResponse(result, 'Task Branch Set');
      } else {
        const result = await apiRequest(`/api/tasks/${task_id}/branch`, { method: 'DELETE' });
        return formatToolResponse(result, 'Task Branch Removed');
      }
    }
  );

  server.tool(
    'claudeops_execute_task',
    'Execute a task using Claude CLI. Assembles context from Task/Epic/PRD/Project and runs claude -p with the prompt. Use dry_run=true to preview the prompt without executing.',
    {
      task_id: z.number().int().describe('Task ID to execute'),
      project_path: z.string().describe('Project directory path where claude will execute'),
      model: z.string().optional().describe('Claude model to use (e.g. sonnet, opus)'),
      additional_context: z.string().optional().describe('Additional instructions to append to the prompt'),
      dry_run: z.boolean().optional().describe('If true, returns the assembled prompt without executing'),
    },
    async ({ task_id, ...params }) => {
      const result = await apiPost(`/api/tasks/${task_id}/execute`, params);
      return formatToolResponse(result, 'Task Execution');
    }
  );

  // --- 설계 워크플로우 도구 ---

  server.tool(
    'claudeops_design_task',
    'Run design phase for a task. Claude will analyze the task in plan mode and produce an implementation plan with steps, risks, and success criteria. Requires work_prompt to be set on the task first (or pass it here).',
    {
      task_id: z.number().int().describe('Task ID to design'),
      project_path: z.string().describe('Project directory path for Claude to analyze'),
      model: z.string().optional().describe('Claude model to use (default: sonnet)'),
      work_prompt: z.string().optional().describe('Work prompt describing what to implement. Will be saved to the task.'),
    },
    async ({ task_id, ...params }) => {
      const result = await apiPost(`/api/tasks/${task_id}/design`, params);
      return formatToolResponse(result, 'Design Started');
    }
  );

  server.tool(
    'claudeops_approve_design',
    'Approve the design result and auto-create a pipeline from the design steps. The task must have a completed design (design_status=completed).',
    {
      task_id: z.number().int().describe('Task ID whose design to approve'),
    },
    async ({ task_id }) => {
      const result = await apiPost(`/api/tasks/${task_id}/design/approve`, {});
      return formatToolResponse(result, 'Design Approved');
    }
  );

  server.tool(
    'claudeops_implement_task',
    'Execute the implementation phase by running the pipeline created from the approved design. The task must have an associated pipeline (after design approval).',
    {
      task_id: z.number().int().describe('Task ID to implement'),
      project_path: z.string().describe('Project directory path for execution'),
      model: z.string().optional().describe('Claude model to use'),
    },
    async ({ task_id, ...params }) => {
      const result = await apiPost(`/api/tasks/${task_id}/implement`, params);
      return formatToolResponse(result, 'Implementation Started');
    }
  );

  // --- 검증 워크플로우 도구 ---

  server.tool(
    'claudeops_verify_task',
    'Run verification phase for a task. Executes automated checks including linting, type checking, tests, and optional coverage threshold validation.',
    {
      task_id: z.number().int().describe('Task ID to verify'),
      project_path: z.string().describe('Project directory path for verification'),
      checks: z.array(z.string()).optional().describe('Specific checks to run (e.g. ["lint", "typecheck", "test"])'),
      coverage_threshold: z.number().min(0).max(100).optional().describe('Minimum code coverage percentage required'),
    },
    async ({ task_id, ...params }) => {
      const result = await apiPost(`/api/tasks/${task_id}/verify`, params);
      return formatToolResponse(result, 'Verification Started');
    }
  );

  server.tool(
    'claudeops_get_verification',
    'Get verification results for a task including status, check results, and coverage data',
    {
      task_id: z.number().int().describe('Task ID to get verification results for'),
    },
    async ({ task_id }) => {
      const result = await apiGet(`/api/tasks/${task_id}/verification`);
      return formatToolResponse(result, 'Verification Results');
    }
  );

  // --- 커밋 관리 도구 ---

  server.tool(
    'claudeops_scan_task_commits',
    'Scan git repository for commits related to a task. Uses branch name, task ID in commit messages, and linked session IDs to identify relevant commits.',
    {
      task_id: z.number().int().describe('Task ID to scan commits for'),
      project_path: z.string().describe('Project directory path to scan'),
    },
    async ({ task_id, project_path }) => {
      const result = await apiPost(`/api/tasks/${task_id}/commits/scan`, { project_path });
      return formatToolResponse(result, 'Commits Scanned');
    }
  );

  server.tool(
    'claudeops_get_task_commits',
    'Get list of commits associated with a task',
    {
      task_id: z.number().int().describe('Task ID to get commits for'),
    },
    async ({ task_id }) => {
      const result = await apiGet(`/api/tasks/${task_id}/commits`);
      return formatToolResponse(result, 'Task Commits');
    }
  );

  // --- 브랜치 자동화 도구 ---

  server.tool(
    'claudeops_auto_branch',
    'Automatically create a git branch for a task using a standardized naming convention (e.g. feature/task-123-title-slug)',
    {
      task_id: z.number().int().describe('Task ID to create branch for'),
    },
    async ({ task_id }) => {
      const result = await apiPost(`/api/tasks/${task_id}/branch/auto`, {});
      return formatToolResponse(result, 'Branch Created');
    }
  );

  // --- 범위 분리 도구 ---

  server.tool(
    'claudeops_get_scope_proposal',
    'Get scope analysis proposal for a task design result. Returns whether any design steps are out-of-scope or partially in scope relative to the parent epic.',
    {
      task_id: z.number().int().describe('Task ID to check scope proposal for'),
    },
    async ({ task_id }) => {
      const result = await apiGet(`/api/tasks/${task_id}/design/scope-proposal`);
      return formatToolResponse(result, 'Scope Proposal');
    }
  );

  server.tool(
    'claudeops_scope_split',
    'Execute scope split on a task design. Creates a new epic and moves out-of-scope design steps into new tasks under that epic. The task must have a scope_analysis in its design result.',
    {
      task_id: z.number().int().describe('Task ID to split scope for'),
      epic_title: z.string().optional().describe('Custom title for the new epic (default: auto-generated)'),
      epic_description: z.string().optional().describe('Custom description for the new epic'),
      include_partial: z.boolean().optional().describe('Whether to also move partial-scope steps (default: false)'),
    },
    async ({ task_id, ...params }) => {
      const result = await apiPost(`/api/tasks/${task_id}/design/scope-split`, params);
      return formatToolResponse(result, 'Scope Split Completed');
    }
  );
}
