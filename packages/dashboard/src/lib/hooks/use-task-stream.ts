'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { wsClient } from '@/lib/websocket';
import type { TaskStreamChunk } from '@claudeops/shared';

const MAX_CHUNKS = 1000;

export function useTaskStream(taskId: number) {
  const [chunks, setChunks] = useState<TaskStreamChunk[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const taskIdRef = useRef(taskId);
  taskIdRef.current = taskId;

  useEffect(() => {
    setChunks([]);
    setIsStreaming(false);

    const unsub = wsClient.on('task', (data: unknown, action?: string) => {
      const msg = data as Record<string, unknown>;
      if (msg.task_id !== taskIdRef.current) return;

      if (action === 'stream_chunk') {
        const newChunk: TaskStreamChunk = {
          task_id: msg.task_id as number,
          phase: (msg.phase as TaskStreamChunk['phase']) ?? 'implementation',
          chunk: (msg.chunk as string) ?? '',
          timestamp: (msg.timestamp as string) ?? new Date().toISOString(),
          step_number: msg.step_number as number | undefined,
          agent_type: msg.agent_type as string | undefined,
        };
        setIsStreaming(true);
        setChunks((prev) => {
          const next = [...prev, newChunk];
          return next.length > MAX_CHUNKS ? next.slice(-MAX_CHUNKS) : next;
        });
      }

      // 실행 완료/실패/취소 시 스트리밍 중단
      if (action === 'execution_completed' || action === 'execution_failed' || action === 'execution_cancelled' || action === 'design_completed' || action === 'design_failed') {
        setIsStreaming(false);
      }
    });

    return unsub;
  }, [taskId]);

  const clear = useCallback(() => {
    setChunks([]);
    setIsStreaming(false);
  }, []);

  return { chunks, isStreaming, clear };
}
