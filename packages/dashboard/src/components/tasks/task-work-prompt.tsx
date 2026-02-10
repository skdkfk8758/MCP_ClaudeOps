'use client';

import { useState } from 'react';
import { useUpdateTask, useDesignTask } from '@/lib/hooks/use-tasks';
import { Sparkles, Save } from 'lucide-react';
import type { Task } from '@claudeops/shared';

export function TaskWorkPrompt({ task, projectPath }: { task: Task; projectPath: string }) {
  const [prompt, setPrompt] = useState(task.work_prompt || '');
  const updateTask = useUpdateTask();
  const designTask = useDesignTask();

  const isReadOnly = task.status !== 'todo' && task.status !== 'backlog';
  const isDesigning = task.design_status === 'running';

  const handleSave = () => {
    updateTask.mutate({ id: task.id, work_prompt: prompt });
  };

  const handleDesign = () => {
    if (!prompt.trim() || !projectPath.trim()) return;
    designTask.mutate({ id: task.id, project_path: projectPath, work_prompt: prompt });
  };

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <h3 className="text-sm font-semibold text-muted-foreground">작업 프롬프트</h3>
      <textarea
        value={prompt}
        onChange={(e) => setPrompt(e.target.value)}
        readOnly={isReadOnly}
        placeholder="이 태스크에서 구현할 내용을 상세히 설명하세요..."
        className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm resize-y disabled:opacity-50"
        disabled={isReadOnly}
      />
      {!isReadOnly && (
        <div className="flex justify-end gap-2">
          <button
            onClick={handleSave}
            disabled={updateTask.isPending}
            className="cursor-pointer flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" /> 저장
          </button>
          <button
            onClick={handleDesign}
            disabled={!prompt.trim() || !projectPath.trim() || designTask.isPending || isDesigning}
            className="cursor-pointer flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            <Sparkles className="h-3.5 w-3.5" /> {isDesigning ? '설계 중...' : '설계하기'}
          </button>
        </div>
      )}
    </div>
  );
}
