import type { AgentTier, Pipeline } from './pipeline.js';

// ─── 에이전트 능력 ───

export type AgentCapability =
  | 'read_code'
  | 'write_code'
  | 'execute_shell'
  | 'web_search'
  | 'file_management'
  | 'git_operations'
  | 'test_execution'
  | 'lsp_access'
  | 'mcp_tools';

// ─── 에이전트 페르소나 ───

export type PersonaSource = 'preset' | 'custom';

export interface AgentPersona {
  id: number;
  /** 프리셋 에이전트 ID (예: 'executor') 또는 커스텀 고유 식별자 */
  agent_type: string;
  /** 표시 이름 */
  name: string;
  /** 모델 티어 */
  model: AgentTier;
  /** 카테고리 (build-analysis, review, domain, product, coordination, custom) */
  category: string;
  /** 에이전트 설명 */
  description: string;
  /** 시스템 프롬프트 (커스텀용, 프리셋은 null) */
  system_prompt: string | null;
  /** 에이전트 능력 목록 */
  capabilities: AgentCapability[];
  /** MCP 도구 접근 화이트리스트 (null = 모두 허용) */
  tool_access: string[] | null;
  /** 프리셋 vs 커스텀 */
  source: PersonaSource;
  /** UI 표시 색상 */
  color: string;
  created_at: string;
  updated_at: string;
}

export interface AgentPersonaCreate {
  agent_type: string;
  name: string;
  model?: AgentTier;
  category?: string;
  description?: string;
  system_prompt?: string;
  capabilities?: AgentCapability[];
  tool_access?: string[];
  source?: PersonaSource;
  color?: string;
}

export interface AgentPersonaUpdate {
  name?: string;
  model?: AgentTier;
  description?: string;
  system_prompt?: string;
  capabilities?: AgentCapability[];
  tool_access?: string[] | null;
  color?: string;
}

// ─── 팀 에이전트 (기존 TeamMember 대체) ───

export type AgentRole = 'lead' | 'worker' | 'reviewer' | 'observer';

export interface TeamAgent {
  id: number;
  team_id: number;
  persona_id: number;
  /** 동일 페르소나 복수 인스턴스 구분용 (예: 'executor-1') */
  instance_label: string;
  /** 팀 내 역할 */
  role: AgentRole;
  /** 팀 컨텍스트에서의 추가 프롬프트 */
  context_prompt: string | null;
  /** 최대 동시 실행 수 */
  max_concurrent: number;
  created_at: string;
  updated_at: string;
  // 조인 필드
  persona?: AgentPersona;
  team_name?: string;
  active_task_count?: number;
}

export interface TeamAgentCreate {
  team_id: number;
  persona_id: number;
  instance_label?: string;
  role?: AgentRole;
  context_prompt?: string;
  max_concurrent?: number;
}

export interface TeamAgentUpdate {
  instance_label?: string;
  role?: AgentRole;
  context_prompt?: string;
  max_concurrent?: number;
}

// ─── 팀 ───

export type TeamStatus = 'active' | 'archived';

export interface Team {
  id: number;
  name: string;
  description: string | null;
  avatar_color: string;
  status: TeamStatus;
  /** 팀의 기본 실행 파이프라인 */
  default_pipeline_id: number | null;
  /** 팀 템플릿 원본 ID */
  template_id: string | null;
  created_at: string;
  updated_at: string;
  // 조인 필드
  agent_count?: number;
  agents?: TeamAgent[];
  pipeline?: Pipeline;
}

export interface TeamCreate {
  name: string;
  description?: string;
  avatar_color?: string;
  /** 템플릿 ID로 생성 */
  template_id?: string;
  /** 직접 에이전트 지정 */
  agent_persona_ids?: number[];
}

export interface TeamUpdate {
  name?: string;
  description?: string;
  avatar_color?: string;
  status?: TeamStatus;
  default_pipeline_id?: number | null;
}

// ─── 태스크-팀 배정 ───

export interface TaskTeamAssignment {
  id: number;
  task_id: number;
  team_id: number;
  auto_execute: boolean;
  assigned_at: string;
}

export interface TaskTeamAssignmentCreate {
  task_id: number;
  team_id: number;
  auto_execute?: boolean;
}

// ─── 팀 템플릿 ───

export interface TeamTemplateAgent {
  agent_type: string;
  role: AgentRole;
  model_override?: AgentTier;
  context_prompt?: string;
}

export interface TeamTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  agents: TeamTemplateAgent[];
  pipeline_preset_id: string;
}

// ─── 워크로드 ───

export interface AgentWorkload {
  team_agent_id: number;
  persona_name: string;
  agent_type: string;
  team_name: string;
  role: AgentRole;
  total_tasks: number;
  by_status: Record<string, number>;
  active_executions: number;
}

export interface TeamWorkload {
  team_id: number;
  team_name: string;
  agents: AgentWorkload[];
  total_tasks: number;
  by_status: Record<string, number>;
  active_pipeline_count: number;
}
