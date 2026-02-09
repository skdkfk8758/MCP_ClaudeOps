export type TrendMetric = 'tokens' | 'sessions' | 'agents' | 'costs';

export interface DashboardOverview {
  active_sessions: number;
  total_sessions_today: number;
  total_tokens_today: number;
  total_cost_today: number;
  total_agents_today: number;
  total_tool_calls_today: number;
  total_errors_today: number;
}

export interface TrendData {
  date: string;
  value: number;
  metric: TrendMetric;
}

export interface OptimizationHint {
  type: 'model_downgrade' | 'redundant_tools' | 'agent_efficiency' | 'session_duration';
  severity: 'info' | 'warning' | 'critical';
  message: string;
  estimated_savings_usd?: number;
  details: Record<string, unknown>;
}
