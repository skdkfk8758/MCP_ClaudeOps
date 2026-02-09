export type ReportType = 'session' | 'standup';

export interface SessionReport {
  id: number;
  session_id: string;
  report_type: ReportType;
  content: string;
  tools_used: string[] | null;
  files_changed: string[] | null;
  token_summary: { input: number; output: number; cost: number } | null;
  created_at: string;
}

export interface StandupReport {
  date: string;
  completed_tasks: import('./task.js').Task[];
  in_progress_tasks: import('./task.js').Task[];
  sessions_today: number;
  tokens_today: { input: number; output: number };
  cost_today: number;
  blockers: string[];
}
