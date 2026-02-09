export type WorktreeStatus = 'active' | 'merged' | 'removed';

export interface Worktree {
  id: number;
  epic_id: number | null;
  name: string;
  path: string;
  branch: string;
  status: WorktreeStatus;
  created_at: string;
  merged_at: string | null;
  epic_title?: string;
}

export interface WorktreeCreate {
  epic_id?: number;
  name: string;
  project_path: string;
}

export interface WorktreeList {
  status?: WorktreeStatus;
  epic_id?: number;
}
