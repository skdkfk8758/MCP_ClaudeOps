import { getDb } from '../database/index.js';
import type {
  AgentPersona,
  AgentPersonaCreate,
  AgentPersonaUpdate,
  Team,
  TeamCreate,
  TeamUpdate,
  TeamAgent,
  TeamAgentCreate,
  TeamAgentUpdate,
  TaskTeamAssignment,
  TeamWorkload,
  AgentWorkload,
  TeamTemplate,
  PersonaSource,
  TeamStatus
} from '@claudeops/shared';
import { TEAM_TEMPLATES } from '../data/team-templates.js';

// ============================================================================
// 유틸리티 함수
// ============================================================================

/**
 * DB 행을 AgentPersona 타입으로 변환
 */
function parsePersona(row: Record<string, unknown>): AgentPersona {
  return {
    id: row.id as number,
    agent_type: row.agent_type as string,
    name: row.name as string,
    model: row.model as AgentPersona['model'],
    category: row.category as string,
    description: row.description as string,
    system_prompt: (row.system_prompt as string | null | undefined) ?? null,
    capabilities: typeof row.capabilities === 'string'
      ? JSON.parse(row.capabilities as string)
      : (row.capabilities as AgentPersona['capabilities']),
    tool_access: typeof row.tool_access === 'string'
      ? JSON.parse(row.tool_access as string)
      : (row.tool_access as AgentPersona['tool_access']),
    source: (row.source as PersonaSource) || 'custom',
    color: (row.color as string) || '#6366f1',
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * DB 행을 TeamAgent 타입으로 변환
 */
function parseTeamAgent(row: Record<string, unknown>): TeamAgent {
  const teamAgent: TeamAgent = {
    id: row.id as number,
    team_id: row.team_id as number,
    persona_id: row.persona_id as number,
    instance_label: (row.instance_label as string) || '',
    role: (row.role as TeamAgent['role']) || 'worker',
    context_prompt: (row.context_prompt as string | null | undefined) ?? null,
    max_concurrent: (row.max_concurrent as number) || 1,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };

  // persona 조인 데이터가 있으면 파싱
  if (row.persona_id && row.agent_type) {
    teamAgent.persona = parsePersona({
      id: row.persona_id,
      agent_type: row.agent_type,
      name: row.persona_name,
      model: row.persona_model,
      category: row.persona_category,
      description: row.persona_description,
      system_prompt: row.persona_system_prompt,
      capabilities: row.persona_capabilities,
      tool_access: row.persona_tool_access,
      source: row.persona_source,
      color: row.persona_color,
      created_at: row.persona_created_at,
      updated_at: row.persona_updated_at,
    });
  }

  return teamAgent;
}

/**
 * 시스템 프롬프트 유효성 검증
 */
function validateSystemPrompt(prompt: string): boolean {
  return prompt.length <= 2000;
}

// ============================================================================
// Persona CRUD
// ============================================================================

/**
 * 페르소나 목록 조회
 */
export function listPersonas(filter?: {
  category?: string;
  source?: string;
  search?: string
}): AgentPersona[] {
  const db = getDb();

  let query = 'SELECT * FROM agent_personas WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.category) {
    query += ' AND category = ?';
    params.push(filter.category);
  }

  if (filter?.source) {
    query += ' AND source = ?';
    params.push(filter.source);
  }

  if (filter?.search) {
    query += ' AND (name LIKE ? OR description LIKE ? OR agent_type LIKE ?)';
    const searchPattern = `%${filter.search}%`;
    params.push(searchPattern, searchPattern, searchPattern);
  }

  query += ' ORDER BY category, name';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];
  return rows.map(parsePersona);
}

/**
 * ID로 페르소나 조회
 */
export function getPersona(id: number): AgentPersona | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agent_personas WHERE id = ?').get(id) as Record<string, unknown> | undefined;
  return row ? parsePersona(row) : undefined;
}

/**
 * agent_type으로 페르소나 조회
 */
export function getPersonaByType(agentType: string): AgentPersona | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM agent_personas WHERE agent_type = ?').get(agentType) as Record<string, unknown> | undefined;
  return row ? parsePersona(row) : undefined;
}

/**
 * 페르소나 생성
 */
