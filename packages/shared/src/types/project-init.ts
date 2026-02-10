// Project initialization types for bulk creation via .claudeops/project-init.json

export interface ProjectInitMember {
  name: string;
  role?: 'lead' | 'member' | 'observer';
  email?: string;
  specialties?: string[];
}

export interface ProjectInitTask {
  title: string;
  description?: string;
  status?: 'backlog' | 'todo' | 'design' | 'implementation' | 'review' | 'done';
  priority?: 'P0' | 'P1' | 'P2' | 'P3';
  estimated_effort?: 'S' | 'M' | 'L' | 'XL';
  labels?: string[];
  assignee?: string;
}

export interface ProjectInitEpic {
  title: string;
  description?: string;
  status?: 'backlog' | 'planning' | 'in_progress' | 'completed';
  tech_approach?: string;
  estimated_effort?: 'S' | 'M' | 'L' | 'XL';
  tasks?: ProjectInitTask[];
}

export interface ProjectInitConfig {
  team?: {
    name: string;
    description?: string;
    avatar_color?: string;
    members?: ProjectInitMember[];
  };
  prd?: {
    title: string;
    description?: string;
    status?: 'backlog' | 'active' | 'completed' | 'archived';
    vision?: string;
    user_stories?: string[];
    success_criteria?: string[];
    constraints?: string;
    out_of_scope?: string;
    project_path?: string;
  };
  epics?: ProjectInitEpic[];
}

export interface ProjectInitResult {
  team?: { id: number; name: string; member_count: number };
  prd?: { id: number; title: string };
  epics: { id: number; title: string; task_count: number }[];
  total_tasks: number;
}
