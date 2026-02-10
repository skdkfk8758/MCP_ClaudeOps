import { describe, it, expect, vi, beforeEach } from 'vitest';

const { mockExecSync, mockGetTask, mockUpsertCommit, mockGetTaskCommits } = vi.hoisted(() => ({
  mockExecSync: vi.fn(),
  mockGetTask: vi.fn(),
  mockUpsertCommit: vi.fn(),
  mockGetTaskCommits: vi.fn(),
}));

vi.mock('node:child_process', () => ({
  execSync: (...args: unknown[]) => mockExecSync(...args),
}));

vi.mock('../models/task.js', () => ({
  getTask: (...args: unknown[]) => mockGetTask(...args),
}));

vi.mock('../models/commit-tracker.js', () => ({
  upsertCommit: (...args: unknown[]) => mockUpsertCommit(...args),
  getTaskCommits: (...args: unknown[]) => mockGetTaskCommits(...args),
}));

import { scanTaskCommits, linkCommit, generateBranchName } from './commit-tracker-service.js';

describe('commit-tracker-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('generateBranchName', () => {
    it('영문 제목을 올바른 브랜치명으로 변환', () => {
      const result = generateBranchName(42, 'Add User Authentication');
      expect(result).toBe('task/42-add-user-authentication');
    });

    it('한글 제목은 모두 제거되고 work로 폴백', () => {
      const result = generateBranchName(10, '사용자 인증 추가');
      expect(result).toBe('task/10-work');
    });

    it('긴 제목은 40자로 잘림', () => {
      const longTitle = 'This is a very long title that exceeds forty characters and should be truncated';
      const result = generateBranchName(5, longTitle);
      // 실제 출력: 'task/5-this-is-a-very-long-title-that-exceeds-f'
      expect(result).toBe('task/5-this-is-a-very-long-title-that-exceeds-f');
      expect(result.split('-').slice(1).join('-').length).toBeLessThanOrEqual(40); // slug part ≤ 40
    });

    it('특수문자는 모두 제거됨', () => {
      const result = generateBranchName(1, 'Fix: Bug #123 (urgent!)');
      // 숫자는 제거되지 않음 (regex: [^a-z0-9\s-])
      expect(result).toBe('task/1-fix-bug-123-urgent');
    });

    it('연속된 하이픈은 하나로 치환', () => {
      const result = generateBranchName(3, 'Multiple   Spaces   Here');
      expect(result).toBe('task/3-multiple-spaces-here');
    });

    it('끝에 붙은 하이픈 제거', () => {
      const result = generateBranchName(7, 'Trailing spaces   ');
      expect(result).toBe('task/7-trailing-spaces');
    });

    it('빈 제목은 work로 폴백', () => {
      const result = generateBranchName(99, '');
      expect(result).toBe('task/99-work');
    });

    it('특수문자만 있는 제목은 work로 폴백', () => {
      const result = generateBranchName(15, '!@#$%^&*()');
      expect(result).toBe('task/15-work');
    });
  });

  describe('scanTaskCommits', () => {
    const sampleTask = {
      id: 1,
      title: 'Test Task',
      status: 'implementation' as const,
      branch_name: 'task/1-test',
    };

    // parseGitLog parses blocks separated by \n\n
    const gitLogOutput = (hash: string, message: string, author: string, date: string) =>
      `${hash}|||${message}|||${author}|||${date}\n 1 file changed, 10 insertions(+), 2 deletions(-)`;

    it('태스크를 찾을 수 없으면 예외 발생', () => {
      mockGetTask.mockReturnValue(null);

      expect(() => scanTaskCommits(999, '/fake/path')).toThrow('Task #999 not found');
    });

    it('grep으로 2개의 새 커밋 발견', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([]);

      // parseGitLog splits by \n\n to get blocks
      mockExecSync
        .mockReturnValueOnce(
          gitLogOutput('abc123', '[TASK-1] feat: first commit', 'Author1', '2026-01-01T00:00:00Z') +
          '\n\n' +
          gitLogOutput('def456', '[TASK-1] fix: second commit', 'Author2', '2026-01-02T00:00:00Z')
        )
        .mockReturnValueOnce(''); // branch scan - empty

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(2);
      expect(result.new_commits).toBe(2);
      expect(mockUpsertCommit).toHaveBeenCalledTimes(2);
      expect(mockUpsertCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 1,
          commit_hash: 'abc123',
          commit_message: '[TASK-1] feat: first commit',
        })
      );
    });

    it('grep으로 기존 1개 + 새 1개 발견', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([
        { commit_hash: 'abc123', task_id: 1, commit_message: '[TASK-1] feat: first', author: 'Author1', committed_at: '2026-01-01', files_changed: 1, insertions: 10, deletions: 2, branch_name: null },
      ]);

      mockExecSync
        .mockReturnValueOnce(
          gitLogOutput('abc123', '[TASK-1] feat: first commit', 'Author1', '2026-01-01T00:00:00Z') +
          '\n\n' +
          gitLogOutput('def456', '[TASK-1] fix: second commit', 'Author2', '2026-01-02T00:00:00Z')
        )
        .mockReturnValueOnce('');

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(2);
      expect(result.new_commits).toBe(1);
      expect(mockUpsertCommit).toHaveBeenCalledTimes(1);
      expect(mockUpsertCommit).toHaveBeenCalledWith(
        expect.objectContaining({ commit_hash: 'def456' })
      );
    });

    it('브랜치 폴백으로 추가 커밋 발견', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([]);

      // grep 결과 1개, branch 결과 1개
      mockExecSync
        .mockReturnValueOnce(
          gitLogOutput('abc123', '[TASK-1] feat: grep commit', 'Author1', '2026-01-01T00:00:00Z')
        )
        .mockReturnValueOnce(
          gitLogOutput('abc123', '[TASK-1] feat: grep commit', 'Author1', '2026-01-01T00:00:00Z') +
          '\n\n' +
          gitLogOutput('xyz789', 'branch commit', 'Author3', '2026-01-03T00:00:00Z')
        );

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(3); // 1 from grep + 2 from branch
      expect(result.new_commits).toBe(2); // abc123 and xyz789
      expect(mockUpsertCommit).toHaveBeenCalledTimes(2);
      expect(mockUpsertCommit).toHaveBeenNthCalledWith(1, expect.objectContaining({ commit_hash: 'abc123' }));
      expect(mockUpsertCommit).toHaveBeenNthCalledWith(2, expect.objectContaining({ commit_hash: 'xyz789', branch_name: 'task/1-test' }));
    });

    it('브랜치명이 없으면 브랜치 스캔 건너뜀', () => {
      const taskNoBranch = { ...sampleTask, branch_name: null };
      mockGetTask.mockReturnValue(taskNoBranch);
      mockGetTaskCommits.mockReturnValue([]);

      mockExecSync.mockReturnValueOnce(
        gitLogOutput('abc123', '[TASK-1] feat: only grep', 'Author1', '2026-01-01T00:00:00Z') +
        '\n\n' +
        gitLogOutput('def456', '[TASK-1] feat: second', 'Author2', '2026-01-02T00:00:00Z')
      );

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(2);
      expect(result.new_commits).toBe(2);
      expect(mockExecSync).toHaveBeenCalledTimes(1);
    });

    it('브랜치가 존재하지 않으면 예외를 무시', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([]);

      mockExecSync
        .mockReturnValueOnce(
          gitLogOutput('abc123', '[TASK-1] feat: grep', 'Author1', '2026-01-01T00:00:00Z') +
          '\n\n' +
          gitLogOutput('def456', '[TASK-1] feat: second', 'Author2', '2026-01-02T00:00:00Z')
        )
        .mockImplementationOnce(() => {
          throw new Error('branch not found');
        });

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(2);
      expect(result.new_commits).toBe(2);
    });

    it('grep 결과가 비어있으면 스캔 0개', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockGetTaskCommits.mockReturnValue([]);

      mockExecSync
        .mockReturnValueOnce('')
        .mockReturnValueOnce('');

      const result = scanTaskCommits(1, '/project');

      expect(result.scanned).toBe(0);
      expect(result.new_commits).toBe(0);
      expect(mockUpsertCommit).not.toHaveBeenCalled();
    });
  });

  describe('linkCommit', () => {
    const sampleTask = {
      id: 1,
      title: 'Test Task',
      status: 'implementation' as const,
      branch_name: 'task/1-test',
    };

    const gitShowOutput = `abc123def456
[TASK-1] feat: test commit
Author Name
2026-01-01T00:00:00+09:00

 3 files changed, 50 insertions(+), 10 deletions(-)`;

    it('태스크를 찾을 수 없으면 예외 발생', () => {
      mockGetTask.mockReturnValue(null);

      expect(() => linkCommit(999, 'abc123', '/project')).toThrow('Task #999 not found');
    });

    it('커밋을 찾을 수 없으면 예외 발생', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockExecSync.mockImplementationOnce(() => {
        throw new Error('커밋을 찾을 수 없음');
      });

      expect(() => linkCommit(1, 'invalid', '/project')).toThrow('커밋 invalid를 찾을 수 없습니다.');
    });

    it('성공적으로 커밋 정보를 파싱하고 연결', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockExecSync.mockReturnValueOnce(gitShowOutput);
      mockUpsertCommit.mockReturnValue({
        task_id: 1,
        commit_hash: 'abc123def456',
        commit_message: '[TASK-1] feat: test commit',
        author: 'Author Name',
        committed_at: '2026-01-01T00:00:00+09:00',
        files_changed: 3,
        insertions: 50,
        deletions: 10,
        branch_name: 'task/1-test',
      });

      const result = linkCommit(1, 'abc123def456', '/project');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.stringContaining('git show'),
        expect.objectContaining({ cwd: '/project' })
      );
      expect(mockUpsertCommit).toHaveBeenCalledWith(
        expect.objectContaining({
          task_id: 1,
          commit_hash: 'abc123def456',
          commit_message: '[TASK-1] feat: test commit',
          author: 'Author Name',
          branch_name: 'task/1-test',
        })
      );
      expect(result).toMatchObject({
        task_id: 1,
        commit_hash: 'abc123def456',
      });
    });

    it('execSync 타임아웃 설정 확인', () => {
      mockGetTask.mockReturnValue(sampleTask);
      mockExecSync.mockReturnValueOnce(gitShowOutput);
      mockUpsertCommit.mockReturnValue({
        task_id: 1,
        commit_hash: 'abc123',
        commit_message: 'test',
        author: 'author',
        committed_at: '2026-01-01',
        files_changed: 0,
        insertions: 0,
        deletions: 0,
        branch_name: null,
      });

      linkCommit(1, 'abc123', '/project');

      expect(mockExecSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          timeout: 10_000,
        })
      );
    });

    it('브랜치명이 null이어도 정상 처리', () => {
      const taskNoBranch = { ...sampleTask, branch_name: null };
      mockGetTask.mockReturnValue(taskNoBranch);
      mockExecSync.mockReturnValueOnce(gitShowOutput);
      mockUpsertCommit.mockReturnValue({
        task_id: 1,
        commit_hash: 'abc123def456',
        commit_message: '[TASK-1] feat: test',
        author: 'Author',
        committed_at: '2026-01-01',
        files_changed: 3,
        insertions: 50,
        deletions: 10,
        branch_name: null,
      });

      const result = linkCommit(1, 'abc123def456', '/project');

      expect(mockUpsertCommit).toHaveBeenCalledWith(
        expect.objectContaining({ branch_name: null })
      );
      expect(result.branch_name).toBeNull();
    });
  });
});
