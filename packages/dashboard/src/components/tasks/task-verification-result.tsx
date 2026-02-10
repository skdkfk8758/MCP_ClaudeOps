'use client';

import { useState } from 'react';
import type { Task, VerificationResult, VerificationCheck } from '@claudeops/shared';
import { useVerificationResult, useRunVerification, useRetryVerification } from '@/lib/hooks/use-tasks';
import { CheckCircle2, XCircle, Loader2, Clock, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';

const CHECK_ICONS: Record<string, string> = {
  passed: '✅', failed: '❌', running: '🔄', pending: '⏳',
};

function CheckItem({ check }: { check: VerificationCheck }) {
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="border border-border rounded-md">
      <button
        onClick={() => check.output && setExpanded(!expanded)}
        className="cursor-pointer w-full flex items-center gap-3 px-3 py-2 text-sm hover:bg-accent/50 transition-colors"
      >
        <span>{CHECK_ICONS[check.status] || '⏳'}</span>
        <span className="font-medium flex-1 text-left">{check.name}</span>
        {check.duration_ms != null && (
          <span className="text-xs text-muted-foreground">{(check.duration_ms / 1000).toFixed(1)}s</span>
        )}
        {check.output && (expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />)}
      </button>
      {expanded && check.output && (
        <pre className="px-3 py-2 text-xs bg-muted/50 border-t border-border overflow-x-auto max-h-48 overflow-y-auto whitespace-pre-wrap">{check.output}</pre>
      )}
    </div>
  );
}

export function TaskVerificationResult({ task, projectPath }: { task: Task; projectPath: string }) {
  const { data } = useVerificationResult(task.id);
  const runVerify = useRunVerification();
  const retryVerify = useRetryVerification();

  const result: VerificationResult | null = data?.result ?? (task.verification_result ? JSON.parse(task.verification_result) : null);
  const status = data?.status ?? task.verification_status;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          {status === 'passed' && <CheckCircle2 className="h-4 w-4 text-green-500" />}
          {status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
          {status === 'running' && <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />}
          {(!status || status === 'pending') && <Clock className="h-4 w-4 text-gray-400" />}
          검증 결과
        </h3>
        <div className="flex items-center gap-2">
          {status === 'failed' && projectPath && (
            <button
              onClick={() => retryVerify.mutate({ id: task.id, project_path: projectPath, failed_only: true })}
              disabled={retryVerify.isPending}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-orange-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50"
            >
              <RotateCcw className="h-3 w-3" /> {retryVerify.isPending ? '재검증 중...' : '실패 항목 재검증'}
            </button>
          )}
          {projectPath && (!status || status === 'failed') && (
            <button
              onClick={() => runVerify.mutate({ id: task.id, project_path: projectPath })}
              disabled={runVerify.isPending}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-blue-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {runVerify.isPending ? '검증 중...' : '전체 검증'}
            </button>
          )}
        </div>
      </div>

      {result && (
        <>
          {result.coverage_percent != null && (
            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">커버리지</span>
                <span className={result.coverage_percent >= 80 ? 'text-green-500' : 'text-red-500'}>
                  {result.coverage_percent.toFixed(1)}%
                </span>
              </div>
              <div className="h-2 rounded-full bg-muted overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${result.coverage_percent >= 80 ? 'bg-green-500' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(result.coverage_percent, 100)}%` }}
                />
              </div>
              <div className="h-0 relative">
                <div className="absolute left-[80%] -top-2 w-px h-2 bg-muted-foreground/50" title="80% 임계값" />
              </div>
            </div>
          )}

          <div className="space-y-1.5">
            {result.checks.map((check) => (
              <CheckItem key={check.name} check={check} />
            ))}
          </div>

          {result.completed_at && (
            <p className="text-xs text-muted-foreground">
              완료: {new Date(result.completed_at).toLocaleString('ko-KR')}
            </p>
          )}
        </>
      )}

      {!result && !status && (
        <p className="text-sm text-muted-foreground">검증이 아직 실행되지 않았습니다.</p>
      )}
    </div>
  );
}
