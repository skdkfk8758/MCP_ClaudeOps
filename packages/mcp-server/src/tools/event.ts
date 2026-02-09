import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { apiPost } from '../client/api-client.js';
import { formatToolResponse } from '../services/response-formatter.js';

export function registerEventTools(server: McpServer): void {
  server.tool(
    'claudeops_record_event',
    'Record a generic flow event',
    {
      session_id: z.string().describe('Session ID'),
      event_type: z.string().describe('Event type'),
      payload: z.record(z.unknown()).optional().describe('Event payload'),
    },
    async ({ session_id, event_type, payload }) => {
      const result = await apiPost('/api/events', { session_id, event_type, payload: payload ?? {} });
      return formatToolResponse(result, 'Event Recorded');
    }
  );

  server.tool(
    'claudeops_record_tool_call',
    'Record a tool invocation with duration and success status',
    {
      session_id: z.string().describe('Session ID'),
      tool_name: z.string().describe('Tool name'),
      parameters: z.record(z.unknown()).optional().describe('Tool parameters'),
      duration_ms: z.number().optional().describe('Duration in ms'),
      success: z.boolean().default(true).describe('Whether the call succeeded'),
    },
    async ({ session_id, tool_name, parameters, duration_ms, success }) => {
      const result = await apiPost('/api/events/tool-calls/batch', {
        tool_calls: [{ session_id, tool_name, parameters: parameters ? JSON.stringify(parameters) : undefined, duration_ms, success }],
      });
      return formatToolResponse(result, 'Tool Call Recorded');
    }
  );

  server.tool(
    'claudeops_record_file_change',
    'Record a file modification event',
    {
      session_id: z.string().describe('Session ID'),
      file_path: z.string().describe('File path'),
      change_type: z.enum(['created', 'modified', 'deleted']).describe('Type of change'),
      lines_added: z.number().optional().describe('Lines added'),
      lines_removed: z.number().optional().describe('Lines removed'),
    },
    async ({ session_id, file_path, change_type, lines_added, lines_removed }) => {
      const result = await apiPost('/api/events/file-changes/batch', {
        file_changes: [{ session_id, file_path, change_type, lines_added, lines_removed }],
      });
      return formatToolResponse(result, 'File Change Recorded');
    }
  );

  server.tool(
    'claudeops_record_commit',
    'Record a git commit',
    {
      session_id: z.string().describe('Session ID'),
      hash: z.string().describe('Commit hash'),
      message: z.string().describe('Commit message'),
      files_changed: z.number().describe('Number of files changed'),
    },
    async ({ session_id, hash, message, files_changed }) => {
      const result = await apiPost('/api/events', {
        session_id, event_type: 'commit', payload: { hash, message, files_changed },
      });
      return formatToolResponse(result, 'Commit Recorded');
    }
  );

  server.tool(
    'claudeops_record_error',
    'Record an error event',
    {
      session_id: z.string().describe('Session ID'),
      error_type: z.string().describe('Error type/category'),
      message: z.string().describe('Error message'),
      stack_trace: z.string().optional().describe('Stack trace'),
      tool_name: z.string().optional().describe('Tool that caused the error'),
    },
    async ({ session_id, error_type, message, stack_trace, tool_name }) => {
      const result = await apiPost('/api/events/errors', { session_id, error_type, message, stack_trace, tool_name });
      return formatToolResponse(result, 'Error Recorded');
    }
  );

  server.tool(
    'claudeops_record_prompt',
    'Record a user prompt event',
    {
      session_id: z.string().describe('Session ID'),
      prompt_text: z.string().describe('Prompt text'),
      token_count: z.number().optional().describe('Token count'),
    },
    async ({ session_id, prompt_text, token_count }) => {
      const result = await apiPost('/api/events', {
        session_id, event_type: 'user_prompt',
        payload: { prompt_length: prompt_text.length, token_count },
      });
      return formatToolResponse(result, 'Prompt Recorded');
    }
  );

  server.tool(
    'claudeops_record_skill_call',
    'Record a skill invocation',
    {
      session_id: z.string().describe('Session ID'),
      skill_name: z.string().describe('Skill name'),
      trigger: z.enum(['auto', 'manual']).describe('How the skill was triggered'),
      parameters: z.record(z.unknown()).optional().describe('Skill parameters'),
    },
    async ({ session_id, skill_name, trigger, parameters }) => {
      const result = await apiPost('/api/events', {
        session_id, event_type: 'skill_call',
        payload: { skill_name, trigger, parameters },
      });
      return formatToolResponse(result, 'Skill Call Recorded');
    }
  );
}
