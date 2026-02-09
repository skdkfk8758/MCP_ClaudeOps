'use client';

import { use } from 'react';
import { useEpic, useUpdateEpic, useDeleteEpic } from '@/lib/hooks/use-epics';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { EpicProgress } from '@/components/epics/epic-progress';
import { TaskCard } from '@/components/tasks/task-card';
import type { Task } from '@claudeops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, FileText } from 'lucide-react';

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

  const { data: tasksData } = useQuery({
    queryKey: ['tasks', { epic_id: epicId }],
    queryFn: () => apiFetch<{ total: number; items: Task[] }>(`/api/tasks?epic_id=${epicId}`),
    enabled: !!epic,
  });

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
