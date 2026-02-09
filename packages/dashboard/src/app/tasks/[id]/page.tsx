'use client';

import { use, useState } from 'react';
import { useTask, useTaskHistory, useDeleteTask } from '@/lib/hooks/use-tasks';
import { useMembers, useAssignTask, useUnassignTask } from '@/lib/hooks/use-teams';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { formatDate } from '@claudeops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, User, Calendar, Clock, Plus, X } from 'lucide-react';

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
  const { data: membersData } = useMembers();
  const assignTask = useAssignTask();
  const unassignTask = useUnassignTask();
  const [addMemberOpen, setAddMemberOpen] = useState(false);

  if (!task) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  const allMembers = membersData?.items ?? [];
  const assignedIds = task.assignee_ids ?? [];
  const unassignedMembers = allMembers.filter((m) => !assignedIds.includes(m.id));

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
        <div className="rounded-lg border border-border bg-card p-4 relative">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><User className="h-3 w-3" /> 담당자</p>
          {task.assignees && task.assignees.length > 0 ? (
            <div className="mt-1.5 space-y-1.5">
              {task.assignees.map((a) => (
                <div key={a.id} className="flex items-center gap-1.5 group">
                  <MemberAvatar name={a.name} size="sm" />
                  <span className="text-sm font-medium flex-1 truncate">{a.name}</span>
                  <button
                    onClick={() => unassignTask.mutate({ taskId: task.id, memberIds: [a.id] })}
                    className="cursor-pointer opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5 transition-opacity"
                    title="할당 해제"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-medium mt-1">{task.assignee || '-'}</p>
          )}
          <div className="mt-2 relative">
            <button
              onClick={() => setAddMemberOpen(!addMemberOpen)}
              className="cursor-pointer flex items-center gap-1 text-xs text-primary hover:text-primary/80 transition-colors"
            >
              <Plus className="h-3 w-3" /> 멤버 추가
            </button>
            {addMemberOpen && (
              <div className="absolute z-10 mt-1 left-0 w-48 rounded-md border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
                {unassignedMembers.length === 0 ? (
                  <p className="px-3 py-2 text-xs text-muted-foreground">추가할 멤버 없음</p>
                ) : (
                  unassignedMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => {
                        assignTask.mutate({ taskId: task.id, memberIds: [member.id] });
                        setAddMemberOpen(false);
                      }}
                      className="cursor-pointer w-full flex items-center gap-2 px-3 py-1.5 hover:bg-accent text-sm text-left transition-colors"
                    >
                      <MemberAvatar name={member.name} size="sm" />
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{member.role}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>
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
