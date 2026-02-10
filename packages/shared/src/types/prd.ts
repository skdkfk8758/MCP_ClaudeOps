export type PrdStatus = 'backlog' | 'active' | 'completed' | 'archived';

export interface Prd {
  id: number;
  title: string;
  description: string | null;
  status: PrdStatus;
  vision: string | null;
  user_stories: string[] | null;
  success_criteria: string[] | null;
  constraints: string | null;
  out_of_scope: string | null;
  project_path: string | null;
  github_issue_url: string | null;
  github_issue_number: number | null;
  created_at: string;
  updated_at: string;
  // Joined from epics table - uses generic array to avoid circular import
  epics?: Array<Record<string, unknown>>;
  epic_count?: number;
}

export interface PrdCreate {
  title: string;
  description?: string;
  vision?: string;
  user_stories?: string[];
  success_criteria?: string[];
  constraints?: string;
  out_of_scope?: string;
  project_path?: string;
}

export interface PrdUpdate extends Partial<PrdCreate> {
  status?: PrdStatus;
}
