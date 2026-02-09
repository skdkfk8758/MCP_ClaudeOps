export type MemberRole = 'lead' | 'member' | 'observer';
export type MemberStatus = 'active' | 'inactive';

export interface Team {
  id: number;
  name: string;
  description: string | null;
  avatar_color: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
  members?: TeamMember[];
}

export interface TeamCreate {
  name: string;
  description?: string;
  avatar_color?: string;
}

export interface TeamUpdate {
  name?: string;
  description?: string;
  avatar_color?: string;
}

export interface TeamMember {
  id: number;
  team_id: number;
  name: string;
  role: MemberRole;
  email: string | null;
  avatar_url: string | null;
  status: MemberStatus;
  specialties: string[];
  created_at: string;
  updated_at: string;
  active_task_count?: number;
  team_name?: string;
}

export interface MemberCreate {
  team_id: number;
  name: string;
  role?: MemberRole;
  email?: string;
  avatar_url?: string;
  status?: MemberStatus;
  specialties?: string[];
}

export interface MemberUpdate {
  name?: string;
  role?: MemberRole;
  email?: string;
  avatar_url?: string;
  status?: MemberStatus;
  specialties?: string[];
}

export interface TaskAssignment {
  task_id: number;
  member_ids: number[];
}

export interface MemberWorkload {
  member_id: number;
  member_name: string;
  team_name: string;
  role: MemberRole;
  total_tasks: number;
  by_status: Record<string, number>;
  by_priority: Record<string, number>;
}

export interface TeamWorkload {
  team_id: number;
  team_name: string;
  members: MemberWorkload[];
  total_tasks: number;
  by_status: Record<string, number>;
}
