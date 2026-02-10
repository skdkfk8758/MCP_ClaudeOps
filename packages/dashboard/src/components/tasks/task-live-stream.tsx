'use client';

import { useEffect, useRef } from 'react';
import { useTaskStream } from '@/lib/hooks/use-task-stream';
import { Loader2, Terminal } from 'lucide-react';
import type { Task } from '@claudeops/shared';

const PHASE_COLORS: Record<string, string> = {
  design: 'text-blue-400',
  implementation: 'text-green-400',
  verification: 'text-yellow-400',
};

const PHASE_LABELS: Record<string, string> = {
  design: '설계',
  implementation: '구현',
  verification: '검증',
};

export function TaskLiveStream({ task }: { task: Task }) {
  const { chunks, isStreaming, clear } = useTaskStream(task.id);
  const bottomRef = useRef<HTMLDivElement>(null);

  // 자동스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chunks.length]);

  const isRunning = task.execution_status === 'running' || task.design_status === 'running';
  if (!isRunning && chunks.length === 0) return null;

  return (
    <div className="rounded-lg border border-border bg-card overflow-hidden">
      {/* 헤더 */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-border bg-zinc-950">
        <div className="flex items-center gap-2">
          <Terminal className="h-3.5 w-3.5 text-green-400" />
          <span className="text-sm font-medium text-zinc-300">실시간 출력</span>
          {isStreaming && (
            <span className="flex items-center gap-1 text-xs text-yellow-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              스트리밍 중...
            </span>
          )}
        </div>
        {chunks.length > 0 && (
          <button
            onClick={clear}
            className="cursor-pointer text-xs text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            지우기
          </button>
        )}
      </div>

      {/* 터미널 영역 */}
      <div className="bg-zinc-950 p-4 max-h-96 overflow-y-auto font-mono text-xs leading-relaxed">
        {chunks.length === 0 && isRunning && (
          <div className="flex items-center gap-2 text-zinc-500">
            <Loader2 className="h-3 w-3 animate-spin" />
            <span>출력 대기 중...</span>
          </div>
        )}
        {chunks.map((chunk, i) => (
          <div key={i} className="flex gap-2">
            {/* phase 뱃지 */}
            {chunk.agent_type && (
              <span className="shrink-0 text-zinc-600">[{chunk.agent_type}]</span>
            )}
            <span className={PHASE_COLORS[chunk.phase] || 'text-zinc-300'}>
              {chunk.chunk}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      {/* 하단 상태 바 */}
      {chunks.length > 0 && (
        <div className="flex items-center justify-between px-4 py-1.5 border-t border-zinc-800 bg-zinc-950 text-xs text-zinc-500">
          <span>{chunks.length}개 청크</span>
          {chunks.length > 0 && (
            <span>
              {PHASE_LABELS[chunks[chunks.length - 1].phase] || chunks[chunks.length - 1].phase}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
