import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// Create in-memory DB before mocking
let memDb: Database.Database;

// Mock getDb to return our in-memory database
vi.mock('../database/index.js', () => ({
  getDb: () => memDb,
}));

// Mock TEAM_TEMPLATES
vi.mock('../data/team-templates.js', () => ({
  TEAM_TEMPLATES: [
    {
      id: 'feature-development',
      name: 'Feature Development',
      description: '기능 개발 팀',
      agents: [
        { agent_type: 'test-persona', role: 'lead', context_prompt: 'Lead agent' },
      ],
    },
  ],
}));

// Import model functions AFTER the mock
import {
  listPersonas,
  getPersona,
  getPersonaByType,
  createPersona,
  updatePersona,
  deletePersona,
  createTeam,
  cloneTeam,
  getTeam,
  updateTeam,
  deleteTeam,
  listTeams,
  archiveTeam,
  activateTeam,
  addAgentToTeam,
  updateTeamAgent,
  removeAgentFromTeam,
  listTeamAgents,
  assignTeamToTask,
  unassignTeamFromTask,
  getTaskTeams,
  getTeamTasks,
  getTeamWorkload,
  getTeamTemplates,
} from './team.js';
import type { AgentPersonaCreate, TeamCreate, TeamAgentCreate } from '@claudeops/shared';

/**
 * 스키마 초기화 함수
 * team 모델이 의존하는 모든 테이블을 생성
 */
function initSchema(db: Database.Database) {
  db.pragma('foreign_keys = ON');

  // agent_personas 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS agent_personas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      agent_type TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      model TEXT NOT NULL DEFAULT 'sonnet',
      category TEXT NOT NULL DEFAULT 'custom',
      description TEXT,
      system_prompt TEXT,
      capabilities TEXT,
      tool_access TEXT,
      source TEXT NOT NULL DEFAULT 'custom',
      color TEXT DEFAULT '#6b7280',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // teams 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      avatar_color TEXT DEFAULT '#6366f1',
      status TEXT NOT NULL DEFAULT 'active',
      default_pipeline_id INTEGER,
      template_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // team_agents 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS team_agents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      persona_id INTEGER NOT NULL REFERENCES agent_personas(id) ON DELETE CASCADE,
      instance_label TEXT NOT NULL DEFAULT '',
      role TEXT DEFAULT 'worker',
      context_prompt TEXT,
      max_concurrent INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, persona_id, instance_label)
    );
  `);

  // tasks 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'P2',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // task_team_assignments 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_team_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      auto_execute INTEGER NOT NULL DEFAULT 0,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, team_id)
    );
  `);
}

