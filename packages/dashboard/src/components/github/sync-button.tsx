'use client';

import { useState } from 'react';
import { useSyncEpicToGitHub, useSyncTaskToGitHub } from '@/lib/hooks/use-github';

interface SyncButtonProps {
  type: 'epic' | 'task';
  id: number;
  githubUrl?: string | null;
  size?: 'sm' | 'md';
}

export function GitHubSyncButton({ type, id, githubUrl, size = 'sm' }: SyncButtonProps) {
  const [syncing, setSyncing] = useState(false);
  const syncEpic = useSyncEpicToGitHub();
  const syncTask = useSyncTaskToGitHub();

  const handleSync = async () => {
    setSyncing(true);
    try {
      if (type === 'epic') await syncEpic.mutateAsync(id);
      else await syncTask.mutateAsync(id);
    } catch {
      // error handled by mutation
    } finally {
      setSyncing(false);
    }
  };

  const sizeClasses = size === 'sm' ? 'px-2 py-1 text-xs' : 'px-3 py-1.5 text-sm';
  const iconSize = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

  return (
    <div className="flex items-center gap-1">
      {githubUrl && (
        <a
          href={githubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gray-400 hover:text-white transition-colors"
          title="GitHub Issue 열기"
        >
          <svg className={iconSize} fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
          </svg>
        </a>
      )}
      <button
        onClick={handleSync}
        disabled={syncing}
        className={`${sizeClasses} rounded border border-gray-600 text-gray-300 hover:bg-gray-700 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed`}
        title={githubUrl ? 'GitHub 동기화 업데이트' : 'GitHub에 동기화'}
      >
        {syncing ? '동기화...' : githubUrl ? '동기화' : 'GH 연결'}
      </button>
    </div>
  );
}
