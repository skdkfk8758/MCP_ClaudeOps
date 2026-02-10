'use client';

import { use, useState, useEffect } from 'react';
import { useTask, useTaskHistory, useDeleteTask, useUpdateTask, useExecuteTask, useImplementTask, useRunVerification, useResolveProjectPath } from '@/lib/hooks/use-tasks';
import { useMembers, useAssignTask, useUnassignTask } from '@/lib/hooks/use-teams';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { PriorityBadge } from '@/components/tasks/priority-badge';
import { TaskWorkPrompt } from '@/components/tasks/task-work-prompt';
import { TaskDesignResult } from '@/components/tasks/task-design-result';
import { TaskPipelineMiniView } from '@/components/tasks/task-pipeline-mini-view';
import { TaskExecutionLog } from '@/components/tasks/task-execution-log';
import { TaskVerificationResult } from '@/components/tasks/task-verification-result';
import { TaskCommitHistory } from '@/components/tasks/task-commit-history';
import { TaskLiveStream } from '@/components/tasks/task-live-stream';
import { TaskExecutionHistory } from '@/components/tasks/task-execution-history';
import { CancelExecutionDialog } from '@/components/tasks/cancel-execution-dialog';
import { useToast } from '@/components/shared/toast';
import { formatDate } from '@claudeops/shared';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, User, Calendar, Clock, Plus, X, GitBranch, Play, Rocket, ShieldCheck, StopCircle } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그', todo: '할 일', design: '설계', implementation: '구현', verification: '검증', review: '리뷰', done: '완료',
};

const EXEC_STATUS_LABELS: Record<string, string> = {
  pending: '대기 중', running: '실행 중', completed: '완료', failed: '실패',
};

