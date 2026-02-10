'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiFetch } from '@/lib/api';
import { useState } from 'react';
import { useGitHubConfig, useUpdateGitHubConfig } from '@/lib/hooks/use-github';
import { useProjectContexts, useSetProjectContext, useDeleteProjectContext } from '@/lib/hooks/use-contexts';
import { useAppFilterStore } from '@/stores/app-filter-store';
import { RefreshCw, Server, FilterX } from 'lucide-react';

export default function SettingsPage() {
  const queryClient = useQueryClient();
  const { data: config } = useQuery({
    queryKey: ['config'],
    queryFn: () => apiFetch<Record<string, string>>('/api/config'),
  });

  const [dailyLimit, setDailyLimit] = useState('');
  const [monthlyLimit, setMonthlyLimit] = useState('');

  const { data: githubConfig } = useGitHubConfig();
  const [repoOwner, setRepoOwner] = useState('');
  const [repoName, setRepoName] = useState('');
  const [githubEnabled, setGithubEnabled] = useState(false);
  const [autoSync, setAutoSync] = useState(false);

  const [projectPath, setProjectPath] = useState('');
  const [loadedPath, setLoadedPath] = useState('');
  const { data: contextsData } = useProjectContexts(loadedPath);
  const setContextMutation = useSetProjectContext();
  const deleteContextMutation = useDeleteProjectContext();

  const resetAllFilters = useAppFilterStore((s) => s.resetAllFilters);
  const totalFilterCount = useAppFilterStore((s) =>
    s.getActiveFilterCount('taskBoard') + s.getActiveFilterCount('pipelines') + s.getActiveFilterCount('epics') + s.getActiveFilterCount('prds')
  );

  const [contextType, setContextType] = useState('brief');
  const [contextTitle, setContextTitle] = useState('');
  const [contextContent, setContextContent] = useState('');

  const budgetMutation = useMutation({
    mutationFn: (data: { daily_limit?: number; monthly_limit?: number }) =>
      apiFetch('/api/tokens/budget-alerts', { method: 'PUT', body: JSON.stringify(data) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['config'] }),
  });

  const updateGithubConfig = useUpdateGitHubConfig();

  const { data: serverStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['server-status'],
    queryFn: () => apiFetch<{ status: string; uptime_seconds: number; pid: number; node_version: string; memory_mb: number; timestamp: string }>('/api/server/status'),
    refetchInterval: 10_000,
  });

  const restartMutation = useMutation({
    mutationFn: () => apiFetch('/api/server/restart', { method: 'POST' }),
    onSuccess: () => {
      // Poll until server is back
      const poll = setInterval(async () => {
        try {
          await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:48390'}/api/server/status`);
          clearInterval(poll);
          queryClient.invalidateQueries({ queryKey: ['server-status'] });
        } catch { /* server still restarting */ }
      }, 1000);
    },
  });

  const formatUptime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}시간 ${m}분`;
    if (m > 0) return `${m}분 ${s}초`;
    return `${s}초`;
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">설정</h1>

      {/* 필터 초기화 */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><FilterX className="h-5 w-5" /> 필터 관리</h2>
        <p className="text-sm text-muted-foreground mb-4">
          모든 페이지의 필터 설정이 브라우저에 저장됩니다.
          {totalFilterCount > 0
            ? ` 현재 ${totalFilterCount}개의 활성 필터가 있습니다.`
            : ' 현재 활성 필터가 없습니다.'}
        </p>
        <button
          onClick={resetAllFilters}
          disabled={totalFilterCount === 0}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <FilterX className="h-3.5 w-3.5" />
          모든 필터 초기화
        </button>
      </div>

      {/* Server Management */}
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4 flex items-center gap-2"><Server className="h-5 w-5" /> 서버 관리</h2>
        {serverStatus ? (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4 mb-4">
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">상태</p>
              <p className="font-medium mt-1 flex items-center gap-1.5">
                <span className="h-2 w-2 rounded-full bg-green-400 inline-block" />
                실행 중
              </p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">업타임</p>
              <p className="font-medium mt-1">{formatUptime(serverStatus.uptime_seconds)}</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">메모리</p>
              <p className="font-medium mt-1">{serverStatus.memory_mb} MB</p>
            </div>
            <div className="rounded-md border border-border p-3">
              <p className="text-xs text-muted-foreground">PID / Node</p>
              <p className="font-medium mt-1">{serverStatus.pid} / {serverStatus.node_version}</p>
            </div>
          </div>
        ) : (
          <div className="animate-pulse h-16 rounded-lg bg-muted mb-4" />
        )}
        <div className="flex gap-3">
          <button
            onClick={() => refetchStatus()}
            className="cursor-pointer flex items-center gap-2 rounded-md border border-input px-4 py-2 text-sm hover:bg-accent transition-colors"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 상태 새로고침
          </button>
          <button
            onClick={() => {
              if (confirm('백엔드 서버를 재시작하시겠습니까? API가 약 2초간 중단됩니다.')) {
                restartMutation.mutate();
              }
            }}
            disabled={restartMutation.isPending}
            className="cursor-pointer flex items-center gap-2 rounded-md bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${restartMutation.isPending ? 'animate-spin' : ''}`} />
            {restartMutation.isPending ? '재시작 중...' : '서버 재시작'}
          </button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">현재 가격 ($/MTok)</h2>
        <div className="grid grid-cols-3 gap-4">
          {['haiku', 'sonnet', 'opus'].map((model) => (
            <div key={model} className="rounded-md border border-border p-3">
              <p className="font-medium capitalize mb-2">{model}</p>
              <p className="text-sm text-muted-foreground">Input: ${config?.[`pricing.${model}.input`] ?? '-'}</p>
              <p className="text-sm text-muted-foreground">Output: ${config?.[`pricing.${model}.output`] ?? '-'}</p>
            </div>
          ))}
        </div>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">예산 알림</h2>
        <div className="flex gap-4">
          <div className="flex-1">
            <label htmlFor="daily-limit" className="text-sm text-muted-foreground block mb-1">일일 한도 ($)</label>
            <input
              id="daily-limit"
              type="number"
              value={dailyLimit}
              onChange={(e) => setDailyLimit(e.target.value)}
              placeholder={config?.['budget.daily_limit'] || '0'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="monthly-limit" className="text-sm text-muted-foreground block mb-1">월간 한도 ($)</label>
            <input
              id="monthly-limit"
              type="number"
              value={monthlyLimit}
              onChange={(e) => setMonthlyLimit(e.target.value)}
              placeholder={config?.['budget.monthly_limit'] || '0'}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
          </div>
        </div>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => budgetMutation.mutate({
            daily_limit: dailyLimit ? parseFloat(dailyLimit) : undefined,
            monthly_limit: monthlyLimit ? parseFloat(monthlyLimit) : undefined,
          })}
        >
          예산 알림 저장
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">GitHub 연동</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <div className="flex-1">
              <label htmlFor="repo-owner" className="text-sm text-muted-foreground block mb-1">저장소 소유자</label>
              <input
                id="repo-owner"
                type="text"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                placeholder={githubConfig?.repo_owner || 'username'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
            <div className="flex-1">
              <label htmlFor="repo-name" className="text-sm text-muted-foreground block mb-1">저장소 이름</label>
              <input
                id="repo-name"
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                placeholder={githubConfig?.repo_name || 'repository'}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div className="flex items-center gap-6">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={githubEnabled}
                onChange={(e) => setGithubEnabled(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background"
              />
              <span className="text-sm text-muted-foreground">GitHub 연동 활성화</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={autoSync}
                onChange={(e) => setAutoSync(e.target.checked)}
                className="w-4 h-4 rounded border-input bg-background"
              />
              <span className="text-sm text-muted-foreground">자동 동기화</span>
            </label>
          </div>
          {githubConfig && (
            <p className="text-xs text-muted-foreground">
              현재: {githubConfig.repo_owner || '미설정'}/{githubConfig.repo_name || '미설정'}
              {' • '}{githubConfig.enabled ? '활성화' : '비활성화'}
              {' • '}{githubConfig.auto_sync ? '자동동기화' : '수동'}
            </p>
          )}
        </div>
        <button
          className="mt-4 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => updateGithubConfig.mutate({
            repo_owner: repoOwner || undefined,
            repo_name: repoName || undefined,
            enabled: githubEnabled,
            auto_sync: autoSync,
          })}
        >
          GitHub 설정 저장
        </button>
      </div>
      <div className="rounded-lg border border-border bg-card p-6">
        <h2 className="text-lg font-semibold mb-4">프로젝트 컨텍스트</h2>
        <div className="space-y-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={projectPath}
              onChange={(e) => setProjectPath(e.target.value)}
              placeholder="/path/to/project"
              className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm"
            />
            <button
              onClick={() => setLoadedPath(projectPath)}
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity"
            >
              불러오기
            </button>
          </div>

          {loadedPath && contextsData && (
            <div className="space-y-4">
              <div className="border border-border rounded-md p-4 space-y-2 max-h-64 overflow-y-auto">
                <h3 className="text-sm font-semibold">기존 컨텍스트</h3>
                {contextsData.items.length === 0 ? (
                  <p className="text-xs text-muted-foreground">컨텍스트가 없습니다.</p>
                ) : (
                  contextsData.items.map((ctx) => (
                    <div key={ctx.id} className="flex items-start justify-between border-b border-border pb-2">
                      <div className="flex-1">
                        <p className="text-sm font-medium">{ctx.title}</p>
                        <p className="text-xs text-muted-foreground">타입: {ctx.context_type}</p>
                        <p className="text-xs text-muted-foreground line-clamp-2">{ctx.content}</p>
                      </div>
                      <button
                        onClick={() => deleteContextMutation.mutate(ctx.id)}
                        className="ml-2 text-xs text-red-400 hover:text-red-300 cursor-pointer"
                      >
                        삭제
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="border border-border rounded-md p-4 space-y-3">
                <h3 className="text-sm font-semibold">새 컨텍스트 생성</h3>
                <div>
                  <label htmlFor="context-type" className="text-xs text-muted-foreground block mb-1">
                    타입
                  </label>
                  <select
                    id="context-type"
                    value={contextType}
                    onChange={(e) => setContextType(e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  >
                    <option value="brief">brief</option>
                    <option value="tech">tech</option>
                    <option value="architecture">architecture</option>
                    <option value="rules">rules</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="context-title" className="text-xs text-muted-foreground block mb-1">
                    제목
                  </label>
                  <input
                    id="context-title"
                    type="text"
                    value={contextTitle}
                    onChange={(e) => setContextTitle(e.target.value)}
                    placeholder="컨텍스트 제목"
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label htmlFor="context-content" className="text-xs text-muted-foreground block mb-1">
                    내용
                  </label>
                  <textarea
                    id="context-content"
                    value={contextContent}
                    onChange={(e) => setContextContent(e.target.value)}
                    placeholder="컨텍스트 내용"
                    rows={4}
                    className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
                  />
                </div>
                <button
                  onClick={() => {
                    if (!loadedPath || !contextTitle || !contextContent) return;
                    setContextMutation.mutate(
                      {
                        project_path: loadedPath,
                        context_type: contextType,
                        title: contextTitle,
                        content: contextContent,
                      },
                      {
                        onSuccess: () => {
                          setContextTitle('');
                          setContextContent('');
                        },
                      }
                    );
                  }}
                  disabled={!loadedPath || !contextTitle || !contextContent}
                  className="w-full rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground cursor-pointer hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  컨텍스트 저장
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
