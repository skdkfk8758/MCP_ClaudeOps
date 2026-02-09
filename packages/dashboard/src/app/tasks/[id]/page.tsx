'use client';

import { use } from 'react';
import { useTask, useTaskHistory, useDeleteTask } from '@/lib/hooks/use-tasks';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { formatDate } from '@claudeops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, User, Calendar, Clock } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그', todo: '할 일', in_progress: '진행 중', review: '리뷰', done: '완료',
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = parseInt(id);
  const { data: task } = useTask(taskId);
  const { data: history } = useTaskHistory(taskId);
  const deleteTask = useDeleteTask();
  const router = useRouter();

  if (!task) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/tasks" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold flex-1">#{task.id} {task.title}</h1>
        <PriorityBadge priority={task.priority} />
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{STATUS_LABELS[task.status] || task.status}</span>
        <button onClick={() => { if (confirm('이 작업을 삭제하시겠습니까?')) { deleteTask.mutate(taskId, { onSuccess: () => router.push('/tasks') }); } }}
          className="cursor-pointer rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>

      {task.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> 담당자</p>
          <p className="font-medium mt-1">{task.assignee || '-'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="h-3 w-3" /> 마감일</p>
          <p className="font-medium mt-1">{task.due_date ? task.due_date.slice(0, 10) : '-'}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><Clock className="h-3 w-3" /> 생성일</p>
          <p className="font-medium mt-1">{formatDate(task.created_at)}</p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm text-muted-foreground">예상 공수</p>
          <p className="font-medium mt-1">{task.estimated_effort || '-'}</p>
        </div>
      </div>

      {task.labels && task.labels.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {task.labels.map((label) => (
            <span key={label} className="rounded-full bg-primary/10 px-3 py-1 text-xs text-primary">{label}</span>
          ))}
        </div>
      )}

      {task.session_ids && task.session_ids.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">연결된 세션</h2>
          <div className="space-y-2">
            {task.session_ids.map((sid) => (
              <Link key={sid} href={`/sessions/${sid}`} className="block cursor-pointer rounded-md border border-border p-3 hover:bg-accent/50 transition-colors text-sm text-primary">
                {sid.slice(0, 8)}...
              </Link>
            ))}
          </div>
        </div>
      )}

      {history && history.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-6">
          <h2 className="text-lg font-semibold mb-3">변경 이력</h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {history.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 text-sm border-b border-border pb-2 last:border-0">
                <span className="font-medium text-muted-foreground">{entry.field_name}</span>
                <span className="text-destructive/70 line-through">{entry.old_value || '-'}</span>
                <span>→</span>
                <span className="text-success">{entry.new_value || '-'}</span>
                <span className="ml-auto text-xs text-muted-foreground">{formatDate(entry.changed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