const EXEC_STATUS_COLORS: Record<string, string> = {
  pending: 'text-gray-400', running: 'text-yellow-400', completed: 'text-green-400', failed: 'text-red-400',
};

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const taskId = parseInt(id);
  const { data: task } = useTask(taskId);
  const { data: history } = useTaskHistory(taskId);
  const deleteTask = useDeleteTask();
  const updateTask = useUpdateTask();
  const executeTask = useExecuteTask();
  const implementTask = useImplementTask();
  const router = useRouter();
  const { data: membersData } = useMembers();
  const assignTask = useAssignTask();
  const unassignTask = useUnassignTask();
  const { toast } = useToast();
  const [addMemberOpen, setAddMemberOpen] = useState(false);
  const [branchInput, setBranchInput] = useState('');
  const [showBranchInput, setShowBranchInput] = useState(false);
  const [projectPath, setProjectPath] = useState('');
  const [projectPathManual, setProjectPathManual] = useState(false);
  const [showExecuteDialog, setShowExecuteDialog] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const { data: resolvedPath } = useResolveProjectPath(taskId);

  // 자동채움 캐스케이드: PRD → localStorage → 빈값
  useEffect(() => {
    if (projectPathManual) return; // 사용자가 수동 입력한 경우 덮어쓰지 않음
    if (resolvedPath?.project_path) {
      setProjectPath(resolvedPath.project_path);
    } else if (resolvedPath !== undefined) {
      // PRD 경로가 없으면 localStorage 폴백
      const lastUsed = localStorage.getItem('claudeops:lastProjectPath');
      if (lastUsed) setProjectPath(lastUsed);
    }
  }, [resolvedPath, projectPathManual]);

  if (!task) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  const allMembers = membersData?.items ?? [];
  const assignedIds = task.assignee_ids ?? [];
  const unassignedMembers = allMembers.filter((m) => !assignedIds.includes(m.id));

  // 상태 기반 워크플로우 판단
  const showWorkPrompt = ['todo', 'design', 'implementation', 'verification', 'review', 'done'].includes(task.status);
  const showDesignResult = task.design_status != null;
  const showPipelineMini = task.pipeline_id != null;
  const showExecutionLog = ['implementation', 'verification', 'review', 'done'].includes(task.status);
  const showVerification = ['verification', 'review', 'done'].includes(task.status) || task.verification_status != null;
  const showCommits = task.branch_name != null;
  const canImplement = task.pipeline_id != null && task.status === 'design' && task.design_status === 'completed';
  const isRunning = task.execution_status === 'running' || task.design_status === 'running';

  return (
    <div className="space-y-6 max-w-4xl">
      {/* 헤더 */}
      <div className="flex items-center gap-3">
        <Link href="/tasks" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors"><ArrowLeft className="h-5 w-5" /></Link>
        <h1 className="text-2xl font-bold flex-1">#{task.id} {task.title}</h1>
        <PriorityBadge priority={task.priority} />
        <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">{STATUS_LABELS[task.status] || task.status}</span>

        {/* 상태별 액션 버튼 */}
        {canImplement && (
          <button
            onClick={() => {
              if (projectPath.trim()) {
                implementTask.mutate({ id: taskId, project_path: projectPath }, {
                  onSuccess: () => toast({ type: 'success', title: '구현 시작됨', description: '파이프라인이 실행 중입니다.' }),
                  onError: (err) => toast({ type: 'error', title: '구현 실패', description: err instanceof Error ? err.message : '알 수 없는 오류' }),
                });
              } else {
                setShowExecuteDialog(true);
              }
            }}
            disabled={implementTask.isPending}
            className="cursor-pointer flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <Rocket className="h-3 w-3" /> {implementTask.isPending ? '실행 중...' : '구현 시작'}
          </button>
        )}

        {isRunning && (
          <button
            onClick={() => setShowCancelDialog(true)}
            className="cursor-pointer flex items-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-red-700 transition-colors"
            title="실행 취소"
          >
            <StopCircle className="h-3 w-3" /> 취소
          </button>
        )}
        <button
          onClick={() => setShowExecuteDialog(true)}
          className="cursor-pointer flex items-center gap-1 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors"
          title="Claude로 실행"
        >
          <Play className="h-3 w-3" /> 실행
        </button>
        <button onClick={() => { if (confirm('이 작업을 삭제하시겠습니까?')) { deleteTask.mutate(taskId, { onSuccess: () => { toast({ type: 'success', title: '작업 삭제됨' }); router.push('/tasks'); }, onError: (err) => toast({ type: 'error', title: '삭제 실패', description: err instanceof Error ? err.message : '알 수 없는 오류' }) }); } }}
          className="cursor-pointer rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors"><Trash2 className="h-4 w-4" /></button>
      </div>

      {task.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-sm whitespace-pre-wrap">{task.description}</p>
        </div>
      )}

      {/* 인라인 메타데이터 */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
        {/* 담당자 */}
        <div className="flex items-center gap-1.5 relative">
          <User className="h-3.5 w-3.5" />
          {task.assignees && task.assignees.length > 0 ? (
            task.assignees.map((a) => (
              <div key={a.id} className="flex items-center gap-1 group">
                <MemberAvatar name={a.name} size="sm" />
                <span className="text-foreground text-sm">{a.name}</span>
                <button
                  onClick={() => unassignTask.mutate({ taskId: task.id, memberIds: [a.id] })}
                  className="cursor-pointer opacity-0 group-hover:opacity-100 text-destructive hover:bg-destructive/10 rounded p-0.5 transition-opacity"
                  title="할당 해제"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))
          ) : (
            <span>{task.assignee || '미지정'}</span>
          )}
          <button
            onClick={() => setAddMemberOpen(!addMemberOpen)}
            className="cursor-pointer text-primary hover:text-primary/80 transition-colors"
            title="멤버 추가"
          >
            <Plus className="h-3 w-3" />
          </button>
          {addMemberOpen && (
            <div className="absolute z-10 top-full mt-1 left-0 w-48 rounded-md border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
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

        <span className="text-border">|</span>

        {/* 마감일 */}
        <div className="flex items-center gap-1">
          <Calendar className="h-3.5 w-3.5" />
          <span>{task.due_date ? task.due_date.slice(0, 10) : '-'}</span>
        </div>

        <span className="text-border">|</span>

        {/* 생성일 */}
        <div className="flex items-center gap-1">
          <Clock className="h-3.5 w-3.5" />
          <span>{formatDate(task.created_at)}</span>
        </div>

        {/* 예상 공수 (값이 있을 때만) */}
        {task.estimated_effort && (
          <>
            <span className="text-border">|</span>
            <div className="flex items-center gap-1">
              <span>공수: {task.estimated_effort}</span>
            </div>
          </>
        )}
      </div>

      {/* === 워크플로우 섹션 === */}

      {/* 프로젝트 경로 입력 */}
      {showWorkPrompt && (
        <div className="rounded-lg border border-border bg-card p-4">
          <label className="text-sm text-muted-foreground block mb-1.5">프로젝트 경로</label>
          <input
            type="text"
            value={projectPath}
            onChange={(e) => { setProjectPath(e.target.value); setProjectPathManual(true); }}
            placeholder="/path/to/project"
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          />
          {resolvedPath?.project_path && projectPath === resolvedPath.project_path && (
            <p className="text-xs text-muted-foreground mt-1">PRD에서 자동 설정됨</p>
          )}
        </div>
      )}

      {showWorkPrompt && <TaskWorkPrompt task={task} projectPath={projectPath} />}
      {showDesignResult && <TaskDesignResult task={task} projectPath={projectPath} />}
      {isRunning && <TaskLiveStream task={task} />}
      {showPipelineMini && <TaskPipelineMiniView task={task} />}
      {showExecutionLog && <TaskExecutionHistory task={task} />}
      {showExecutionLog && <TaskExecutionLog task={task} />}
      {showVerification && <TaskVerificationResult task={task} projectPath={projectPath} />}
      {showCommits && <TaskCommitHistory task={task} projectPath={projectPath} />}

      {/* === 기존 섹션들 === */}

      {/* Branch info */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground flex items-center gap-1"><GitBranch className="h-3 w-3" /> 브랜치</p>
          {task.branch_name ? (
            <div className="flex items-center gap-2">
              <code className="rounded bg-muted px-2 py-0.5 text-sm font-mono">{task.branch_name}</code>
              <button
                onClick={() => updateTask.mutate({ id: task.id, branch_name: null })}
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
                placeholder="feature/task-123"
                className="rounded-md border border-input bg-background px-2 py-1 text-sm w-48"
              />
              <button
                onClick={() => {
                  if (branchInput.trim()) {
                    updateTask.mutate({ id: task.id, branch_name: branchInput.trim() });
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

      {/* Execution status */}
      {task.execution_status && (
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground flex items-center gap-1"><Play className="h-3 w-3" /> 실행 상태</p>
            <div className="flex items-center gap-3">
              <span className={`text-sm font-medium ${EXEC_STATUS_COLORS[task.execution_status] || ''}`}>
                {EXEC_STATUS_LABELS[task.execution_status] || task.execution_status}
              </span>
              {task.last_execution_at && (
                <span className="text-xs text-muted-foreground">{formatDate(task.last_execution_at)}</span>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Cancel dialog */}
      <CancelExecutionDialog taskId={taskId} open={showCancelDialog} onOpenChange={setShowCancelDialog} />

      {/* Execute dialog */}
      {showExecuteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">작업 실행</h2>
              <button onClick={() => setShowExecuteDialog(false)} className="cursor-pointer rounded-md p-1 hover:bg-accent"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-muted-foreground block mb-1">프로젝트 경로 *</label>
                <input
                  type="text"
                  value={projectPath}
                  onChange={(e) => { setProjectPath(e.target.value); setProjectPathManual(true); }}
                  placeholder="/path/to/project"
                  className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => {
                    if (projectPath.trim()) {
                      executeTask.mutate({ id: taskId, project_path: projectPath.trim(), dry_run: true });
                    }
                  }}
                  className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent"
                >
                  프롬프트 미리보기
                </button>
                <button
                  onClick={() => {
                    if (projectPath.trim()) {
                      localStorage.setItem('claudeops:lastProjectPath', projectPath.trim());
                      executeTask.mutate({ id: taskId, project_path: projectPath.trim() }, {
                        onSuccess: () => toast({ type: 'success', title: '실행 시작됨', description: '백그라운드에서 실행 중입니다.' }),
                        onError: (err) => toast({ type: 'error', title: '실행 실패', description: err instanceof Error ? err.message : '알 수 없는 오류' }),
                      });
                      setShowExecuteDialog(false);
                    }
                  }}
                  disabled={executeTask.isPending}
                  className="cursor-pointer rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  {executeTask.isPending ? '실행 중...' : '실행'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
