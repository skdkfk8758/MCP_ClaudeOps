import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// In-memory DB를 먼저 생성
let memDb: Database.Database;

// Database mock을 임포트 전에 설정
vi.mock('../database/index.js', () => ({
  getDb: () => memDb,
}));

// Mock 설정 후 모델 함수들 임포트
import {
  createEpic,
  getEpic,
  updateEpic,
  deleteEpic,
  listEpics,
  recalcEpicProgress,
} from './epic.js';
import { createTask } from './task.js';

/**
 * 모든 필요한 테이블을 생성하는 스키마 초기화 함수
 * Epic 모델이 의존하는 모든 테이블을 포함해야 함
 */
function initSchema(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS prds (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      vision TEXT,
      user_stories TEXT,
      success_criteria TEXT,
      constraints TEXT,
      out_of_scope TEXT,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS epics (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      prd_id INTEGER REFERENCES prds(id) ON DELETE SET NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      progress INTEGER NOT NULL DEFAULT 0,
      architecture_notes TEXT,
      tech_approach TEXT,
      estimated_effort TEXT,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      branch_name TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'backlog',
      priority TEXT NOT NULL DEFAULT 'P2',
      assignee TEXT,
      due_date TEXT,
      estimated_effort TEXT,
      position INTEGER NOT NULL DEFAULT 0,
      epic_id INTEGER REFERENCES epics(id) ON DELETE SET NULL,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      branch_name TEXT,
      execution_status TEXT,
      last_execution_at TEXT,
      execution_session_id TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      completed_at TEXT
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      project_path TEXT,
      start_time TEXT NOT NULL DEFAULT (datetime('now')),
      end_time TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      summary TEXT,
      token_input INTEGER DEFAULT 0,
      token_output INTEGER DEFAULT 0,
      cost_usd REAL DEFAULT 0.0,
      metadata TEXT
    );

    CREATE TABLE IF NOT EXISTS teams (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT,
      avatar_color TEXT DEFAULT '#6366f1',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS team_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      team_id INTEGER NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      role TEXT NOT NULL DEFAULT 'member',
      email TEXT,
      avatar_url TEXT,
      status TEXT NOT NULL DEFAULT 'active',
      specialties TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(team_id, name)
    );

    CREATE TABLE IF NOT EXISTS task_labels (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      label TEXT NOT NULL,
      UNIQUE(task_id, label)
    );

    CREATE TABLE IF NOT EXISTS task_dependencies (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      blocks_task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      UNIQUE(task_id, blocks_task_id)
    );

    CREATE TABLE IF NOT EXISTS task_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      field_name TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      changed_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS task_sessions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
      linked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, session_id)
    );

    CREATE TABLE IF NOT EXISTS task_assignees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL REFERENCES tasks(id) ON DELETE CASCADE,
      member_id INTEGER NOT NULL REFERENCES team_members(id) ON DELETE CASCADE,
      assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, member_id)
    );
  `);
}

describe('Epic Model', () => {
  beforeEach(() => {
    // 각 테스트마다 새로운 in-memory DB 생성
    memDb = new Database(':memory:');
    memDb.pragma('foreign_keys = ON');
    initSchema(memDb);
  });

  describe('TC-E01: createEpic 기본 생성', () => {
    it('title만으로 Epic을 생성하고 기본값을 확인한다', () => {
      const epic = createEpic({ title: 'Test Epic' });

      expect(epic.id).toBeTypeOf('number');
      expect(epic.title).toBe('Test Epic');
      expect(epic.status).toBe('backlog');
      expect(epic.progress).toBe(0);
      expect(epic.task_count).toBe(0);
      expect(epic.completed_count).toBe(0);
      expect(epic.created_at).toBeTruthy();
      expect(epic.updated_at).toBeTruthy();
    });

    it('전체 필드를 포함하여 Epic을 생성한다', () => {
      const epic = createEpic({
        title: 'Complex Epic',
        description: 'Epic description',
        architecture_notes: 'Use microservices',
        tech_approach: 'Node.js + React',
        estimated_effort: '2 weeks',
      });

      expect(epic.title).toBe('Complex Epic');
      expect(epic.description).toBe('Epic description');
      expect(epic.architecture_notes).toBe('Use microservices');
      expect(epic.tech_approach).toBe('Node.js + React');
      expect(epic.estimated_effort).toBe('2 weeks');
    });
  });

  describe('TC-E02: createEpic with prd_id', () => {
    it('PRD와 연결하여 Epic을 생성한다', () => {
      // PRD 먼저 생성
      const prdResult = memDb
        .prepare('INSERT INTO prds (title) VALUES (?)')
        .run('Test PRD');
      const prdId = prdResult.lastInsertRowid as number;

      const epic = createEpic({
        title: 'Epic with PRD',
        prd_id: prdId,
      });

      expect(epic.prd_id).toBe(prdId);
      expect(epic.title).toBe('Epic with PRD');
    });
  });

  describe('TC-E03: getEpic 존재하지 않는 ID', () => {
    it('존재하지 않는 Epic ID로 조회 시 undefined를 반환한다', () => {
      const epic = getEpic(99999);
      expect(epic).toBeUndefined();
    });
  });

  describe('TC-E04: updateEpic 기본 업데이트', () => {
    it('Epic의 필드들을 업데이트하고 미변경 필드는 유지한다', () => {
      const epic = createEpic({
        title: 'Original Title',
        description: 'Original Description',
        status: 'backlog',
        architecture_notes: 'Original Notes',
      });

      const updated = updateEpic(epic.id, {
        title: 'Updated Title',
        status: 'in_progress',
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('Updated Title');
      expect(updated!.status).toBe('in_progress');
      expect(updated!.description).toBe('Original Description');
      expect(updated!.architecture_notes).toBe('Original Notes');
    });

    it('progress 필드를 업데이트한다', () => {
      const epic = createEpic({ title: 'Epic' });

      const updated = updateEpic(epic.id, { progress: 50 });

      expect(updated!.progress).toBe(50);
    });

    it('prd_id를 업데이트한다', () => {
      const epic = createEpic({ title: 'Epic' });
      const prdResult = memDb
        .prepare('INSERT INTO prds (title) VALUES (?)')
        .run('New PRD');
      const prdId = prdResult.lastInsertRowid as number;

      const updated = updateEpic(epic.id, { prd_id: prdId });

      expect(updated!.prd_id).toBe(prdId);
    });
  });

  describe('TC-E05: deleteEpic', () => {
    it('Epic을 삭제하면 조회 시 undefined를 반환한다', () => {
      const epic = createEpic({ title: 'Epic to Delete' });

      const deleted = deleteEpic(epic.id);
      expect(deleted).toBe(true);

      const found = getEpic(epic.id);
      expect(found).toBeUndefined();
    });

    it('존재하지 않는 Epic 삭제 시 false를 반환한다', () => {
      const deleted = deleteEpic(99999);
      expect(deleted).toBe(false);
    });
  });

  describe('TC-E06: deleteEpic → tasks.epic_id ON DELETE SET NULL', () => {
    it('Epic 삭제 시 연결된 Task의 epic_id가 null이 된다', () => {
      const epic = createEpic({ title: 'Epic with Tasks' });

      const task = createTask({
        title: 'Task under Epic',
        epic_id: epic.id,
      });

      expect(task.epic_id).toBe(epic.id);

      deleteEpic(epic.id);

      // Task는 여전히 존재하고 epic_id가 null
      const taskRow = memDb
        .prepare('SELECT * FROM tasks WHERE id = ?')
        .get(task.id) as any;

      expect(taskRow).toBeDefined();
      expect(taskRow.epic_id).toBeNull();
    });
  });

  describe('TC-E07: listEpics 페이지네이션 + 필터링', () => {
    let prd1Id: number;
    let prd2Id: number;

    beforeEach(() => {
      // PRD 2개 생성
      const prd1Result = memDb
        .prepare('INSERT INTO prds (title) VALUES (?)')
        .run('PRD 1');
      const prd2Result = memDb
        .prepare('INSERT INTO prds (title) VALUES (?)')
        .run('PRD 2');
      prd1Id = prd1Result.lastInsertRowid as number;
      prd2Id = prd2Result.lastInsertRowid as number;

      // Epic 5개 생성 (다양한 prd_id, status)
      const epic1 = createEpic({ title: 'Epic 1', prd_id: prd1Id });
      // Epic 1은 기본 backlog 상태 유지

      const epic2 = createEpic({ title: 'Epic 2', prd_id: prd1Id });
      updateEpic(epic2.id, { status: 'in_progress' });

      const epic3 = createEpic({ title: 'Epic 3', prd_id: prd2Id });
      // Epic 3은 기본 backlog 상태 유지

      const epic4 = createEpic({ title: 'Epic 4', prd_id: prd2Id });
      updateEpic(epic4.id, { status: 'completed' });

      createEpic({ title: 'Epic 5' }); // prd_id 없음, 기본 backlog 상태
    });

    it('모든 Epic을 조회한다', () => {
      const result = listEpics({});

      expect(result.items).toHaveLength(5);
      expect(result.total).toBe(5);
      expect(result.page).toBe(1);
    });

    it('prd_id로 필터링한다', () => {
      const result = listEpics({ prd_id: prd1Id });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.items.every((e) => e.prd_id === prd1Id)).toBe(true);
    });

    it('status로 필터링한다', () => {
      const result = listEpics({ status: 'backlog' });

      expect(result.items).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.items.every((e) => e.status === 'backlog')).toBe(true);
    });

    it('페이지네이션이 올바르게 동작한다', () => {
      const page1 = listEpics({ page: 1, page_size: 2 });
      expect(page1.items).toHaveLength(2);
      expect(page1.total).toBe(5);
      expect(page1.page).toBe(1);
      expect(page1.page_size).toBe(2);

      const page2 = listEpics({ page: 2, page_size: 2 });
      expect(page2.items).toHaveLength(2);
      expect(page2.page).toBe(2);

      const page3 = listEpics({ page: 3, page_size: 2 });
      expect(page3.items).toHaveLength(1);
      expect(page3.page).toBe(3);
    });

    it('prd_id와 status를 동시에 필터링한다', () => {
      const result = listEpics({ prd_id: prd2Id, status: 'backlog' });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].title).toBe('Epic 3');
    });
  });

  describe('TC-E08: recalcEpicProgress 자동 계산', () => {
    it('Task 진행 상황에 따라 progress를 자동 계산한다', () => {
      const epic = createEpic({ title: 'Epic with Progress' });

      // Task 3개 생성
      const task1 = createTask({ title: 'Task 1', epic_id: epic.id });
      const task2 = createTask({ title: 'Task 2', epic_id: epic.id });
      const task3 = createTask({ title: 'Task 3', epic_id: epic.id });

      // Task 0개 done → progress=0
      recalcEpicProgress(epic.id);
      let updated = getEpic(epic.id)!;
      expect(updated.progress).toBe(0);
      expect(updated.status).toBe('backlog');

      // Task 1개 done → progress=33
      memDb
        .prepare('UPDATE tasks SET status = ? WHERE id = ?')
        .run('done', task1.id);
      recalcEpicProgress(epic.id);
      updated = getEpic(epic.id)!;
      expect(updated.progress).toBe(33); // Math.round(1/3 * 100)
      expect(updated.status).toBe('backlog');

      // Task 2개 done → progress=67
      memDb
        .prepare('UPDATE tasks SET status = ? WHERE id = ?')
        .run('done', task2.id);
      recalcEpicProgress(epic.id);
      updated = getEpic(epic.id)!;
      expect(updated.progress).toBe(67); // Math.round(2/3 * 100)

      // Task 3개 done → progress=100, status='completed'
      memDb
        .prepare('UPDATE tasks SET status = ? WHERE id = ?')
        .run('done', task3.id);
      recalcEpicProgress(epic.id);
      updated = getEpic(epic.id)!;
      expect(updated.progress).toBe(100);
      expect(updated.status).toBe('completed');
    });
  });

  describe('TC-E09: recalcEpicProgress 자식 Task 없는 경우', () => {
    it('Task가 없는 Epic의 progress는 0이다', () => {
      const epic = createEpic({ title: 'Epic without Tasks' });

      recalcEpicProgress(epic.id);

      const updated = getEpic(epic.id)!;
      expect(updated.progress).toBe(0);
      expect(updated.task_count).toBe(0);
      expect(updated.completed_count).toBe(0);
    });
  });

  describe('TC-E10: enrichEpic task_count/completed_count 정확성', () => {
    it('getEpic이 올바른 task_count와 completed_count를 반환한다', () => {
      const epic = createEpic({ title: 'Epic with Mixed Tasks' });

      // Task 5개 생성 (2개 done, 3개 진행중)
      createTask({ title: 'Task 1', epic_id: epic.id, status: 'done' });
      createTask({ title: 'Task 2', epic_id: epic.id, status: 'done' });
      createTask({ title: 'Task 3', epic_id: epic.id, status: 'in_progress' });
      createTask({ title: 'Task 4', epic_id: epic.id, status: 'backlog' });
      createTask({ title: 'Task 5', epic_id: epic.id, status: 'in_progress' });

      const enriched = getEpic(epic.id)!;

      expect(enriched.task_count).toBe(5);
      expect(enriched.completed_count).toBe(2);
    });

    it('listEpics가 올바른 task_count와 completed_count를 반환한다', () => {
      const epic1 = createEpic({ title: 'Epic 1' });
      const epic2 = createEpic({ title: 'Epic 2' });

      // Epic 1: 3 tasks, 1 done
      createTask({ title: 'E1 Task 1', epic_id: epic1.id, status: 'done' });
      createTask({ title: 'E1 Task 2', epic_id: epic1.id });
      createTask({ title: 'E1 Task 3', epic_id: epic1.id });

      // Epic 2: 2 tasks, 2 done
      createTask({ title: 'E2 Task 1', epic_id: epic2.id, status: 'done' });
      createTask({ title: 'E2 Task 2', epic_id: epic2.id, status: 'done' });

      const result = listEpics({});

      const enrichedEpic1 = result.items.find((e) => e.id === epic1.id)!;
      const enrichedEpic2 = result.items.find((e) => e.id === epic2.id)!;

      expect(enrichedEpic1.task_count).toBe(3);
      expect(enrichedEpic1.completed_count).toBe(1);

      expect(enrichedEpic2.task_count).toBe(2);
      expect(enrichedEpic2.completed_count).toBe(2);
    });
  });

  describe('TC-E11: PRD 삭제 시 Epic.prd_id ON DELETE SET NULL', () => {
    it('PRD 삭제 시 연결된 Epic의 prd_id가 null이 된다', () => {
      // PRD 생성
      const prdResult = memDb
        .prepare('INSERT INTO prds (title) VALUES (?)')
        .run('PRD to Delete');
      const prdId = prdResult.lastInsertRowid as number;

      // Epic 생성 (prd_id 연결)
      const epic = createEpic({
        title: 'Epic connected to PRD',
        prd_id: prdId,
      });

      expect(epic.prd_id).toBe(prdId);

      // PRD 삭제
      memDb.prepare('DELETE FROM prds WHERE id = ?').run(prdId);

      // Epic는 여전히 존재하고 prd_id가 null
      const updated = getEpic(epic.id)!;
      expect(updated).toBeDefined();
      expect(updated.prd_id).toBeNull();
    });
  });
});
