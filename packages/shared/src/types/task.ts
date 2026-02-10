import type { AgentTier } from './pipeline.js';

export type TaskStatus = 'backlog' | 'todo' | 'design' | 'implementation' | 'verification' | 'review' | 'done';
export type TaskPriority = 'P0' | 'P1' | 'P2' | 'P3';
export type TaskEffort = 'S' | 'M' | 'L' | 'XL';
export type TaskExecutionStatus = 'pending' | 'running' | 'completed' | 'failed';

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
  branch_name: string | null;
  execution_status: TaskExecutionStatus | null;
  last_execution_at: string | null;
  execution_session_id: string | null;
  labels?: string[];
  blocks?: number[];
  blocked_by?: number[];
  session_ids?: string[];
  epic_title?: string;
  github_issue_url?: string | null;
  github_issue_number?: number | null;
  assignee_ids?: number[];
  assignees?: { id: number; name: string; role: string; avatar_url: string | null }[];
  work_prompt: string | null;
  design_result: string | null;       // JSON stringified DesignResult
  design_status: DesignStatus | null;
  pipeline_id: number | null;
  verification_result: string | null;   // JSON stringified VerificationResult
  verification_status: VerificationStatus | null;
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
  work_prompt?: string;
}

export interface TaskMove {
  status: TaskStatus;
  position: number;
}

export interface TaskBoard {
  backlog: Task[];
  todo: Task[];
  design: Task[];
  implementation: Task[];
  verification: Task[];
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

export interface TaskExecutionRequest {
  task_id: number;
  project_path: string;
  model?: string;
  additional_context?: string;
  dry_run?: boolean;
}

export interface TaskExecutionResult {
  task_id: number;
  session_id?: string;
  status: 'started' | 'dry_run' | 'failed';
  prompt?: string;
  error?: string;
}

export type DesignStatus = 'pending' | 'running' | 'completed' | 'failed';
export type VerificationStatus = 'pending' | 'running' | 'passed' | 'failed';

export interface VerificationCheck {
  name: string;           // 'lint' | 'typecheck' | 'test' | 'build' | 'coverage'
  status: VerificationStatus;
  command: string;
  output: string | null;
  duration_ms: number | null;
  exit_code: number | null;
  details?: Record<string, unknown>;
}

export interface VerificationResult {
  task_id: number;
  status: VerificationStatus;
  checks: VerificationCheck[];
  started_at: string;
  completed_at: string | null;
  overall_pass: boolean;
  coverage_percent?: number;
}

export interface TaskCommit {
  id: number;
  task_id: number;
  commit_hash: string;
  commit_message: string;
  author: string;
  committed_at: string;
  files_changed: number;
  insertions: number;
  deletions: number;
  branch_name: string | null;
  tracked_at: string;
}

export interface ScopeAnalysis {
  out_of_scope_steps: number[];
  partial_steps: number[];
  suggested_epic_title: string;
  suggested_epic_description: string;
  reason: string;
  confidence: 'high' | 'medium' | 'low';
}

export interface DesignResult {
  overview: string;
  steps: DesignStep[];
  risks: string[];
  success_criteria: string[];
  raw_markdown: string;
  scope_analysis?: ScopeAnalysis;
}

export interface ScopeProposal {
  task_id: number;
  original_epic_id: number;
  out_of_scope_steps: DesignStep[];
  partial_steps: DesignStep[];
  suggested_epic: { title: string; description: string; prd_id?: number };
  suggested_tasks: Array<{ title: string; description: string }>;
}

export interface ScopeSplitResult {
  new_epic_id: number;
  new_task_ids: number[];
  updated_design_result: DesignResult;
}

export interface DesignStep {
  step: number;
  title: string;
  agent_type: string;
  model: AgentTier;
  parallel: boolean;
  description: string;
  prompt: string;
  expected_output: string;
  scope_tag?: 'in-scope' | 'out-of-scope' | 'partial';
  scope_reason?: string;
}

export interface DesignResultUpdate {
  steps?: DesignStep[];
  overview?: string;
  risks?: string[];
  success_criteria?: string[];
}

export interface TaskExecutionLog {
  id: number;
  task_id: number;
  execution_id: number | null;
  phase: 'design' | 'implementation' | 'verification';
  step_number: number | null;
  agent_type: string | null;
  model: string | null;
  input_prompt: string | null;
  output_summary: string | null;
  status: string;
  duration_ms: number | null;
  started_at: string;
  completed_at: string | null;
  error: string | null;
}

// --- 실행 모니터링 타입 ---

/** 실시간 stdout 스트리밍 청크 */
export interface TaskStreamChunk {
  task_id: number;
  phase: 'design' | 'implementation' | 'verification';
  chunk: string;
  timestamp: string;
  step_number?: number;
  agent_type?: string;
}

/** 실행 로그 필터 */
export interface TaskExecutionLogFilter {
  phase?: string;
  agent_type?: string;
  model?: string;
  status?: string;
  search?: string;
  execution_id?: number;
}

/** 실행 그룹 (execution_id + phase 기준 집계) */
export interface TaskExecutionGroup {
  execution_id: number;
  phase: string;
  status: string;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  log_count: number;
}