export function createPersona(data: AgentPersonaCreate): AgentPersona {
  const db = getDb();

  // system_prompt 검증
  if (data.system_prompt && !validateSystemPrompt(data.system_prompt)) {
    throw new Error('시스템 프롬프트는 2000자 이하여야 합니다');
  }

  // source는 항상 'custom'으로 설정
  const result = db.prepare(`
    INSERT INTO agent_personas (
      agent_type, name, model, category, description,
      system_prompt, capabilities, tool_access, source, color
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'custom', ?)
  `).run(
    data.agent_type,
    data.name,
    data.model,
    data.category,
    data.description,
    data.system_prompt || null,
    JSON.stringify(data.capabilities),
    JSON.stringify(data.tool_access),
    data.color || null
  );

  const created = getPersona(result.lastInsertRowid as number);
  if (!created) {
    throw new Error('페르소나 생성에 실패했습니다');
  }
  return created;
}

/**
 * 페르소나 수정
 */
export function updatePersona(id: number, data: AgentPersonaUpdate): AgentPersona | undefined {
  const db = getDb();
  const existing = getPersona(id);

  if (!existing) {
    return undefined;
  }

  // system_prompt 검증
  if (data.system_prompt && !validateSystemPrompt(data.system_prompt)) {
    throw new Error('시스템 프롬프트는 2000자 이하여야 합니다');
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (existing.source === 'preset') {
    // 프리셋은 system_prompt만 수정 가능
    if (data.system_prompt !== undefined) {
      updates.push('system_prompt = ?');
      params.push(data.system_prompt);
    }
  } else {
    // custom은 모든 필드 수정 가능
    if (data.name !== undefined) {
      updates.push('name = ?');
      params.push(data.name);
    }
    if (data.model !== undefined) {
      updates.push('model = ?');
      params.push(data.model);
    }
    if (data.description !== undefined) {
      updates.push('description = ?');
      params.push(data.description);
    }
    if (data.system_prompt !== undefined) {
      updates.push('system_prompt = ?');
      params.push(data.system_prompt);
    }
    if (data.capabilities !== undefined) {
      updates.push('capabilities = ?');
      params.push(JSON.stringify(data.capabilities));
    }
    if (data.tool_access !== undefined) {
      updates.push('tool_access = ?');
      params.push(JSON.stringify(data.tool_access));
    }
    if (data.color !== undefined) {
      updates.push('color = ?');
      params.push(data.color);
    }
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE agent_personas SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return getPersona(id);
}

/**
 * 페르소나 삭제
 */
export function deletePersona(id: number): boolean {
  const db = getDb();
  const existing = getPersona(id);

  if (!existing) {
    return false;
  }

  if (existing.source === 'preset') {
    throw new Error('프리셋 페르소나는 삭제할 수 없습니다');
  }

  const result = db.prepare('DELETE FROM agent_personas WHERE id = ?').run(id);
  return result.changes > 0;
}

// ============================================================================
// Team CRUD
// ============================================================================

/**
 * 팀 생성
 */
export function createTeam(data: TeamCreate): Team {
  const db = getDb();

  // 템플릿으로부터 팀 생성
  if (data.template_id) {
    return createTeamFromTemplate(data.template_id);
  }

  // 일반 팀 생성
  const result = db.prepare(`
    INSERT INTO teams (name, description, avatar_color, status)
    VALUES (?, ?, ?, 'active')
  `).run(
    data.name,
    data.description || null,
    data.avatar_color || null
  );

  const teamId = result.lastInsertRowid as number;

  // 페르소나 추가
  if (data.agent_persona_ids && data.agent_persona_ids.length > 0) {
    for (const personaId of data.agent_persona_ids) {
      addAgentToTeam({
        team_id: teamId,
        persona_id: personaId,
      });
    }
  }

  const created = getTeam(teamId);
  if (!created) {
    throw new Error('팀 생성에 실패했습니다');
  }
  return created;
}

/**
 * 템플릿으로부터 팀 생성
 */
export function createTeamFromTemplate(templateId: string): Team {
  const db = getDb();
  const template = TEAM_TEMPLATES.find(t => t.id === templateId);

  if (!template) {
    throw new Error(`템플릿을 찾을 수 없습니다: ${templateId}`);
  }

  // 팀 생성
  const result = db.prepare(`
    INSERT INTO teams (name, description, avatar_color, status, template_id)
    VALUES (?, ?, ?, 'active', ?)
  `).run(
    template.name,
    template.description,
    '#6366f1',
    templateId
  );

  const teamId = result.lastInsertRowid as number;

  // 템플릿의 에이전트 추가
  for (const agent of template.agents) {
    const persona = getPersonaByType(agent.agent_type);
    if (persona) {
      addAgentToTeam({
        team_id: teamId,
        persona_id: persona.id,
        role: agent.role,
        context_prompt: agent.context_prompt,
      });
    }
  }

  const created = getTeam(teamId);
  if (!created) {
    throw new Error('팀 생성에 실패했습니다');
  }
  return created;
}

/**
 * 팀 복제
 */
export function cloneTeam(sourceTeamId: number, newName: string): Team {
  const db = getDb();
  const sourceTeam = getTeam(sourceTeamId);

  if (!sourceTeam) {
    throw new Error('원본 팀을 찾을 수 없습니다');
  }

  // 새 팀 생성
  const result = db.prepare(`
    INSERT INTO teams (name, description, avatar_color, status, template_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(
    newName,
    sourceTeam.description,
    sourceTeam.avatar_color,
    'active',
    sourceTeam.template_id || null
  );

  const newTeamId = result.lastInsertRowid as number;

  // 원본 팀의 에이전트 복사
  const sourceAgents = listTeamAgents(sourceTeamId);
  for (const agent of sourceAgents) {
    addAgentToTeam({
      team_id: newTeamId,
      persona_id: agent.persona_id,
      instance_label: agent.instance_label,
      role: agent.role,
      context_prompt: agent.context_prompt || undefined,
      max_concurrent: agent.max_concurrent,
    });
  }

  const created = getTeam(newTeamId);
  if (!created) {
    throw new Error('팀 복제에 실패했습니다');
  }
  return created;
}

/**
 * ID로 팀 조회
 */
export function getTeam(id: number): Team | undefined {
  const db = getDb();
  const row = db.prepare('SELECT * FROM teams WHERE id = ?').get(id) as Record<string, unknown> | undefined;

  if (!row) {
    return undefined;
  }

  const agents = listTeamAgents(id);

  return {
    id: row.id as number,
    name: row.name as string,
    description: (row.description as string | null | undefined) ?? null,
    avatar_color: (row.avatar_color as string) || '#6366f1',
    status: (row.status as TeamStatus) || 'active',
    default_pipeline_id: (row.default_pipeline_id as number | null | undefined) ?? null,
    template_id: (row.template_id as string | null | undefined) ?? null,
    agents,
    agent_count: agents.length,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
  };
}

/**
 * 팀 수정
 */
export function updateTeam(id: number, data: TeamUpdate): Team | undefined {
  const db = getDb();
  const existing = getTeam(id);

  if (!existing) {
    return undefined;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.name !== undefined) {
    updates.push('name = ?');
    params.push(data.name);
  }
  if (data.description !== undefined) {
    updates.push('description = ?');
    params.push(data.description);
  }
  if (data.avatar_color !== undefined) {
    updates.push('avatar_color = ?');
    params.push(data.avatar_color);
  }
  if (data.status !== undefined) {
    updates.push('status = ?');
    params.push(data.status);
  }
  if (data.default_pipeline_id !== undefined) {
    updates.push('default_pipeline_id = ?');
    params.push(data.default_pipeline_id);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE teams SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return getTeam(id);
}

/**
 * 팀 삭제
 */
export function deleteTeam(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM teams WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 팀 목록 조회
 */
export function listTeams(filter?: { status?: string }): Team[] {
  const db = getDb();

  let query = 'SELECT * FROM teams WHERE 1=1';
  const params: unknown[] = [];

  if (filter?.status) {
    query += ' AND status = ?';
    params.push(filter.status);
  }

  query += ' ORDER BY created_at DESC';

  const rows = db.prepare(query).all(...params) as Record<string, unknown>[];

  return rows.map(row => {
    const teamId = row.id as number;
    const agents = listTeamAgents(teamId);

    return {
      id: teamId,
      name: row.name as string,
      description: (row.description as string | null | undefined) ?? null,
      avatar_color: (row.avatar_color as string) || '#6366f1',
      status: (row.status as TeamStatus) || 'active',
      default_pipeline_id: (row.default_pipeline_id as number | null | undefined) ?? null,
      template_id: (row.template_id as string | null | undefined) ?? null,
      agents,
      agent_count: agents.length,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });
}

/**
 * 팀 보관
 */
export function archiveTeam(id: number): Team | undefined {
  return updateTeam(id, { status: 'archived' });
}

/**
 * 팀 활성화
 */
export function activateTeam(id: number): Team | undefined {
  return updateTeam(id, { status: 'active' });
}

// ============================================================================
// TeamAgent CRUD
// ============================================================================

/**
 * 팀에 에이전트 추가
 */
export function addAgentToTeam(data: TeamAgentCreate): TeamAgent {
  const db = getDb();

  // 페르소나 존재 확인
  const persona = getPersona(data.persona_id);
  if (!persona) {
    throw new Error('페르소나를 찾을 수 없습니다');
  }

  const result = db.prepare(`
    INSERT INTO team_agents (
      team_id, persona_id, instance_label, role, context_prompt, max_concurrent
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    data.team_id,
    data.persona_id,
    data.instance_label || '',
    data.role || null,
    data.context_prompt || null,
    data.max_concurrent || null
  );

  const created = getTeamAgent(result.lastInsertRowid as number);
  if (!created) {
    throw new Error('팀 에이전트 추가에 실패했습니다');
  }
  return created;
}

/**
 * 팀 에이전트 수정
 */
export function updateTeamAgent(id: number, data: TeamAgentUpdate): TeamAgent | undefined {
  const db = getDb();
  const existing = getTeamAgent(id);

  if (!existing) {
    return undefined;
  }

  const updates: string[] = [];
  const params: unknown[] = [];

  if (data.instance_label !== undefined) {
    updates.push('instance_label = ?');
    params.push(data.instance_label);
  }
  if (data.role !== undefined) {
    updates.push('role = ?');
    params.push(data.role);
  }
  if (data.context_prompt !== undefined) {
    updates.push('context_prompt = ?');
    params.push(data.context_prompt);
  }
  if (data.max_concurrent !== undefined) {
    updates.push('max_concurrent = ?');
    params.push(data.max_concurrent);
  }

  if (updates.length === 0) {
    return existing;
  }

  updates.push("updated_at = datetime('now')");
  params.push(id);

  db.prepare(`UPDATE team_agents SET ${updates.join(', ')} WHERE id = ?`).run(...params);

  return getTeamAgent(id);
}

/**
 * 팀에서 에이전트 제거
 */
export function removeAgentFromTeam(id: number): boolean {
  const db = getDb();
  const result = db.prepare('DELETE FROM team_agents WHERE id = ?').run(id);
  return result.changes > 0;
}

/**
 * 팀의 에이전트 목록 조회
 */
export function listTeamAgents(teamId: number): TeamAgent[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT
      ta.*,
      ap.id as persona_id,
      ap.agent_type,
      ap.name as persona_name,
      ap.model as persona_model,
      ap.category as persona_category,
      ap.description as persona_description,
      ap.system_prompt as persona_system_prompt,
      ap.capabilities as persona_capabilities,
      ap.tool_access as persona_tool_access,
      ap.source as persona_source,
      ap.color as persona_color,
      ap.created_at as persona_created_at,
      ap.updated_at as persona_updated_at
    FROM team_agents ta
    JOIN agent_personas ap ON ta.persona_id = ap.id
    WHERE ta.team_id = ?
    ORDER BY ta.role, ap.name
  `).all(teamId) as Record<string, unknown>[];

  return rows.map(parseTeamAgent);
}

/**
 * ID로 팀 에이전트 조회 (내부 헬퍼)
 */
function getTeamAgent(id: number): TeamAgent | undefined {
  const db = getDb();

  const row = db.prepare(`
    SELECT
      ta.*,
      ap.id as persona_id,
      ap.agent_type,
      ap.name as persona_name,
      ap.model as persona_model,
      ap.category as persona_category,
      ap.description as persona_description,
      ap.system_prompt as persona_system_prompt,
      ap.capabilities as persona_capabilities,
      ap.tool_access as persona_tool_access,
      ap.source as persona_source,
      ap.color as persona_color,
      ap.created_at as persona_created_at,
      ap.updated_at as persona_updated_at
    FROM team_agents ta
    JOIN agent_personas ap ON ta.persona_id = ap.id
    WHERE ta.id = ?
  `).get(id) as Record<string, unknown> | undefined;

  return row ? parseTeamAgent(row) : undefined;
}

// ============================================================================
// Task-Team Assignment
// ============================================================================

/**
 * 태스크에 팀 할당
 */
export function assignTeamToTask(
  taskId: number,
  teamId: number,
  autoExecute?: boolean
): TaskTeamAssignment {
  const db = getDb();

  db.prepare(`
    INSERT OR IGNORE INTO task_team_assignments (task_id, team_id, auto_execute)
    VALUES (?, ?, ?)
  `).run(taskId, teamId, autoExecute ? 1 : 0);

  const row = db.prepare(`
    SELECT * FROM task_team_assignments
    WHERE task_id = ? AND team_id = ?
  `).get(taskId, teamId) as Record<string, unknown>;

  return {
    id: taskId, // id 컬럼이 없으므로 task_id 사용
    task_id: row.task_id as number,
    team_id: row.team_id as number,
    auto_execute: Boolean(row.auto_execute),
    assigned_at: row.assigned_at as string,
  };
}

/**
 * 태스크에서 팀 할당 해제
 */
export function unassignTeamFromTask(taskId: number, teamId: number): boolean {
  const db = getDb();
  const result = db.prepare(`
    DELETE FROM task_team_assignments
    WHERE task_id = ? AND team_id = ?
  `).run(taskId, teamId);
  return result.changes > 0;
}

/**
 * 태스크에 할당된 팀 목록 조회
 */
export function getTaskTeams(taskId: number): Team[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT t.*
    FROM task_team_assignments tta
    JOIN teams t ON tta.team_id = t.id
    WHERE tta.task_id = ?
  `).all(taskId) as Record<string, unknown>[];

  return rows.map(row => {
    const teamId = row.id as number;
    const agents = listTeamAgents(teamId);

    return {
      id: teamId,
      name: row.name as string,
      description: (row.description as string | null | undefined) ?? null,
      avatar_color: (row.avatar_color as string) || '#6366f1',
      status: (row.status as TeamStatus) || 'active',
      default_pipeline_id: (row.default_pipeline_id as number | null | undefined) ?? null,
      template_id: (row.template_id as string | null | undefined) ?? null,
      agents,
      agent_count: agents.length,
      created_at: row.created_at as string,
      updated_at: row.updated_at as string,
    };
  });
}

/**
 * 팀에 할당된 태스크 목록 조회
 */
export function getTeamTasks(teamId: number): {
  task_id: number;
  auto_execute: boolean;
  assigned_at: string
}[] {
  const db = getDb();

  const rows = db.prepare(`
    SELECT * FROM task_team_assignments WHERE team_id = ?
  `).all(teamId) as Record<string, unknown>[];

  return rows.map(row => ({
    task_id: row.task_id as number,
    auto_execute: Boolean(row.auto_execute),
    assigned_at: row.assigned_at as string,
  }));
}

// ============================================================================
// Workload
// ============================================================================

/**
 * 팀 워크로드 조회
 */
export function getTeamWorkload(teamId: number): TeamWorkload | undefined {
  const db = getDb();
  const team = getTeam(teamId);

  if (!team) {
    return undefined;
  }

  // 팀의 에이전트 목록
  const agents = listTeamAgents(teamId);

  // 각 에이전트별 태스크 배정 수 집계
  const agentWorkloads: AgentWorkload[] = agents.map(agent => {
    // 실제로는 task_agent_assignments 같은 테이블이 필요하지만
    // 현재 스키마에는 없으므로 0으로 설정
    return {
      team_agent_id: agent.id,
      persona_name: agent.persona?.name || '',
      agent_type: agent.persona?.agent_type || '',
      team_name: team.name,
      role: agent.role,
      total_tasks: 0,
      by_status: {},
      active_executions: 0,
    };
  });

  // 팀에 배정된 태스크들의 상태 집계
  const teamTasks = getTeamTasks(teamId);

  // 실제로는 tasks 테이블과 조인해서 상태별로 카운트해야 하지만
  // 간단히 전체 수만 반환
  const totalTasks = teamTasks.length;

  // 활성 파이프라인 카운트
  let activePipelineCount = 0;
  try {
    const result = db.prepare(`
      SELECT COUNT(*) as count
      FROM pipeline_executions
      WHERE team_id = ? AND status = 'running'
    `).get(teamId) as { count: number } | undefined;
    activePipelineCount = result?.count || 0;
  } catch {
    // pipeline_executions 테이블이 없으면 0
    activePipelineCount = 0;
  }

  return {
    team_id: teamId,
    team_name: team.name,
    agents: agentWorkloads,
    total_tasks: totalTasks,
    by_status: {},
    active_pipeline_count: activePipelineCount,
  };
}

// ============================================================================
// 템플릿
// ============================================================================

/**
 * 팀 템플릿 목록 조회
 */
export function getTeamTemplates(): TeamTemplate[] {
  return TEAM_TEMPLATES;
}

