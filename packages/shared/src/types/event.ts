export type FlowEventType =
  | 'session_start'
  | 'session_end'
  | 'tool_call_start'
  | 'tool_call_end'
  | 'subagent_start'
  | 'subagent_stop'
  | 'user_prompt'
  | 'stop'
  | 'error'
  | 'file_change'
  | 'commit'
  | 'skill_call';

export interface FlowEvent {
  id?: number;
  session_id: string;
  event_type: FlowEventType;
  timestamp?: string;
  payload: Record<string, unknown>;
}

export interface SessionStartPayload {
  cwd: string;
  start_time: string;
}

export interface SessionEndPayload {
  end_time: string;
  token_input?: number;
  token_output?: number;
  summary?: string;
}

export interface ToolCallPayload {
  tool_name: string;
  parameters?: Record<string, unknown>;
}

export interface ToolResultPayload {
  tool_name: string;
  duration_ms?: number;
  success: boolean;
  file_changes?: Array<{ file_path: string; change_type: string }>;
}

export interface UserPromptPayload {
  prompt_length: number;
  token_count?: number;
}

export interface SubagentStartPayload {
  agent_type: string;
  model: string;
  task_description?: string;
}

export interface SubagentStopPayload {
  agent_type: string;
  status: 'completed' | 'failed';
  duration_ms?: number;
  token_input?: number;
  token_output?: number;
}

export interface StopPayload {
  reason: string;
}

export type EventPayload =
  | SessionStartPayload
  | SessionEndPayload
  | ToolCallPayload
  | ToolResultPayload
  | UserPromptPayload
  | SubagentStartPayload
  | SubagentStopPayload
  | StopPayload;
