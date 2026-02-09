'use client';

import { useState } from 'react';
import { useWorktrees, useCreateWorktree, useMergeWorktree, useRemoveWorktree } from '@/lib/hooks/use-worktrees';
import { useEpics } from '@/lib/hooks/use-epics';
import { Plus, GitBranch, CheckCircle, XCircle, Trash2 } from 'lucide-react';

const STATUS_TABS = [
  { value: '', label: '전체' },
  { value: 'active', label: '활성' },
  { value: 'merged', label: '병합됨' },
  { value: 'removed', label: '제거됨' },
];

export default function WorktreesPage() {
  const [selectedStatus, setSelectedStatus] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const { data } = useWorktrees(selectedStatus ? { status: selectedStatus } : undefined);
  const createMutation = useCreateWorktree();
  const mergeMutation = useMergeWorktree();
  const removeMutation = useRemoveWorktree();

  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [epicId, setEpicId] = useState<number | undefined>();
  const { data: epicsData } = useEpics();

  const handleCreate = () => {
    if (!name || !path) return;
    createMutation.mutate({ name, path, epic_id: epicId }, {
      onSuccess: () => {
        setCreateOpen(false);
        setName('');
        setPath('');
        setEpicId(undefined);
      },
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-500/20 text-green-400 border-green-500/30';
      case 'merged':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'removed':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      default:
        return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'active':
        return '활성';
      case 'merged':
        return '병합됨';
      case 'removed':
        return '제거됨';
      default:
        return status;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Worktree 관리</h1>
          {data && <p className="text-sm text-muted-foreground mt-1">총 {data.total}개</p>}
        </div>
        <button
          onClick={() => setCreateOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
        >
          <Plus className="h-4 w-4" /> 새 Worktree
        </button>
      </div>

      <div className="flex gap-2 border-b border-border">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setSelectedStatus(tab.value)}
            className={`cursor-pointer px-4 py-2 text-sm font-medium transition-colors ${
              selectedStatus === tab.value
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {!data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-40 animate-pulse rounded-lg bg-muted" />
          ))}
        </div>
      ) : data.items.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p>Worktree가 없습니다.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {data.items.map((worktree) => (
            <div key={worktree.id} className="rounded-lg border border-border bg-card p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <GitBranch className="h-5 w-5 text-muted-foreground" />
                  <h3 className="font-semibold">{worktree.name}</h3>
                </div>
                <span className={`text-xs px-2 py-1 rounded-md border ${getStatusBadge(worktree.status)}`}>
                  {getStatusLabel(worktree.status)}
                </span>
              </div>

              <div className="space-y-1 text-sm">
                <p className="text-muted-foreground">
                  <span className="font-medium">브랜치:</span> {worktree.branch}
                </p>
                <p className="text-muted-foreground">
                  <span className="font-medium">경로:</span> {worktree.path}
                </p>
                {worktree.epic_title && (
                  <p className="text-muted-foreground">
                    <span className="font-medium">에픽:</span> {worktree.epic_title}
                  </p>
                )}
                <p className="text-xs text-muted-foreground">
                  생성: {new Date(worktree.created_at).toLocaleDateString('ko-KR')}
                </p>
              </div>

              {worktree.status === 'active' && (
                <div className="flex gap-2 pt-2">
                  <button
                    onClick={() => mergeMutation.mutate(worktree.id)}
                    className="cursor-pointer flex-1 flex items-center justify-center gap-1 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700 transition-colors"
                  >
                    <CheckCircle className="h-3 w-3" /> 병합
                  </button>
                  <button
                    onClick={() => removeMutation.mutate(worktree.id)}
                    className="cursor-pointer flex-1 flex items-center justify-center gap-1 rounded-md bg-red-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-red-700 transition-colors"
                  >
                    <Trash2 className="h-3 w-3" /> 제거
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {createOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-card p-6 space-y-4">
            <h2 className="text-xl font-bold">새 Worktree 생성</h2>

            <div>
              <label htmlFor="name" className="text-sm text-muted-foreground block mb-1">
                이름 *
              </label>
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="feature-auth"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="path" className="text-sm text-muted-foreground block mb-1">
                프로젝트 경로 *
              </label>
              <input
                id="path"
                type="text"
                value={path}
                onChange={(e) => setPath(e.target.value)}
                placeholder="/path/to/project"
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label htmlFor="epic" className="text-sm text-muted-foreground block mb-1">
                연결할 에픽 (선택사항)
              </label>
              <select
                id="epic"
                value={epicId || ''}
                onChange={(e) => setEpicId(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">없음</option>
                {epicsData?.items.map((epic) => (
                  <option key={epic.id} value={epic.id}>
                    {epic.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handleCreate}
                disabled={!name || !path}
                className="cursor-pointer flex-1 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                생성
              </button>
              <button
                onClick={() => {
                  setCreateOpen(false);
                  setName('');
                  setPath('');
                  setEpicId(undefined);
                }}
                className="cursor-pointer flex-1 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
              >
                취소
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
