'use client';

import type { Task } from '@claudeops/shared';
import { useTaskCommits, useScanCommits } from '@/lib/hooks/use-tasks';
import { GitCommit, RefreshCw, Info } from 'lucide-react';

export function TaskCommitHistory({ task, projectPath }: { task: Task; projectPath: string }) {
  const { data } = useTaskCommits(task.id);
  const scanCommits = useScanCommits();

  const commits = data?.commits ?? [];

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <GitCommit className="h-4 w-4" /> 커밋 이력
          {commits.length > 0 && (
            <span className="rounded-full bg-muted px-2 py-0.5 text-xs">{commits.length}</span>
          )}
        </h3>
        {projectPath && (
          <button
            onClick={() => scanCommits.mutate({ id: task.id, project_path: projectPath })}
            disabled={scanCommits.isPending}
            className="cursor-pointer flex items-center gap-1 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary hover:bg-primary/20 disabled:opacity-50"
          >
            <RefreshCw className={`h-3 w-3 ${scanCommits.isPending ? 'animate-spin' : ''}`} />
            {scanCommits.isPending ? '스캔 중...' : '커밋 스캔'}
          </button>
        )}
      </div>

      {commits.length === 0 ? (
        <div className="flex items-start gap-2 rounded-md bg-muted/50 p-3">
          <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
          <div className="text-sm text-muted-foreground space-y-1">
            <p>연결된 커밋이 없습니다.</p>
            <p className="text-xs">커밋 메시지에 <code className="bg-muted px-1 rounded">[TASK-{task.id}]</code> prefix를 사용하면 자동으로 추적됩니다.</p>
            <p className="text-xs">예: <code className="bg-muted px-1 rounded">[TASK-{task.id}] feat: 기능 구현</code></p>
          </div>
        </div>
      ) : (
        <div className="space-y-2 max-h-64 overflow-y-auto">
          {commits.map((commit) => (
            <div key={commit.id} className="flex items-start gap-3 text-sm border-b border-border pb-2 last:border-0">
              <code className="shrink-0 rounded bg-muted px-1.5 py-0.5 text-xs font-mono text-primary">
                {commit.commit_hash.slice(0, 7)}
              </code>
              <div className="flex-1 min-w-0">
                <p className="truncate">{commit.commit_message}</p>
                <div className="flex items-center gap-3 mt-0.5 text-xs text-muted-foreground">
                  <span>{commit.author}</span>
                  <span>{commit.committed_at ? new Date(commit.committed_at).toLocaleDateString('ko-KR') : ''}</span>
                  {(commit.files_changed > 0 || commit.insertions > 0 || commit.deletions > 0) && (
                    <span>
                      {commit.files_changed} file{commit.files_changed !== 1 ? 's' : ''}
                      {commit.insertions > 0 && <span className="text-green-500"> +{commit.insertions}</span>}
                      {commit.deletions > 0 && <span className="text-red-500"> -{commit.deletions}</span>}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
