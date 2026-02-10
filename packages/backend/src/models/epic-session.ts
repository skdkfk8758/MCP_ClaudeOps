import { getDb } from '../database/index.js';
import type { EpicSession, EpicSessionStats } from '@claudeops/shared';

/**
 * 에픽에 세션을 연결 (INSERT OR IGNORE — 중복 무시)
 */
export function linkEpicSession(epicId: number, sessionId: string, taskId?: number): boolean {
  const db = getDb();
  const result = db.prepare(
    'INSERT OR IGNORE INTO epic_sessions (epic_id, session_id, task_id) VALUES (?, ?, ?)'
  ).run(epicId, sessionId, taskId ?? null);
  return result.changes > 0;
}

/**
 * 에픽의 세션 목록 조회
 */
export function getEpicSessions(epicId: number): EpicSession[] {
  const db = getDb();
  return db.prepare(
    'SELECT epic_id, session_id, task_id, linked_at FROM epic_sessions WHERE epic_id = ? ORDER BY linked_at DESC'
  ).all(epicId) as EpicSession[];
}

/**
 * 에픽의 세션 통계 (sessions 테이블 JOIN으로 토큰/비용 집계)
 */
export function getEpicSessionStats(epicId: number): EpicSessionStats {
  const db = getDb();

  const sessions = getEpicSessions(epicId);

  // sessions 테이블과 JOIN하여 토큰/비용 집계
  const stats = db.prepare(`
    SELECT
      COALESCE(SUM(s.token_input), 0) as total_token_input,
      COALESCE(SUM(s.token_output), 0) as total_token_output,
      COALESCE(SUM(s.cost_usd), 0) as total_cost_usd
    FROM epic_sessions es
    LEFT JOIN sessions s ON es.session_id = s.id
    WHERE es.epic_id = ?
  `).get(epicId) as { total_token_input: number; total_token_output: number; total_cost_usd: number };

  return {
    epic_id: epicId,
    total_sessions: sessions.length,
    total_token_input: stats.total_token_input,
    total_token_output: stats.total_token_output,
    total_cost_usd: stats.total_cost_usd,
    sessions,
  };
}

/**
 * 태스크 이동 시 세션도 함께 이동
 */
export function moveSessionsToEpic(fromEpicId: number, toEpicId: number, taskId: number): number {
  const db = getDb();
  // 동일 세션이 이미 대상 에픽에 있으면 무시 (UNIQUE 제약)
  const sessions = db.prepare(
    'SELECT session_id FROM epic_sessions WHERE epic_id = ? AND task_id = ?'
  ).all(fromEpicId, taskId) as { session_id: string }[];

  let moved = 0;
  for (const { session_id } of sessions) {
    const result = db.prepare(
      'INSERT OR IGNORE INTO epic_sessions (epic_id, session_id, task_id) VALUES (?, ?, ?)'
    ).run(toEpicId, session_id, taskId);
    if (result.changes > 0) moved++;
  }

  // 원본 에픽에서 해당 태스크의 세션 제거
  db.prepare('DELETE FROM epic_sessions WHERE epic_id = ? AND task_id = ?')
    .run(fromEpicId, taskId);

  return moved;
}
