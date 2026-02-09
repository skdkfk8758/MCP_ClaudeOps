export interface FileChange {
  id: number;
  session_id: string;
  file_path: string;
  change_type: 'created' | 'modified' | 'deleted';
  lines_added: number;
  lines_removed: number;
  timestamp: string;
}

export interface ErrorRecord {
  id: number;
  session_id: string;
  error_type: string;
  message: string;
  stack_trace: string | null;
  tool_name: string | null;
  resolved: boolean;
  timestamp: string;
}

export interface SkillInvocation {
  id: number;
  session_id: string;
  skill_name: string;
  trigger: 'auto' | 'manual';
  start_time: string;
  end_time: string | null;
  status: 'running' | 'completed' | 'failed';
}

export interface UserPrompt {
  id: number;
  session_id: string;
  prompt_length: number;
  token_count: number | null;
  timestamp: string;
}

export interface DailyStats {
  id: number;
  date: string;
  session_count: number;
  event_count: number;
  agent_calls: number;
  tool_calls: number;
  token_input: number;
  token_output: number;
  cost_usd: number;
  errors: number;
}

export interface AgentUsageStats {
  id: number;
  agent_type: string;
  model: string;
  date: string;
  total_calls: number;
  avg_duration_ms: number;
  success_count: number;
  failure_count: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface ToolUsageStats {
  id: number;
  tool_name: string;
  date: string;
  call_count: number;
  avg_duration_ms: number;
  success_count: number;
  failure_count: number;
}

export interface ConfigEntry {
  key: string;
  value: string;
  updated_at: string;
}
