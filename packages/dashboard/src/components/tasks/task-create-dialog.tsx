'use client';

import { useState } from 'react';
import { useCreateTask } from '@/lib/hooks/use-tasks';
import { useEpics } from '@/lib/hooks/use-epics';
import { useMembers, useAssignTask } from '@/lib/hooks/use-teams';
import { MemberAvatar } from '@/components/teams/member-avatar';
import { X, ChevronDown } from 'lucide-react';

export function TaskCreateDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('P2');
  const [status, setStatus] = useState('backlog');
  const [selectedMemberIds, setSelectedMemberIds] = useState<number[]>([]);
  const [memberDropdownOpen, setMemberDropdownOpen] = useState(false);
  const [effort, setEffort] = useState('');
  const [epicId, setEpicId] = useState<number | undefined>();
  const createTask = useCreateTask();
  const assignTask = useAssignTask();
  const { data: epicsData } = useEpics();
  const { data: membersData } = useMembers();

  if (!open) return null;

  const allMembers = membersData?.items ?? [];

  const toggleMember = (id: number) => {
    setSelectedMemberIds((prev) =>
      prev.includes(id) ? prev.filter((m) => m !== id) : [...prev, id]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    createTask.mutate({
      title: title.trim(),
      description: description.trim() || undefined,
      priority,
      status,
      estimated_effort: effort || undefined,
      epic_id: epicId,
    }, {
      onSuccess: (createdTask) => {
        if (selectedMemberIds.length > 0) {
          assignTask.mutate({ taskId: createdTask.id, memberIds: selectedMemberIds });
        }
        setTitle(''); setDescription(''); setPriority('P2'); setStatus('backlog'); setSelectedMemberIds([]); setEffort(''); setEpicId(undefined);
        onClose();
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">새 작업 만들기</h2>
          <button onClick={onClose} className="cursor-pointer rounded-md p-1 hover:bg-accent transition-colors"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="task-title" className="text-sm text-muted-foreground block mb-1">제목 *</label>
            <input id="task-title" type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="작업 제목 입력..." />
          </div>
          <div>
            <label htmlFor="task-desc" className="text-sm text-muted-foreground block mb-1">설명</label>
            <textarea id="task-desc" value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm" placeholder="작업 설명..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="task-priority" className="text-sm text-muted-foreground block mb-1">우선순위</label>
              <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="P0">P0 - 긴급</option>
                <option value="P1">P1 - 높음</option>
                <option value="P2">P2 - 보통</option>
                <option value="P3">P3 - 낮음</option>
              </select>
            </div>
            <div>
              <label htmlFor="task-status" className="text-sm text-muted-foreground block mb-1">상태</label>
              <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="backlog">백로그</option>
                <option value="todo">할 일</option>
                <option value="design">설계</option>
                <option value="implementation">구현</option>
                <option value="review">리뷰</option>
                <option value="done">완료</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="relative">
              <label className="text-sm text-muted-foreground block mb-1">담당자</label>
              {selectedMemberIds.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-1.5">
                  {selectedMemberIds.map((mid) => {
                    const member = allMembers.find((m) => m.id === mid);
                    if (!member) return null;
                    return (
                      <span key={mid} className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2 py-0.5 text-xs text-primary">
                        <MemberAvatar name={member.name} size="sm" />
                        {member.name}
                        <button type="button" onClick={() => toggleMember(mid)} className="cursor-pointer hover:text-destructive"><X className="h-3 w-3" /></button>
                      </span>
                    );
                  })}
                </div>
              )}
              <button type="button" onClick={() => setMemberDropdownOpen(!memberDropdownOpen)}
                className="cursor-pointer w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-left flex items-center justify-between">
                <span className="text-muted-foreground">{selectedMemberIds.length > 0 ? `${selectedMemberIds.length}명 선택됨` : '멤버 선택...'}</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              {memberDropdownOpen && (
                <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-card shadow-lg max-h-40 overflow-y-auto">
                  {allMembers.length === 0 && (
                    <p className="px-3 py-2 text-xs text-muted-foreground">등록된 멤버가 없습니다</p>
                  )}
                  {allMembers.map((member) => (
                    <label key={member.id} className="flex items-center gap-2 px-3 py-1.5 hover:bg-accent cursor-pointer text-sm">
                      <input type="checkbox" checked={selectedMemberIds.includes(member.id)} onChange={() => toggleMember(member.id)} className="cursor-pointer" />
                      <MemberAvatar name={member.name} size="sm" />
                      <span>{member.name}</span>
                      <span className="text-xs text-muted-foreground ml-auto">{member.role}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            <div>
              <label htmlFor="task-effort" className="text-sm text-muted-foreground block mb-1">예상 공수</label>
              <select id="task-effort" value={effort} onChange={(e) => setEffort(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
                <option value="">선택 안 함</option>
                <option value="S">S - 소</option>
                <option value="M">M - 중</option>
                <option value="L">L - 대</option>
                <option value="XL">XL - 특대</option>
              </select>
            </div>
          </div>
          <div>
            <label htmlFor="task-epic" className="text-sm text-muted-foreground block mb-1">연결된 에픽</label>
            <select id="task-epic" value={epicId || ''} onChange={(e) => setEpicId(e.target.value ? parseInt(e.target.value) : undefined)}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm">
              <option value="">선택 안 함</option>
              {epicsData?.items.map((epic) => (
                <option key={epic.id} value={epic.id}>{epic.title}</option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="cursor-pointer rounded-md px-4 py-2 text-sm hover:bg-accent transition-colors">취소</button>
            <button type="submit" disabled={createTask.isPending}
              className="cursor-pointer rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50">
              {createTask.isPending ? '생성 중...' : '작업 생성'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
