'use client';

import { useState } from 'react';
import { KanbanBoard } from '@/components/tasks/kanban-board';
import { TaskCreateDialog } from '@/components/tasks/task-create-dialog';
import { useTaskStats } from '@/lib/hooks/use-tasks';
import { useEpics } from '@/lib/hooks/use-epics';
import { Plus } from 'lucide-react';

export default function TasksPage() {
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedEpicId, setSelectedEpicId] = useState<number | undefined>();
  const { data: stats } = useTaskStats();
  const { data: epicsData } = useEpics();

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
      <div className="flex items-center gap-4">
        <label htmlFor="epic-filter" className="text-sm text-muted-foreground">에픽 필터:</label>
        <select id="epic-filter" value={selectedEpicId || ''} onChange={(e) => setSelectedEpicId(e.target.value ? parseInt(e.target.value) : undefined)}
          className="max-w-xs rounded-md border border-input bg-background px-3 py-2 text-sm">
          <option value="">모든 에픽</option>
          {epicsData?.items.map((epic) => (
            <option key={epic.id} value={epic.id}>{epic.title}</option>
          ))}
        </select>
      </div>
      <KanbanBoard />
      <TaskCreateDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  );
}
