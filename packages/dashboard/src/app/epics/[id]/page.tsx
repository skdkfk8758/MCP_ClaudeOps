'use client';

import { use, useState } from 'react';
import { useEpic, useUpdateEpic, useDeleteEpic, useEpicSessions } from '@/lib/hooks/use-epics';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { EpicProgress } from '@/components/epics/epic-progress';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@claudeops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { usePipelines, useCreatePipeline } from '@/lib/hooks/use-pipelines';
import { PipelineCard } from '@/components/pipelines/pipeline-card';
import type { Pipeline, PipelineStep } from '@claudeops/shared';
import { ArrowLeft, Trash2, FileText, GitBranch, Plus, X, Workflow, Loader2, Clock, Coins, MessageSquare } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그',
  planning: '계획 중',
  in_progress: '진행 중',
  completed: '완료',
};

export default function EpicDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const epicId = parseInt(id);
  const { data: epic } = useEpic(epicId);
  const updateEpic = useUpdateEpic();
  const deleteEpic = useDeleteEpic();
  const router = useRouter();
  const [branchInput, setBranchInput] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { epic_id: epicId }],
    queryFn: () => apiFetch<{ total: number; items: Task[] }>(`/api/tasks?epic_id=${epicId}`),
    enabled: !!epic,
  });

  const { data: pipelinesData } = usePipelines({ epic_id: epicId });
  const pipelines = pipelinesData?.items ?? [];
  const createPipeline = useCreatePipeline();
  const { data: sessionStats } = useEpicSessions(epicId);

  const handleGeneratePipeline = async () => {
    if (!tasksData?.items.length || !epic) return;
    const steps: PipelineStep[] = tasksData.items.map((task, i) => ({
      step: i + 1,
      parallel: false,
      agents: [{
        type: 'executor',
        model: 'sonnet' as const,
        prompt: `${task.title}${task.description ? ': ' + task.description : ''}`,
        task_id: task.id,
      }],
    }));
    const result = await createPipeline.mutateAsync({
      name: `${epic.title} 파이프라인`,
      description: `에픽 #${epicId}의 작업을 기반으로 자동 생성된 파이프라인`,
      epic_id: epicId,
      steps,
    });
    router.push(`/pipelines/${result.id}`);
  };

  if (!epic) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  const progress = epic.task_count ? Math.round(((epic.completed_count || 0) / epic.task_count) * 100) : 0;

  const handleStatusChange = (newStatus: string) => {
    updateEpic.mutate({ id: epicId, status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/epics" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold flex-1">#{epic.id} {epic.title}</h1>
        <select value={epic.status} onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button onClick={() => { if (confirm('이 에픽을 삭제하시겠습니까?')) { deleteEpic.mutate(epicId, { onSuccess: () => router.push('/epics') }); } }}
          className="cursor-pointer rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">진행률</h2>
          <span className="text-2xl font-bold text-primary">{progress}%</span>
        </div>
        <EpicProgress progress={progress} />
        <div className="mt-3 flex items-center justify-between text-sm text-muted-foreground">
          <span>완료: {epic.completed_count || 0}/{epic.task_count || 0}</span>
          {epic.estimated_effort && <span>예상 공수: {epic.estimated_effort}</span>}
        </div>
      </div>

      {/* Branch info */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><GitBranch className="h-3 w-3" /> 브랜치</p>
          {epic.branch_name ? (
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">{epic.branch_name}</code>
              <button
                onClick={() => updateEpic.mutate({ id: epicId, branch_name: null } as Parameters<typeof updateEpic.mutate>[0])}
                className="cursor-pointer text-destructive hover:bg-destructive/10 rounded p-0.5"
                title="브랜치 연결 해제"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : showBranchInput ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={branchInput}
                onChange={(e) => setBranchInput(e.target.value)}
                placeholder="epic/feature-name"
                className="rounded-md border border-input bg-background px-2 py-1 text-sm w-48"
              />
              <button
                onClick={() => {
                  if (branchInput.trim()) {
                    updateEpic.mutate({ id: epicId, branch_name: branchInput.trim() } as Parameters<typeof updateEpic.mutate>[0]);
                    setBranchInput('');
                    setShowBranchInput(false);
                  }
                }}
                className="cursor-pointer rounded-md bg-primary px-2 py-1 text-xs text-primary-foreground"
              >
                설정
              </button>
              <button onClick={() => setShowBranchInput(false)} className="cursor-pointer text-muted-foreground">
                <X className="h-3 w-3" />
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowBranchInput(true)}
              className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:text-primary/80"
            >
              <Plus className="h-3 w-3" /> 브랜치 연결
            </button>
          )}
        </div>
      </div>

      {epic.prd_id && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground mb-2 flex items-center gap-1">
            <FileText className="h-3 w-3" /> 연결된 PRD
          </p>
          <Link href={`/prds/${epic.prd_id}`} className="text-primary hover:underline cursor-pointer">
            PRD #{epic.prd_id}
          </Link>
        </div>
      )}

      {epic.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">설명</h2>
          <p className="text-sm whitespace-pre-wrap">{epic.description}</p>
        </div>
      )}

      {epic.architecture_notes && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">아키텍처 노트</h2>
          <p className="text-sm whitespace-pre-wrap">{epic.architecture_notes}</p>
        </div>
      )}

      {epic.tech_approach && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">기술 접근</h2>
          <p className="text-sm whitespace-pre-wrap">{epic.tech_approach}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Workflow className="h-5 w-5" /> 연결된 파이프라인
          </h2>
          <button
            onClick={handleGeneratePipeline}
            disabled={createPipeline.isPending || !tasksData?.items.length}
            className="cursor-pointer flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createPipeline.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            작업에서 파이프라인 생성
          </button>
        </div>
        {pipelines && pipelines.length > 0 ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {pipelines.map((p) => (
              <PipelineCard key={p.id} pipeline={p} />
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-6">연결된 파이프라인이 없습니다. 작업에서 자동 생성하거나 파이프라인 에디터에서 직접 만들 수 있습니다.</p>
        )}
      </div>

      {/* 에픽 세션 그룹 */}
      {sessionStats && sessionStats.total_sessions > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5" /> 세션 활동
          </h2>

          {/* 통계 카드 그리드 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-2xl font-bold text-primary">{sessionStats.total_sessions}</p>
              <p className="text-xs text-muted-foreground">총 세션</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-2xl font-bold">{(sessionStats.total_token_input / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground">입력 토큰</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-2xl font-bold">{(sessionStats.total_token_output / 1000).toFixed(1)}k</p>
              <p className="text-xs text-muted-foreground">출력 토큰</p>
            </div>
            <div className="rounded-md border border-border p-3 text-center">
              <p className="text-2xl font-bold text-green-600">${sessionStats.total_cost_usd.toFixed(2)}</p>
              <p className="text-xs text-muted-foreground">총 비용</p>
            </div>
          </div>

          {/* 세션 목록 */}
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {sessionStats.sessions.map((session) => (
              <div key={session.session_id} className="flex items-center justify-between text-xs rounded-md px-3 py-2 bg-muted/30 hover:bg-muted/50 transition-colors">
                <code className="font-mono text-muted-foreground truncate max-w-[200px]">{session.session_id}</code>
                <div className="flex items-center gap-3">
                  {session.task_id && (
                    <Link href={`/tasks/${session.task_id}`} className="text-primary hover:underline">
                      Task #{session.task_id}
                    </Link>
                  )}
                  <span className="text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {new Date(session.linked_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">연결된 작업</h2>
        {!tasksData ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : tasksData.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">연결된 작업이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {tasksData.items.map((task) => (
              <TaskCard key={task.id} task={task} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