describe('Team Model', () => {
  beforeEach(() => {
    memDb = new Database(':memory:');
    initSchema(memDb);

    // 테스트용 페르소나 데이터 생성
    memDb.prepare(`
      INSERT INTO agent_personas (agent_type, name, model, category, description, capabilities, tool_access, source)
      VALUES ('test-persona', 'Test Persona', 'sonnet', 'development', 'Test persona for testing', '[]', '[]', 'preset')
    `).run();

    memDb.prepare(`
      INSERT INTO agent_personas (agent_type, name, model, category, description, capabilities, tool_access, source)
      VALUES ('custom-persona', 'Custom Persona', 'opus', 'custom', 'Custom persona for testing', '[]', '[]', 'custom')
    `).run();
  });

  describe('TC-P01: Persona CRUD - listPersonas', () => {
    it('전체 페르소나 목록을 조회할 수 있어야 함', () => {
      const personas = listPersonas();

      expect(personas).toHaveLength(2);
      expect(personas[0]).toHaveProperty('id');
      expect(personas[0]).toHaveProperty('agent_type');
      expect(personas[0]).toHaveProperty('name');
    });

    it('category 필터가 동작해야 함', () => {
      const personas = listPersonas({ category: 'development' });

      expect(personas).toHaveLength(1);
      expect(personas[0].category).toBe('development');
      expect(personas[0].agent_type).toBe('test-persona');
    });

    it('source 필터가 동작해야 함', () => {
      const personas = listPersonas({ source: 'custom' });

      expect(personas).toHaveLength(1);
      expect(personas[0].source).toBe('custom');
      expect(personas[0].agent_type).toBe('custom-persona');
    });

    it('search 필터가 동작해야 함 (name, description, agent_type 검색)', () => {
      const personas = listPersonas({ search: 'Custom' });

      expect(personas).toHaveLength(1);
      expect(personas[0].name).toBe('Custom Persona');
    });
  });

  describe('TC-P02: Persona CRUD - getPersona', () => {
    it('존재하는 ID로 페르소나를 조회할 수 있어야 함', () => {
      const personas = listPersonas();
      const persona = getPersona(personas[0].id);

      expect(persona).toBeDefined();
      expect(persona!.id).toBe(personas[0].id);
      expect(persona!.agent_type).toBe(personas[0].agent_type);
    });

    it('존재하지 않는 ID 조회 시 undefined 반환', () => {
      const persona = getPersona(9999);
      expect(persona).toBeUndefined();
    });
  });

  describe('TC-P03: Persona CRUD - getPersonaByType', () => {
    it('agent_type으로 페르소나를 조회할 수 있어야 함', () => {
      const persona = getPersonaByType('test-persona');

      expect(persona).toBeDefined();
      expect(persona!.agent_type).toBe('test-persona');
      expect(persona!.name).toBe('Test Persona');
    });

    it('존재하지 않는 agent_type 조회 시 undefined 반환', () => {
      const persona = getPersonaByType('non-existent');
      expect(persona).toBeUndefined();
    });
  });

  describe('TC-P04: Persona CRUD - createPersona', () => {
    it('새 페르소나를 생성할 수 있어야 함', () => {
      const personaData: AgentPersonaCreate = {
        agent_type: 'new-persona',
        name: 'New Persona',
        model: 'haiku',
        category: 'testing',
        description: 'New test persona',
        capabilities: ['test'],
        tool_access: ['bash'],
        color: '#ff0000',
      };

      const persona = createPersona(personaData);

      expect(persona).toBeDefined();
      expect(persona.id).toBeGreaterThan(0);
      expect(persona.agent_type).toBe('new-persona');
      expect(persona.name).toBe('New Persona');
      expect(persona.model).toBe('haiku');
      expect(persona.source).toBe('custom');
      expect(persona.color).toBe('#ff0000');
    });

    it('system_prompt가 2000자를 초과하면 에러가 발생해야 함', () => {
      const longPrompt = 'a'.repeat(2001);
      const personaData: AgentPersonaCreate = {
        agent_type: 'long-prompt-persona',
        name: 'Long Prompt',
        model: 'sonnet',
        category: 'test',
        description: 'Test',
        system_prompt: longPrompt,
        capabilities: [],
        tool_access: [],
      };

      expect(() => createPersona(personaData)).toThrow('2000자');
    });
  });

  describe('TC-P05: Persona CRUD - updatePersona', () => {
    it('custom 페르소나는 모든 필드를 수정할 수 있어야 함', () => {
      const persona = getPersonaByType('custom-persona')!;

      const updated = updatePersona(persona.id, {
        name: 'Updated Name',
        description: 'Updated description',
        model: 'haiku',
        color: '#00ff00',
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Name');
      expect(updated!.description).toBe('Updated description');
      expect(updated!.model).toBe('haiku');
      expect(updated!.color).toBe('#00ff00');
    });

    it('preset 페르소나는 system_prompt만 수정할 수 있어야 함', () => {
      const persona = getPersonaByType('test-persona')!;

      const updated = updatePersona(persona.id, {
        system_prompt: 'New system prompt',
      });

      expect(updated).toBeDefined();
      expect(updated!.system_prompt).toBe('New system prompt');
    });

    it('preset 페르소나의 다른 필드 수정 시도는 무시되어야 함', () => {
      const persona = getPersonaByType('test-persona')!;
      const originalName = persona.name;

      const updated = updatePersona(persona.id, {
        name: 'Should not change',
        system_prompt: 'New prompt',
      });

      expect(updated!.name).toBe(originalName);
      expect(updated!.system_prompt).toBe('New prompt');
    });

    it('존재하지 않는 ID 수정 시 undefined 반환', () => {
      const updated = updatePersona(9999, { name: 'Test' });
      expect(updated).toBeUndefined();
    });
  });

  describe('TC-P06: Persona CRUD - deletePersona', () => {
    it('custom 페르소나는 삭제할 수 있어야 함', () => {
      const persona = getPersonaByType('custom-persona')!;

      const deleted = deletePersona(persona.id);

      expect(deleted).toBe(true);
      expect(getPersona(persona.id)).toBeUndefined();
    });

    it('preset 페르소나 삭제 시 에러가 발생해야 함', () => {
      const persona = getPersonaByType('test-persona')!;

      expect(() => deletePersona(persona.id)).toThrow('프리셋');
    });

    it('존재하지 않는 ID 삭제 시 false 반환', () => {
      const deleted = deletePersona(9999);
      expect(deleted).toBe(false);
    });
  });

  describe('TC-T01: Team CRUD - createTeam', () => {
    it('기본 팀을 생성할 수 있어야 함', () => {
      const teamData: TeamCreate = {
        name: 'Test Team',
        description: 'Test team description',
        avatar_color: '#ff0000',
      };

      const team = createTeam(teamData);

      expect(team).toBeDefined();
      expect(team.id).toBeGreaterThan(0);
      expect(team.name).toBe('Test Team');
      expect(team.description).toBe('Test team description');
      expect(team.avatar_color).toBe('#ff0000');
      expect(team.status).toBe('active');
      expect(team.agent_count).toBe(0);
    });

    it('agent_persona_ids로 에이전트를 포함하여 팀을 생성할 수 있어야 함', () => {
      const persona = getPersonaByType('test-persona')!;
      const teamData: TeamCreate = {
        name: 'Team with Agents',
        agent_persona_ids: [persona.id],
      };

      const team = createTeam(teamData);

      expect(team).toBeDefined();
      expect(team.agent_count).toBe(1);
      expect(team.agents).toHaveLength(1);
      expect(team.agents[0].persona_id).toBe(persona.id);
    });

    it('template_id로 템플릿 기반 팀을 생성할 수 있어야 함', () => {
      const teamData: TeamCreate = {
        name: 'Template Team',
        template_id: 'feature-development',
      };

      const team = createTeam(teamData);

      expect(team).toBeDefined();
      expect(team.name).toBe('Feature Development');
      expect(team.description).toBe('기능 개발 팀');
      expect(team.template_id).toBe('feature-development');
      expect(team.agent_count).toBe(1);
    });
  });

  describe('TC-T02: Team CRUD - getTeam', () => {
    it('존재하는 팀을 조회할 수 있어야 함', () => {
      const created = createTeam({ name: 'Test Team' });
      const team = getTeam(created.id);

      expect(team).toBeDefined();
      expect(team!.id).toBe(created.id);
      expect(team!.name).toBe('Test Team');
    });

    it('존재하지 않는 ID 조회 시 undefined 반환', () => {
      const team = getTeam(9999);
      expect(team).toBeUndefined();
    });
  });

  describe('TC-T03: Team CRUD - updateTeam', () => {
    it('팀의 이름, 설명, 색상을 수정할 수 있어야 함', () => {
      const team = createTeam({ name: 'Original Team' });

      const updated = updateTeam(team.id, {
        name: 'Updated Team',
        description: 'Updated description',
        avatar_color: '#00ff00',
      });

      expect(updated).toBeDefined();
      expect(updated!.name).toBe('Updated Team');
      expect(updated!.description).toBe('Updated description');
      expect(updated!.avatar_color).toBe('#00ff00');
    });

    it('빈 업데이트 시 기존 팀 반환', () => {
      const team = createTeam({ name: 'Test Team' });

      const updated = updateTeam(team.id, {});

      expect(updated).toBeDefined();
      expect(updated!.id).toBe(team.id);
    });

    it('존재하지 않는 ID 수정 시 undefined 반환', () => {
      const updated = updateTeam(9999, { name: 'Test' });
      expect(updated).toBeUndefined();
    });
  });

  describe('TC-T04: Team CRUD - deleteTeam', () => {
    it('팀을 삭제할 수 있어야 함', () => {
      const team = createTeam({ name: 'Delete Team' });

      const deleted = deleteTeam(team.id);

      expect(deleted).toBe(true);
      expect(getTeam(team.id)).toBeUndefined();
    });

    it('존재하지 않는 ID 삭제 시 false 반환', () => {
      const deleted = deleteTeam(9999);
      expect(deleted).toBe(false);
    });
  });

  describe('TC-T05: Team CRUD - listTeams', () => {
    beforeEach(() => {
      createTeam({ name: 'Active Team 1' });
      createTeam({ name: 'Active Team 2' });
      const archived = createTeam({ name: 'Archived Team' });
      archiveTeam(archived.id);
    });

    it('전체 팀 목록을 조회할 수 있어야 함', () => {
      const teams = listTeams();

      expect(teams).toHaveLength(3);
    });

    it('status 필터가 동작해야 함 (active)', () => {
      const teams = listTeams({ status: 'active' });

      expect(teams).toHaveLength(2);
      expect(teams.every(t => t.status === 'active')).toBe(true);
    });

    it('status 필터가 동작해야 함 (archived)', () => {
      const teams = listTeams({ status: 'archived' });

      expect(teams).toHaveLength(1);
      expect(teams[0].status).toBe('archived');
      expect(teams[0].name).toBe('Archived Team');
    });
  });

  describe('TC-T06: Team CRUD - archiveTeam & activateTeam', () => {
    it('팀을 보관할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });

      const archived = archiveTeam(team.id);

      expect(archived).toBeDefined();
      expect(archived!.status).toBe('archived');
    });

    it('보관된 팀을 다시 활성화할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      archiveTeam(team.id);

      const activated = activateTeam(team.id);

      expect(activated).toBeDefined();
      expect(activated!.status).toBe('active');
    });
  });

  describe('TC-T07: Team CRUD - cloneTeam', () => {
    it('팀을 복제할 수 있어야 함 (에이전트 포함)', () => {
      const persona = getPersonaByType('test-persona')!;
      const original = createTeam({
        name: 'Original Team',
        description: 'Original description',
        agent_persona_ids: [persona.id],
      });

      const cloned = cloneTeam(original.id, 'Cloned Team');

      expect(cloned).toBeDefined();
      expect(cloned.id).not.toBe(original.id);
      expect(cloned.name).toBe('Cloned Team');
      expect(cloned.description).toBe(original.description);
      expect(cloned.agent_count).toBe(original.agent_count);
    });

    it('존재하지 않는 팀 복제 시 에러가 발생해야 함', () => {
      expect(() => cloneTeam(9999, 'Clone')).toThrow('원본 팀');
    });
  });

  describe('TC-TA01: TeamAgent CRUD - addAgentToTeam', () => {
    it('팀에 에이전트를 추가할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona = getPersonaByType('test-persona')!;

      const agentData: TeamAgentCreate = {
        team_id: team.id,
        persona_id: persona.id,
        role: 'lead',
        context_prompt: 'Test context',
      };

      const teamAgent = addAgentToTeam(agentData);

      expect(teamAgent).toBeDefined();
      expect(teamAgent.id).toBeGreaterThan(0);
      expect(teamAgent.team_id).toBe(team.id);
      expect(teamAgent.persona_id).toBe(persona.id);
      expect(teamAgent.role).toBe('lead');
      expect(teamAgent.context_prompt).toBe('Test context');
    });

    it('존재하지 않는 페르소나 추가 시 에러가 발생해야 함', () => {
      const team = createTeam({ name: 'Test Team' });

      const agentData: TeamAgentCreate = {
        team_id: team.id,
        persona_id: 9999,
      };

      expect(() => addAgentToTeam(agentData)).toThrow('페르소나');
    });
  });

  describe('TC-TA02: TeamAgent CRUD - updateTeamAgent', () => {
    it('팀 에이전트의 role을 변경할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona = getPersonaByType('test-persona')!;
      const teamAgent = addAgentToTeam({
        team_id: team.id,
        persona_id: persona.id,
        role: 'worker',
      });

      const updated = updateTeamAgent(teamAgent.id, { role: 'lead' });

      expect(updated).toBeDefined();
      expect(updated!.role).toBe('lead');
    });

    it('팀 에이전트의 context_prompt를 변경할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona = getPersonaByType('test-persona')!;
      const teamAgent = addAgentToTeam({
        team_id: team.id,
        persona_id: persona.id,
      });

      const updated = updateTeamAgent(teamAgent.id, {
        context_prompt: 'New context',
      });

      expect(updated).toBeDefined();
      expect(updated!.context_prompt).toBe('New context');
    });

    it('존재하지 않는 ID 수정 시 undefined 반환', () => {
      const updated = updateTeamAgent(9999, { role: 'lead' });
      expect(updated).toBeUndefined();
    });
  });

  describe('TC-TA03: TeamAgent CRUD - removeAgentFromTeam', () => {
    it('팀에서 에이전트를 제거할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona = getPersonaByType('test-persona')!;
      const teamAgent = addAgentToTeam({
        team_id: team.id,
        persona_id: persona.id,
      });

      const removed = removeAgentFromTeam(teamAgent.id);

      expect(removed).toBe(true);

      const agents = listTeamAgents(team.id);
      expect(agents).toHaveLength(0);
    });

    it('존재하지 않는 ID 제거 시 false 반환', () => {
      const removed = removeAgentFromTeam(9999);
      expect(removed).toBe(false);
    });
  });

  describe('TC-TA04: TeamAgent CRUD - listTeamAgents', () => {
    it('팀의 에이전트 목록을 조회할 수 있어야 함 (persona 조인)', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona1 = getPersonaByType('test-persona')!;
      const persona2 = getPersonaByType('custom-persona')!;

      addAgentToTeam({ team_id: team.id, persona_id: persona1.id, role: 'lead' });
      addAgentToTeam({ team_id: team.id, persona_id: persona2.id, role: 'worker' });

      const agents = listTeamAgents(team.id);

      expect(agents).toHaveLength(2);
      expect(agents[0]).toHaveProperty('persona');
      expect(agents[0].persona).toBeDefined();
      expect(agents[0].persona!.name).toBeDefined();
    });
  });

  describe('TC-TT01: Task-Team Assignment - assignTeamToTask', () => {
    it('태스크에 팀을 할당할 수 있어야 함', () => {
      // 태스크 생성
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;

      const team = createTeam({ name: 'Test Team' });

      const assignment = assignTeamToTask(taskId, team.id, true);

      expect(assignment).toBeDefined();
      expect(assignment.task_id).toBe(taskId);
      expect(assignment.team_id).toBe(team.id);
      expect(assignment.auto_execute).toBe(true);
    });

    it('중복 할당 시 무시되어야 함', () => {
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;
      const team = createTeam({ name: 'Test Team' });

      assignTeamToTask(taskId, team.id);
      assignTeamToTask(taskId, team.id); // 중복

      const teams = getTaskTeams(taskId);
      expect(teams).toHaveLength(1);
    });
  });

  describe('TC-TT02: Task-Team Assignment - unassignTeamFromTask', () => {
    it('태스크에서 팀 할당을 해제할 수 있어야 함', () => {
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;
      const team = createTeam({ name: 'Test Team' });

      assignTeamToTask(taskId, team.id);
      const unassigned = unassignTeamFromTask(taskId, team.id);

      expect(unassigned).toBe(true);

      const teams = getTaskTeams(taskId);
      expect(teams).toHaveLength(0);
    });

    it('존재하지 않는 할당 해제 시 false 반환', () => {
      const unassigned = unassignTeamFromTask(9999, 9999);
      expect(unassigned).toBe(false);
    });
  });

  describe('TC-TT03: Task-Team Assignment - getTaskTeams', () => {
    it('태스크에 할당된 팀 목록을 조회할 수 있어야 함', () => {
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;

      const teams = getTaskTeams(taskId);
      expect(teams).toHaveLength(0);
    });

    it('할당 후 팀 목록에 포함되어야 함', () => {
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;
      const team = createTeam({ name: 'Test Team' });

      assignTeamToTask(taskId, team.id);

      const teams = getTaskTeams(taskId);
      expect(teams).toHaveLength(1);
      expect(teams[0].id).toBe(team.id);
    });
  });

  describe('TC-TT04: Task-Team Assignment - getTeamTasks', () => {
    it('팀에 할당된 태스크 목록을 조회할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });

      const tasks = getTeamTasks(team.id);
      expect(tasks).toHaveLength(0);
    });

    it('할당 후 태스크 목록에 포함되어야 함', () => {
      const taskResult = memDb.prepare('INSERT INTO tasks (title) VALUES (?)').run('Test Task');
      const taskId = taskResult.lastInsertRowid as number;
      const team = createTeam({ name: 'Test Team' });

      assignTeamToTask(taskId, team.id, true);

      const tasks = getTeamTasks(team.id);
      expect(tasks).toHaveLength(1);
      expect(tasks[0].task_id).toBe(taskId);
      expect(tasks[0].auto_execute).toBe(true);
    });
  });

  describe('TC-W01: Workload - getTeamWorkload', () => {
    it('팀 워크로드를 조회할 수 있어야 함', () => {
      const team = createTeam({ name: 'Test Team' });
      const persona = getPersonaByType('test-persona')!;
      addAgentToTeam({ team_id: team.id, persona_id: persona.id });

      const workload = getTeamWorkload(team.id);

      expect(workload).toBeDefined();
      expect(workload!.team_id).toBe(team.id);
      expect(workload!.team_name).toBe('Test Team');
      expect(workload!.agents).toHaveLength(1);
      expect(workload!.total_tasks).toBe(0);
    });

    it('존재하지 않는 팀 조회 시 undefined 반환', () => {
      const workload = getTeamWorkload(9999);
      expect(workload).toBeUndefined();
    });
  });

  describe('TC-TMP01: Templates - getTeamTemplates', () => {
    it('팀 템플릿 목록을 조회할 수 있어야 함', () => {
      const templates = getTeamTemplates();

      expect(templates).toBeDefined();
      expect(templates).toHaveLength(1);
      expect(templates[0].id).toBe('feature-development');
      expect(templates[0].name).toBe('Feature Development');
    });
  });
});
