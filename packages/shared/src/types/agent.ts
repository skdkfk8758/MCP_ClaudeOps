export interface AgentExecution {
  id: number;
  session_id: string;
  agent_type: string;
  model: string;
  task_description: string | null;
  start_time: string;
  end_time: string | null;
  status: 'running' | 'completed' | 'failed';
  token_input: number;
  token_output: number;
  cost_usd: number;
  duration_ms: number | null;
}

export interface AgentStats {
  agent_type: string;
  model: string;
  total_calls: number;
  avg_duration_ms: number;
  success_rate: number;
  total_tokens: number;
  total_cost_usd: number;
}

export interface AgentLeaderboardEntry {
  rank: number;
  agent_type: string;
  model: string;
  metric_value: number;
  metric_name: string;
}
