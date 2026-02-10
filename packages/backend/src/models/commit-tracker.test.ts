import { describe, it, expect, beforeEach, vi } from 'vitest';
import Database from 'better-sqlite3';

// Create in-memory DB before mocking
let memDb: Database.Database;

// Mock getDb to return our in-memory database
vi.mock('../database/index.js', () => ({
  getDb: () => memDb,
}));

// Import model functions AFTER the mock
import {
  upsertCommit,
  getTaskCommits,
  getCommitByHash,
  deleteTaskCommit,
} from './commit-tracker.js';
import type { TaskCommit } from '@claudeops/shared';

/**
 * 스키마 초기화 함수
 */
function initSchema(db: Database.Database) {
  db.pragma('foreign_keys = ON');

  // tasks 테이블 (FK 용)
  db.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'backlog',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // task_commits 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS task_commits (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      task_id INTEGER NOT NULL,
      commit_hash TEXT NOT NULL,
      commit_message TEXT NOT NULL,
      author TEXT,
      committed_at TEXT,
      files_changed INTEGER DEFAULT 0,
      insertions INTEGER DEFAULT 0,
      deletions INTEGER DEFAULT 0,
      branch_name TEXT,
      tracked_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(task_id, commit_hash)
    );
  `);
}

describe('CommitTracker Model', () => {
  beforeEach(() => {
    memDb = new Database(':memory:');
    initSchema(memDb);
    // 테스트용 태스크 생성
    memDb.prepare('INSERT INTO tasks (id, title) VALUES (1, ?)').run('Test Task');
  });

  describe('TC-CT01: upsertCommit 생성', () => {
    it('커밋을 생성하고 반환해야 함', () => {
      const commitData: Omit<TaskCommit, 'id' | 'tracked_at'> = {
        task_id: 1,
        commit_hash: 'abc123',
        commit_message: 'feat: add feature',
        author: 'developer1',
        committed_at: '2026-02-10T10:00:00Z',
        files_changed: 3,
        insertions: 50,
        deletions: 10,
        branch_name: 'feature/test',
      };

      const commit = upsertCommit(commitData);

      expect(commit).toBeDefined();
      expect(commit.id).toBeGreaterThan(0);
      expect(commit.task_id).toBe(1);
      expect(commit.commit_hash).toBe('abc123');
      expect(commit.commit_message).toBe('feat: add feature');
      expect(commit.author).toBe('developer1');
      expect(commit.committed_at).toBe('2026-02-10T10:00:00Z');
      expect(commit.files_changed).toBe(3);
      expect(commit.insertions).toBe(50);
      expect(commit.deletions).toBe(10);
      expect(commit.branch_name).toBe('feature/test');
      expect(commit.tracked_at).toBeDefined();
    });
  });

  describe('TC-CT02: upsertCommit 충돌 시 업데이트', () => {
    it('같은 task_id + commit_hash로 upsert 시 업데이트되어야 함', () => {
      const commitData: Omit<TaskCommit, 'id' | 'tracked_at'> = {
        task_id: 1,
        commit_hash: 'abc123',
        commit_message: 'feat: add feature',
        author: 'developer1',
        committed_at: '2026-02-10T10:00:00Z',
        files_changed: 3,
        insertions: 50,
        deletions: 10,
        branch_name: 'feature/test',
      };

      const firstCommit = upsertCommit(commitData);
      const firstId = firstCommit.id;

      // 같은 task_id + commit_hash로 다시 upsert (메시지 변경)
      const updatedData: Omit<TaskCommit, 'id' | 'tracked_at'> = {
        ...commitData,
        commit_message: 'feat: update feature',
        files_changed: 5,
        insertions: 80,
        deletions: 20,
      };

      const secondCommit = upsertCommit(updatedData);

      // ID는 동일해야 함 (UPDATE 됨)
      expect(secondCommit.id).toBe(firstId);
      expect(secondCommit.commit_message).toBe('feat: update feature');
      expect(secondCommit.files_changed).toBe(5);
      expect(secondCommit.insertions).toBe(80);
      expect(secondCommit.deletions).toBe(20);
    });
  });

  describe('TC-CT03: getTaskCommits 정렬 순서', () => {
    it('committed_at DESC 순서로 반환되어야 함', () => {
      memDb.prepare('INSERT INTO tasks (id, title) VALUES (2, ?)').run('Task with commits');

      upsertCommit({
        task_id: 2,
        commit_hash: 'commit1',
        commit_message: 'First commit',
        author: 'dev1',
        committed_at: '2026-02-10T10:00:00Z',
        files_changed: 1,
        insertions: 10,
        deletions: 0,
        branch_name: 'main',
      });

      upsertCommit({
        task_id: 2,
        commit_hash: 'commit2',
        commit_message: 'Second commit',
        author: 'dev1',
        committed_at: '2026-02-10T11:00:00Z',
        files_changed: 2,
        insertions: 20,
        deletions: 5,
        branch_name: 'main',
      });

      upsertCommit({
        task_id: 2,
        commit_hash: 'commit3',
        commit_message: 'Third commit',
        author: 'dev2',
        committed_at: '2026-02-10T12:00:00Z',
        files_changed: 3,
        insertions: 30,
        deletions: 10,
        branch_name: 'main',
      });

      const commits = getTaskCommits(2);

      expect(commits).toHaveLength(3);
      // 가장 최근 커밋이 먼저 와야 함
      expect(commits[0].commit_hash).toBe('commit3');
      expect(commits[1].commit_hash).toBe('commit2');
      expect(commits[2].commit_hash).toBe('commit1');
    });
  });

  describe('TC-CT04: getTaskCommits 빈 배열', () => {
    it('알 수 없는 task_id로 조회 시 빈 배열을 반환해야 함', () => {
      const commits = getTaskCommits(9999);
      expect(commits).toEqual([]);
    });
  });

  describe('TC-CT05: getCommitByHash', () => {
    it('커밋을 해시로 조회할 수 있어야 함', () => {
      upsertCommit({
        task_id: 1,
        commit_hash: 'abc123',
        commit_message: 'Test commit',
        author: 'dev1',
        committed_at: '2026-02-10T10:00:00Z',
        files_changed: 1,
        insertions: 10,
        deletions: 0,
        branch_name: 'main',
      });

      const commit = getCommitByHash(1, 'abc123');

      expect(commit).toBeDefined();
      expect(commit!.commit_hash).toBe('abc123');
      expect(commit!.task_id).toBe(1);
    });

    it('존재하지 않는 해시로 조회 시 undefined를 반환해야 함', () => {
      const commit = getCommitByHash(1, 'nonexistent');
      expect(commit).toBeUndefined();
    });

    it('존재하지 않는 task_id로 조회 시 undefined를 반환해야 함', () => {
      const commit = getCommitByHash(9999, 'abc123');
      expect(commit).toBeUndefined();
    });
  });

  describe('TC-CT06: deleteTaskCommit', () => {
    it('커밋 삭제 시 true를 반환해야 함', () => {
      const commit = upsertCommit({
        task_id: 1,
        commit_hash: 'delete-test',
        commit_message: 'To be deleted',
        author: 'dev1',
        committed_at: '2026-02-10T10:00:00Z',
        files_changed: 1,
        insertions: 10,
        deletions: 0,
        branch_name: 'main',
      });

      const deleted = deleteTaskCommit(commit.id);

      expect(deleted).toBe(true);
      expect(getCommitByHash(1, 'delete-test')).toBeUndefined();
    });

    it('알 수 없는 id로 삭제 시 false를 반환해야 함', () => {
      const deleted = deleteTaskCommit(9999);
      expect(deleted).toBe(false);
    });
  });
});
