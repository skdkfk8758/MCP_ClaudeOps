import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';
import type { PrdCreate, PrdUpdate } from '@claudeops/shared';

// in-memory DB 변수 선언
let memDb: Database.Database;

// getDb를 memDb로 모킹
vi.mock('../database/index.js', () => ({
  getDb: () => memDb,
}));

// 모킹 후 import
const { createPrd, getPrd, updatePrd, deletePrd, listPrds } = await import('./prd.js');

/**
 * 테스트용 스키마 초기화 함수
 */
function initSchema(db: Database.Database) {
  // config 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // prds 테이블
  db.exec(`
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
      project_path TEXT,
      github_issue_url TEXT,
      github_issue_number INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // epics 테이블 (FK 관계 테스트용)
  db.exec(`
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
  `);

  // tasks 테이블 (스키마 완성도)
  db.exec(`
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
  `);
}

describe('prd model', () => {
  beforeEach(() => {
    // 매 테스트마다 새로운 in-memory DB 생성
    memDb = new Database(':memory:');
    memDb.pragma('foreign_keys = ON');
    initSchema(memDb);
  });

  describe('TC-P01: createPrd 기본 생성', () => {
    it('title만으로 PRD 생성 시 기본값 확인', () => {
      const data: PrdCreate = { title: '기본 PRD' };
      const prd = createPrd(data);

      expect(prd).toBeDefined();
      expect(prd.id).toBe(1);
      expect(prd.title).toBe('기본 PRD');
      expect(prd.status).toBe('backlog');
      expect(prd.epic_count).toBe(0);
      expect(prd.description).toBeNull();
      expect(prd.vision).toBeNull();
      expect(prd.user_stories).toBeNull();
      expect(prd.success_criteria).toBeNull();
      expect(prd.constraints).toBeNull();
      expect(prd.out_of_scope).toBeNull();
      expect(prd.github_issue_url).toBeNull();
      expect(prd.github_issue_number).toBeNull();
      expect(prd.created_at).toBeTruthy();
      expect(prd.updated_at).toBeTruthy();
    });
  });

  describe('TC-P02: createPrd with JSON fields', () => {
    it('user_stories와 success_criteria 배열이 올바르게 저장되고 파싱됨', () => {
      const data: PrdCreate = {
        title: 'JSON 필드 테스트 PRD',
        description: 'JSON 배열 테스트',
        user_stories: [
          '사용자로서 X를 하고 싶다',
          '사용자로서 Y를 하고 싶다',
        ],
        success_criteria: [
          '목표 A 달성',
          '목표 B 달성',
        ],
      };

      const prd = createPrd(data);

      expect(prd.user_stories).toEqual(data.user_stories);
      expect(prd.success_criteria).toEqual(data.success_criteria);

      // getPrd로 재조회해도 배열로 올바르게 파싱되는지 확인
      const retrieved = getPrd(prd.id);
      expect(retrieved).toBeDefined();
      expect(retrieved!.user_stories).toEqual(data.user_stories);
      expect(retrieved!.success_criteria).toEqual(data.success_criteria);
    });

    it('빈 배열도 올바르게 처리됨', () => {
      const data: PrdCreate = {
        title: '빈 배열 PRD',
        user_stories: [],
        success_criteria: [],
      };

      const prd = createPrd(data);

      expect(prd.user_stories).toEqual([]);
      expect(prd.success_criteria).toEqual([]);
    });
  });

  describe('TC-P03: updatePrd', () => {
    it('제목, 설명, 상태 변경이 올바르게 반영됨', () => {
      const created = createPrd({ title: '원본 제목' });

      const update: PrdUpdate = {
        title: '변경된 제목',
        description: '새 설명',
        status: 'active',
      };

      const updated = updatePrd(created.id, update);

      expect(updated).toBeDefined();
      expect(updated!.title).toBe('변경된 제목');
      expect(updated!.description).toBe('새 설명');
      expect(updated!.status).toBe('active');
    });

    it('user_stories와 success_criteria 배열 업데이트', () => {
      const created = createPrd({
        title: 'PRD with stories',
        user_stories: ['초기 스토리 1'],
        success_criteria: ['초기 기준 1'],
      });

      const update: PrdUpdate = {
        user_stories: ['업데이트된 스토리 1', '업데이트된 스토리 2'],
        success_criteria: ['업데이트된 기준 1', '업데이트된 기준 2', '업데이트된 기준 3'],
      };

      const updated = updatePrd(created.id, update);

      expect(updated!.user_stories).toEqual(update.user_stories);
      expect(updated!.success_criteria).toEqual(update.success_criteria);
      expect(updated!.title).toBe(created.title); // 미변경 필드 유지 확인
    });

    it('미변경 필드는 유지됨', () => {
      const created = createPrd({
        title: '원본 PRD',
        description: '원본 설명',
        vision: '원본 비전',
      });

      const update: PrdUpdate = {
        description: '변경된 설명',
      };

      const updated = updatePrd(created.id, update);

      expect(updated!.title).toBe('원본 PRD');
      expect(updated!.description).toBe('변경된 설명');
      expect(updated!.vision).toBe('원본 비전');
    });

    it('존재하지 않는 ID 업데이트 시 undefined 반환', () => {
      const result = updatePrd(9999, { title: '존재하지 않음' });
      expect(result).toBeUndefined();
    });
  });

  describe('TC-P04: deletePrd', () => {
    it('PRD 삭제 후 조회 시 undefined 반환', () => {
      const created = createPrd({ title: '삭제될 PRD' });
      expect(getPrd(created.id)).toBeDefined();

      const deleted = deletePrd(created.id);
      expect(deleted).toBe(true);

      const retrieved = getPrd(created.id);
      expect(retrieved).toBeUndefined();
    });

    it('존재하지 않는 ID 삭제 시 false 반환', () => {
      const result = deletePrd(9999);
      expect(result).toBe(false);
    });
  });

  describe('TC-P05: deletePrd → epics.prd_id ON DELETE SET NULL', () => {
    it('PRD 삭제 시 연결된 Epic의 prd_id가 NULL로 설정됨', () => {
      // PRD 생성
      const prd = createPrd({ title: 'PRD with Epics' });

      // Epic 생성 (prd_id 연결)
      const insertEpic = memDb.prepare(`
        INSERT INTO epics (prd_id, title) VALUES (?, ?)
      `);
      insertEpic.run(prd.id, 'Epic 1');
      insertEpic.run(prd.id, 'Epic 2');

      // Epic 존재 확인
      const epicsBefore = memDb.prepare(`
        SELECT id, prd_id FROM epics WHERE prd_id = ?
      `).all(prd.id);
      expect(epicsBefore).toHaveLength(2);

      // PRD 삭제
      const deleted = deletePrd(prd.id);
      expect(deleted).toBe(true);

      // Epic은 여전히 존재하지만 prd_id는 NULL
      const epicsAfter = memDb.prepare(`
        SELECT id, prd_id FROM epics WHERE id IN (?, ?)
      `).all((epicsBefore[0] as any).id, (epicsBefore[1] as any).id) as any[];

      expect(epicsAfter).toHaveLength(2);
      expect(epicsAfter[0].prd_id).toBeNull();
      expect(epicsAfter[1].prd_id).toBeNull();
    });
  });

  describe('TC-P06: listPrds 페이지네이션 + 필터링', () => {
    beforeEach(() => {
      // 다양한 status의 PRD 생성 (PrdCreate에 status 없으므로 updatePrd 사용)
      createPrd({ title: 'PRD 1' }); // backlog (기본값)
      createPrd({ title: 'PRD 2' }); // backlog (기본값)
      const prd3 = createPrd({ title: 'PRD 3' });
      updatePrd(prd3.id, { status: 'active' });
      const prd4 = createPrd({ title: 'PRD 4' });
      updatePrd(prd4.id, { status: 'active' });
      const prd5 = createPrd({ title: 'PRD 5' });
      updatePrd(prd5.id, { status: 'completed' });
      const prd6 = createPrd({ title: 'PRD 6' });
      updatePrd(prd6.id, { status: 'completed' });
      const prd7 = createPrd({ title: 'PRD 7' });
      updatePrd(prd7.id, { status: 'completed' });
    });

    it('전체 PRD 목록 조회', () => {
      const result = listPrds({});

      expect(result.items).toHaveLength(7);
      expect(result.total).toBe(7);
      expect(result.page).toBe(1);
      expect(result.page_size).toBe(50);
    });

    it('status 필터링', () => {
      const backlog = listPrds({ status: 'backlog' });
      expect(backlog.items).toHaveLength(2);
      expect(backlog.total).toBe(2);
      expect(backlog.items.every(p => p.status === 'backlog')).toBe(true);

      const active = listPrds({ status: 'active' });
      expect(active.items).toHaveLength(2);
      expect(active.total).toBe(2);

      const completed = listPrds({ status: 'completed' });
      expect(completed.items).toHaveLength(3);
      expect(completed.total).toBe(3);
    });

    it('페이지네이션', () => {
      const page1 = listPrds({ page: 1, page_size: 3 });
      expect(page1.items).toHaveLength(3);
      expect(page1.total).toBe(7);
      expect(page1.page).toBe(1);
      expect(page1.page_size).toBe(3);

      const page2 = listPrds({ page: 2, page_size: 3 });
      expect(page2.items).toHaveLength(3);
      expect(page2.total).toBe(7);
      expect(page2.page).toBe(2);

      const page3 = listPrds({ page: 3, page_size: 3 });
      expect(page3.items).toHaveLength(1);
      expect(page3.total).toBe(7);
      expect(page3.page).toBe(3);
    });

    it('빈 결과 확인', () => {
      const result = listPrds({ status: 'archived' });
      expect(result.items).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  describe('TC-P07: enrichPrd epic_count 정확성', () => {
    it('연결된 Epic 개수가 올바르게 집계됨', () => {
      // PRD 생성
      const prd = createPrd({ title: 'PRD with Epic Count' });

      // 초기 epic_count는 0
      expect(prd.epic_count).toBe(0);

      // Epic 3개 연결
      const insertEpic = memDb.prepare(`
        INSERT INTO epics (prd_id, title) VALUES (?, ?)
      `);
      insertEpic.run(prd.id, 'Epic A');
      insertEpic.run(prd.id, 'Epic B');
      const epicC = insertEpic.run(prd.id, 'Epic C');

      // 재조회 시 epic_count = 3
      const retrieved = getPrd(prd.id);
      expect(retrieved!.epic_count).toBe(3);

      // Epic 1개 삭제
      memDb.prepare(`DELETE FROM epics WHERE id = ?`).run(epicC.lastInsertRowid);

      // 재조회 시 epic_count = 2
      const afterDelete = getPrd(prd.id);
      expect(afterDelete!.epic_count).toBe(2);
    });

    it('listPrds에서도 epic_count가 정확함', () => {
      const prd1 = createPrd({ title: 'PRD 1' });
      const prd2 = createPrd({ title: 'PRD 2' });

      // prd1에 Epic 2개
      const insertEpic = memDb.prepare(`
        INSERT INTO epics (prd_id, title) VALUES (?, ?)
      `);
      insertEpic.run(prd1.id, 'Epic 1-1');
      insertEpic.run(prd1.id, 'Epic 1-2');

      // prd2에 Epic 1개
      insertEpic.run(prd2.id, 'Epic 2-1');

      const list = listPrds({});
      const listedPrd1 = list.items.find(p => p.id === prd1.id);
      const listedPrd2 = list.items.find(p => p.id === prd2.id);

      expect(listedPrd1!.epic_count).toBe(2);
      expect(listedPrd2!.epic_count).toBe(1);
    });
  });

  describe('TC-P08: createPrd + updatePrd + getPrd 전체 필드', () => {
    it('모든 필드가 올바르게 저장되고 조회됨', () => {
      // PrdCreate에 포함되는 필드
      const data: PrdCreate = {
        title: '완전한 PRD',
        description: '상세 설명',
        vision: '제품 비전',
        user_stories: [
          '사용자는 로그인할 수 있다',
          '사용자는 프로필을 수정할 수 있다',
        ],
        success_criteria: [
          '로그인 성공률 95% 이상',
          '프로필 수정 완료율 90% 이상',
        ],
        constraints: '3개월 내 출시',
        out_of_scope: 'AI 기능은 제외',
      };

      const created = createPrd(data);

      // 생성 직후 status는 기본값 'backlog'
      expect(created.status).toBe('backlog');

      // updatePrd로 status 및 github 정보 설정
      const updated = updatePrd(created.id, {
        status: 'active',
      });

      expect(updated).toBeDefined();
      expect(updated!.title).toBe(data.title);
      expect(updated!.description).toBe(data.description);
      expect(updated!.status).toBe('active');
      expect(updated!.vision).toBe(data.vision);
      expect(updated!.user_stories).toEqual(data.user_stories);
      expect(updated!.success_criteria).toEqual(data.success_criteria);
      expect(updated!.constraints).toBe(data.constraints);
      expect(updated!.out_of_scope).toBe(data.out_of_scope);
      expect(updated!.epic_count).toBe(0);
      expect(updated!.created_at).toBeTruthy();
      expect(updated!.updated_at).toBeTruthy();

      // getPrd로 재조회 시 동일한 값 확인
      const retrieved = getPrd(created.id);

      expect(retrieved).toBeDefined();
      expect(retrieved!.title).toBe(data.title);
      expect(retrieved!.description).toBe(data.description);
      expect(retrieved!.status).toBe('active');
      expect(retrieved!.vision).toBe(data.vision);
      expect(retrieved!.user_stories).toEqual(data.user_stories);
      expect(retrieved!.success_criteria).toEqual(data.success_criteria);
      expect(retrieved!.constraints).toBe(data.constraints);
      expect(retrieved!.out_of_scope).toBe(data.out_of_scope);
      expect(retrieved!.epic_count).toBe(0);
    });
  });
});
