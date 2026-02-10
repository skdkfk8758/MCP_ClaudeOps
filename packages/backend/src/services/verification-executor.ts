import { execSync } from 'node:child_process';
import { getDb } from '../database/index.js';
import { getTask, moveTask } from '../models/task.js';
import { createExecutionLog, updateExecutionLog } from '../models/task-execution-log.js';
import { wsManager } from './websocket.js';
import type { VerificationCheck, VerificationResult, VerificationStatus } from '@claudeops/shared';

const DEFAULT_CHECKS = [
  { name: 'lint', command: 'pnpm lint' },
  { name: 'typecheck', command: 'pnpm typecheck' },
  { name: 'test', command: 'pnpm test' },
  { name: 'build', command: 'pnpm turbo run build' },
  { name: 'coverage', command: 'pnpm test:coverage' },
];

interface VerificationOptions {
  checks?: string[];
  coverageThreshold?: number;
  skipOnFailure?: boolean;
}

export async function runVerification(
  taskId: number,
  projectPath: string,
  options: VerificationOptions = {}
): Promise<VerificationResult> {
  const db = getDb();
  const task = getTask(taskId);
  if (!task) throw new Error(`Task #${taskId} not found`);

  const coverageThreshold = options.coverageThreshold ?? 80;
  const skipOnFailure = options.skipOnFailure ?? false;
  const selectedChecks = options.checks
    ? DEFAULT_CHECKS.filter(c => options.checks!.includes(c.name))
    : DEFAULT_CHECKS;

  // 상태 업데이트: verification 진입
  db.prepare("UPDATE tasks SET verification_status = 'running', status = 'verification', updated_at = datetime('now') WHERE id = ?")
    .run(taskId);

  // 실행 로그 생성
  const log = createExecutionLog({
    task_id: taskId,
    phase: 'verification',
    agent_type: 'verifier',
    model: 'system',
  });

  const result: VerificationResult = {
    task_id: taskId,
    status: 'running',
    checks: [],
    started_at: new Date().toISOString(),
    completed_at: null,
    overall_pass: false,
  };

  wsManager.notifyVerificationStarted({ task_id: taskId, checks: selectedChecks.map(c => c.name) });

  const startTime = Date.now();
  let allPassed = true;

  for (const checkDef of selectedChecks) {
    const check: VerificationCheck = {
      name: checkDef.name,
      status: 'running',
      command: checkDef.command,
      output: null,
      duration_ms: null,
      exit_code: null,
    };

    wsManager.notifyVerificationProgress({
      task_id: taskId,
      check_name: checkDef.name,
      status: 'running',
    });

    const checkStart = Date.now();

    try {
      const output = execSync(checkDef.command, {
        cwd: projectPath,
        timeout: 120_000,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });
      check.status = 'passed';
      check.output = output.slice(0, 5000);
      check.exit_code = 0;

      // coverage 체크 시 퍼센트 파싱
      if (checkDef.name === 'coverage') {
        const coverageMatch = output.match(/All files[^\n]*?\|\s*([\d.]+)/);
        if (coverageMatch) {
          const pct = parseFloat(coverageMatch[1]);
          result.coverage_percent = pct;
          check.details = { coverage_percent: pct, threshold: coverageThreshold };
          if (pct < coverageThreshold) {
            check.status = 'failed';
            check.details.reason = `커버리지 ${pct}%가 임계값 ${coverageThreshold}% 미만`;
            allPassed = false;
          }
        }
      }
    } catch (err: unknown) {
      check.status = 'failed';
      allPassed = false;
      if (err && typeof err === 'object' && 'status' in err) {
        const execErr = err as { status: number; stdout?: string; stderr?: string };
        check.exit_code = execErr.status;
        check.output = (execErr.stderr || execErr.stdout || '').slice(0, 5000);
      } else {
        check.output = err instanceof Error ? err.message : String(err);
      }
    }

    check.duration_ms = Date.now() - checkStart;
    result.checks.push(check);

    wsManager.notifyVerificationProgress({
      task_id: taskId,
      check_name: checkDef.name,
      status: check.status,
      duration_ms: check.duration_ms,
    });

    // 실패 시 나머지 스킵 옵션
    if (!allPassed && skipOnFailure) {
      // 나머지 체크를 pending으로 추가
      for (const remaining of selectedChecks.slice(result.checks.length)) {
        result.checks.push({
          name: remaining.name,
          status: 'pending',
          command: remaining.command,
          output: null,
          duration_ms: null,
          exit_code: null,
        });
      }
      break;
    }
  }

  const totalDuration = Date.now() - startTime;
  result.completed_at = new Date().toISOString();
  result.overall_pass = allPassed;
  result.status = allPassed ? 'passed' : 'failed';

  // DB 업데이트
  const verificationStatus: VerificationStatus = allPassed ? 'passed' : 'failed';
  db.prepare("UPDATE tasks SET verification_result = ?, verification_status = ?, updated_at = datetime('now') WHERE id = ?")
    .run(JSON.stringify(result), verificationStatus, taskId);

  // 실행 로그 업데이트
  updateExecutionLog(log.id, {
    status: allPassed ? 'completed' : 'failed',
    output_summary: allPassed
      ? `전체 통과 (${result.checks.length}개 체크)`
      : `실패: ${result.checks.filter(c => c.status === 'failed').map(c => c.name).join(', ')}`,
    duration_ms: totalDuration,
    completed_at: result.completed_at,
    error: allPassed ? undefined : result.checks.find(c => c.status === 'failed')?.output?.slice(0, 500),
  });

  // 통과 시 review로 자동 이동
  if (allPassed) {
    try {
      const currentTask = getTask(taskId);
      if (currentTask) {
        const reviewTasks = db.prepare("SELECT COUNT(*) as count FROM tasks WHERE status = 'review'").get() as { count: number };
        moveTask(taskId, { status: 'review', position: reviewTasks.count });
      }
    } catch {
      // review 이동 실패해도 검증 결과는 유지
    }
    wsManager.notifyVerificationCompleted({ task_id: taskId, result });
  } else {
    wsManager.notifyVerificationFailed({ task_id: taskId, result });
  }

  return result;
}

export async function retryVerification(
  taskId: number,
  projectPath: string,
  options: VerificationOptions & { failedOnly?: boolean } = {}
): Promise<VerificationResult> {
  if (options.failedOnly) {
    const task = getTask(taskId);
    if (task?.verification_result) {
      const prev: VerificationResult = JSON.parse(task.verification_result);
      const failedChecks = prev.checks.filter(c => c.status === 'failed').map(c => c.name);
      if (failedChecks.length > 0) {
        return runVerification(taskId, projectPath, { ...options, checks: failedChecks });
      }
    }
  }
  return runVerification(taskId, projectPath, options);
}
