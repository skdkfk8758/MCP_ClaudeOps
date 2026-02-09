export interface ToolCall {
  id: number;
  session_id: string;
  agent_execution_id: number | null;
  tool_name: string;
  parameters: string | null;
  duration_ms: number | null;
  success: boolean;
  timestamp: string;
}

export interface ToolStats {
  tool_name: string;
  call_count: number;
  avg_duration_ms: number;
  success_rate: number;
  failure_count: number;
}
