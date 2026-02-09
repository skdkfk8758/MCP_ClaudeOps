export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskEffort = 'S' | 'M' | 'L' | 'XL';

export interface Task {
  id: number;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  assignee: string | null;
  due_date: string | null;
  estimated_effort: string | null;
  epic_id: number | null;
  position: number;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
  labels?: string[];
  blocks?: number[];
  blocked_by?: number[];
  session_ids?: string[];
  epic_title?: string;
  github_issue_url?: string | null;
  github_issue_number?: number | null;
}

export interface TaskCreate {
  title: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  due_date?: string;
  estimated_effort?: TaskEffort;
  epic_id?: number;
  labels?: string[];
}

export interface TaskUpdate {
  title?: string;
  description?: string;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignee?: string;
  due_date?: string | null;
  estimated_effort?: TaskEffort | null;
  epic_id?: number | null;
  labels?: string[];
}

export interface TaskMove {
  status: TaskStatus;
  position: number;
}

export interface TaskBoard {
  backlog: Task[];
  todo: Task[];
  in_progress: Task[];
  review: Task[];
  done: Task[];
}

export interface TaskHistoryEntry {
  id: number;
  task_id: number;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_at: string;
}

export interface TaskStats {
  total: number;
  by_status: Record<TaskStatus, number>;
  by_priority: Record<TaskPriority, number>;
  completion_rate: number;
  avg_time_to_complete_hours: number | null;
  workload_by_assignee: Record<string, number>;
}
