export type EpicStatus = 'backlog' | 'planning' | 'in_progress' | 'completed';
export type EpicEffort = 'S' | 'M' | 'L' | 'XL';

export interface Epic {
  id: number;
  prd_id: number | null;
  title: string;
  description: string | null;
  status: EpicStatus;
  progress: number;
  architecture_notes: string | null;
  tech_approach: string | null;
  estimated_effort: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  branch_name: string | null;
  created_at: string;
  updated_at: string;
  tasks?: import('./task.js').Task[];
  task_count?: number;
  completed_count?: number;
}

export interface EpicCreate {
  prd_id?: number;
  title: string;
  description?: string;
  architecture_notes?: string;
  tech_approach?: string;
  estimated_effort?: EpicEffort;
}

export interface EpicUpdate extends Partial<EpicCreate> {
  status?: EpicStatus;
  progress?: number;
}

export interface EpicSession {
  epic_id: number;
  session_id: string;
  task_id?: number;
  linked_at: string;
}

export interface EpicSessionStats {
  epic_id: number;
  total_sessions: number;
  total_token_input: number;
  total_token_output: number;
  total_cost_usd: number;
  sessions: EpicSession[];
}
