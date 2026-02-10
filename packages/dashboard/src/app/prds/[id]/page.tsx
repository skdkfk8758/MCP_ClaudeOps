'use client';

import { use, useState } from 'react';
import { usePrd, useUpdatePrd, useDeletePrd } from '@/lib/hooks/use-prds';
import { useEpics } from '@/lib/hooks/use-epics';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { EpicCard } from '@/components/epics/epic-card';
import { EpicCreateDialog } from '@/components/epics/epic-create-dialog';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Trash2, Plus, Github, FolderOpen } from 'lucide-react';

const STATUS_LABELS: Record<string, string> = {
  backlog: '백로그',
  active: '활성',
  completed: '완료',
  archived: '보관',
};

export default function PrdDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const prdId = parseInt(id);
  const { data: prd } = usePrd(prdId);
  const { data: epicsData } = useEpics(prdId);
  const updatePrd = useUpdatePrd();
  const deletePrd = useDeletePrd();
  const router = useRouter();
  const qc = useQueryClient();
  const [createEpicOpen, setCreateEpicOpen] = useState(false);
  const [ghUrl, setGhUrl] = useState('');
  const [ghBranch, setGhBranch] = useState('main');
  const [ghParseError, setGhParseError] = useState('');
  const [showGhForm, setShowGhForm] = useState(false);
  const [showPathForm, setShowPathForm] = useState(false);
  const [pathInput, setPathInput] = useState('');

  const parseGitHubUrl = (input: string): { owner: string; repo: string } | null => {
    const trimmed = input.trim().replace(/\/+$/, '').replace(/\.git$/, '');
    // https://github.com/owner/repo or github.com/owner/repo
    const urlMatch = trimmed.match(/(?:https?:\/\/)?github\.com\/([^/]+)\/([^/]+)/);
    if (urlMatch) return { owner: urlMatch[1], repo: urlMatch[2] };
    // owner/repo
    const shortMatch = trimmed.match(/^([^/\s]+)\/([^/\s]+)$/);
    if (shortMatch) return { owner: shortMatch[1], repo: shortMatch[2] };
    return null;
  };

  const { data: ghConfig } = useQuery({
    queryKey: ['prd-github', prdId],
    queryFn: () => apiFetch<{ configured: boolean; repo_owner?: string; repo_name?: string; default_branch?: string; enabled?: boolean }>(`/api/prds/${prdId}/github`),
    enabled: !!prd,
  });

  const saveGhConfig = useMutation({
    mutationFn: (data: { repo_owner: string; repo_name: string; default_branch: string }) =>
      apiFetch(`/api/prds/${prdId}/github`, { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prd-github', prdId] });
      setShowGhForm(false);
    },
  });

  const removeGhConfig = useMutation({
    mutationFn: () => apiFetch(`/api/prds/${prdId}/github`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['prd-github', prdId] });
    },
  });

  if (!prd) return <div className="animate-pulse h-64 rounded-lg bg-muted" />;

  const handleStatusChange = (newStatus: string) => {
    updatePrd.mutate({ id: prdId, status: newStatus });
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        <Link href="/prds" className="cursor-pointer hover:bg-accent rounded-md p-1 transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold flex-1">#{prd.id} {prd.title}</h1>
        <select value={prd.status} onChange={(e) => handleStatusChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm">
          {Object.entries(STATUS_LABELS).map(([value, label]) => (
            <option key={value} value={value}>{label}</option>
          ))}
        </select>
        <button onClick={() => { if (confirm('이 PRD를 삭제하시겠습니까?')) { deletePrd.mutate(prdId, { onSuccess: () => router.push('/prds') }); } }}
          className="cursor-pointer rounded-md p-2 text-destructive hover:bg-destructive/10 transition-colors">
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {/* GitHub Config Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><Github className="h-4 w-4" /> GitHub 연동</h2>
          {ghConfig?.configured && (
            <button
              onClick={() => { if (confirm('GitHub 설정을 제거하시겠습니까?')) removeGhConfig.mutate(); }}
              className="cursor-pointer text-xs text-destructive hover:text-destructive/80"
            >
              설정 제거
            </button>
          )}
        </div>
        {ghConfig?.configured ? (
          <div className="flex items-center gap-3">
            <a href={`https://github.com/${ghConfig.repo_owner}/${ghConfig.repo_name}`} target="_blank" rel="noopener noreferrer"
              className="rounded bg-muted px-2 py-1 text-sm font-mono hover:text-primary transition-colors">
              {ghConfig.repo_owner}/{ghConfig.repo_name}
            </a>
            <span className="text-xs text-muted-foreground">branch: {ghConfig.default_branch}</span>
            <button
              onClick={() => { setGhUrl(`https://github.com/${ghConfig.repo_owner}/${ghConfig.repo_name}`); setGhBranch(ghConfig.default_branch || 'main'); setGhParseError(''); setShowGhForm(true); }}
              className="cursor-pointer text-xs text-primary hover:text-primary/80"
            >
              수정
            </button>
          </div>
        ) : !showGhForm ? (
          <button
            onClick={() => { setGhUrl(''); setGhBranch('main'); setGhParseError(''); setShowGhForm(true); }}
            className="cursor-pointer flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <Plus className="h-3 w-3" /> GitHub 레포 설정
          </button>
        ) : null}
        {showGhForm && (
          <div className="mt-3 space-y-3">
            <div className="grid grid-cols-[1fr_auto] gap-3">
              <input type="text" value={ghUrl} onChange={(e) => { setGhUrl(e.target.value); setGhParseError(''); }}
                placeholder="https://github.com/owner/repo 또는 owner/repo"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
              <input type="text" value={ghBranch} onChange={(e) => setGhBranch(e.target.value)} placeholder="main"
                className="rounded-md border border-input bg-background px-3 py-1.5 text-sm w-24" />
            </div>
            {ghParseError && <p className="text-xs text-destructive">{ghParseError}</p>}
            <div className="flex gap-2">
              <button
                onClick={() => {
                  const parsed = parseGitHubUrl(ghUrl);
                  if (!parsed) { setGhParseError('올바른 GitHub URL을 입력하세요 (예: https://github.com/owner/repo)'); return; }
                  saveGhConfig.mutate({ repo_owner: parsed.owner, repo_name: parsed.repo, default_branch: ghBranch });
                }}
                disabled={!ghUrl.trim()}
                className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                저장
              </button>
              <button onClick={() => { setShowGhForm(false); setGhParseError(''); }} className="cursor-pointer rounded-md px-3 py-1.5 text-sm hover:bg-accent">
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Project Path Section */}
      <div className="rounded-lg border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-sm font-semibold text-muted-foreground flex items-center gap-1"><FolderOpen className="h-4 w-4" /> 프로젝트 경로</h2>
          {prd.project_path && (
            <button
              onClick={() => { if (confirm('프로젝트 경로를 제거하시겠습니까?')) updatePrd.mutate({ id: prdId, project_path: null }); }}
              className="cursor-pointer text-xs text-destructive hover:text-destructive/80"
            >
              경로 제거
            </button>
          )}
        </div>
        {prd.project_path ? (
          <div className="flex items-center gap-3">
            <code className="rounded bg-muted px-2 py-1 text-sm font-mono">{prd.project_path}</code>
            <button
              onClick={() => { setPathInput(prd.project_path || ''); setShowPathForm(true); }}
              className="cursor-pointer text-xs text-primary hover:text-primary/80"
            >
              수정
            </button>
          </div>
        ) : !showPathForm ? (
          <button
            onClick={() => { setPathInput(''); setShowPathForm(true); }}
            className="cursor-pointer flex items-center gap-1 text-sm text-primary hover:text-primary/80"
          >
            <Plus className="h-3 w-3" /> 프로젝트 경로 설정
          </button>
        ) : null}
        {showPathForm && (
          <div className="mt-3 space-y-3">
            <input type="text" value={pathInput} onChange={(e) => setPathInput(e.target.value)}
              placeholder="/path/to/project"
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm" />
            <div className="flex gap-2">
              <button
                onClick={() => {
                  if (pathInput.trim()) {
                    updatePrd.mutate({ id: prdId, project_path: pathInput.trim() });
                    setShowPathForm(false);
                  }
                }}
                disabled={!pathInput.trim()}
                className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground disabled:opacity-50"
              >
                저장
              </button>
              <button onClick={() => setShowPathForm(false)} className="cursor-pointer rounded-md px-3 py-1.5 text-sm hover:bg-accent">
                취소
              </button>
            </div>
          </div>
        )}
      </div>

      {prd.vision && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">비전</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.vision}</p>
        </div>
      )}

      {prd.description && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">설명</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.description}</p>
        </div>
      )}

      {prd.user_stories && prd.user_stories.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">사용자 스토리</h2>
          <ul className="space-y-2">
            {prd.user_stories.map((story, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className="text-primary">•</span>
                <span>{story}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prd.success_criteria && prd.success_criteria.length > 0 && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-3">성공 기준</h2>
          <ul className="space-y-2">
            {prd.success_criteria.map((criteria, idx) => (
              <li key={idx} className="text-sm flex gap-2">
                <span className="text-green-400">✓</span>
                <span>{criteria}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {prd.constraints && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">제약 사항</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.constraints}</p>
        </div>
      )}

      {prd.out_of_scope && (
        <div className="rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-muted-foreground mb-2">범위 외</h2>
          <p className="text-sm whitespace-pre-wrap">{prd.out_of_scope}</p>
        </div>
      )}

      <div className="rounded-lg border border-border bg-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">연결된 에픽</h2>
          <button onClick={() => setCreateEpicOpen(true)}
            className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
            <Plus className="h-3 w-3" /> 새 에픽
          </button>
        </div>
        {!epicsData ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : epicsData.items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">연결된 에픽이 없습니다.</p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {epicsData.items.map((epic) => (
              <EpicCard key={epic.id} epic={epic} />
            ))}
          </div>
        )}
      </div>

      <EpicCreateDialog open={createEpicOpen} onClose={() => setCreateEpicOpen(false)} defaultPrdId={prdId} />
    </div>
  );
}
