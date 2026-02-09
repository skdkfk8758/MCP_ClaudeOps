'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskCreateDialog } from '@/components/tasks/task-create-dialog';
import { useTaskStats } from '@/lib/hooks/use-tasks';
import { Plus } from 'lucide-react';

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const { data: stats } = useTaskStats();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">작업 보드</h1>
          {stats && <p className="text-sm text-muted-foreground mt-1">총 {stats.total}개 작업 · 완료율 {stats.completion_rate}%</p>}
        </div>
        <button onClick={() => setCreateOpen(true)}
          className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity">
          <Plus className="h-4 w-4" /> 새 작업
        </button>
      </div>
      <KanbanBoard />
      <TaskCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
