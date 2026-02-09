'use client';

import { useCallback } from 'react';
import type { Task, TaskStatus } from '@claudeops/shared';
import { useTaskBoard, useMoveTask } from '@/lib/hooks/use-tasks';
import { KanbanColumn } from './kanban-column';

const COLUMNS: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done'];

export function KanbanBoard() {
  const { data: board, isLoading } = useTaskBoard();
  const moveTask = useMoveTask();

  const handleDragStart = useCallback((e: React.DragEvent, task: Task) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id: task.id, status: task.status }));
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, targetStatus: TaskStatus) => {
    e.preventDefault();
    try {
      const data = JSON.parse(e.dataTransfer.getData('text/plain')) as { id: number; status: string };
      if (data.status === targetStatus) return;
      const targetTasks = board?.[targetStatus] || [];
      moveTask.mutate({ id: data.id, status: targetStatus, position: targetTasks.length });
    } catch { /* ignore */ }
  }, [board, moveTask]);

  if (isLoading) {
    return (
      <div className="grid grid-cols-5 gap-4">
        {COLUMNS.map((col) => (
          <div key={col} className="h-96 animate-pulse rounded-lg bg-muted" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-5 gap-4">
      {COLUMNS.map((status) => (
        <KanbanColumn
          key={status}
          status={status}
          tasks={board?.[status] || []}
          onDragStart={handleDragStart}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        />
      ))}
    </div>
  );
}
