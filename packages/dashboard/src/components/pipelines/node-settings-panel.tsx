'use client';

import type { AgentTier } from '@claudeops/shared';
import type { AgentNodeData } from './agent-node';
import { X } from 'lucide-react';

interface NodeSettingsPanelProps {
  data: AgentNodeData;
  onChange: (data: Partial<AgentNodeData>) => void;
  onClose: () => void;
}

export function NodeSettingsPanel({ data, onChange, onClose }: NodeSettingsPanelProps) {
  return (
    <div className="w-72 border-l border-border bg-card h-full overflow-y-auto">
      <div className="flex items-center justify-between p-3 border-b border-border">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: data.color }} />
          <h3 className="text-sm font-semibold">{data.label}</h3>
        </div>
        <button onClick={onClose} className="cursor-pointer p-1 rounded hover:bg-accent transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="p-3 space-y-4">
        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">모델</label>
          <select
            value={data.model}
            onChange={(e) => onChange({ model: e.target.value as AgentTier })}
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          >
            <option value="haiku">Haiku (빠름, 저비용)</option>
            <option value="sonnet">Sonnet (균형)</option>
            <option value="opus">Opus (고성능)</option>
          </select>
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">프롬프트</label>
          <textarea
            value={data.prompt}
            onChange={(e) => onChange({ prompt: e.target.value })}
            rows={4}
            placeholder="이 에이전트에게 전달할 작업 내용..."
            className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-none"
          />
        </div>

        <div>
          <label className="text-xs font-medium text-muted-foreground mb-1 block">Task 연결 (선택)</label>
          <input
            type="number"
            value={data.task_id ?? ''}
            onChange={(e) => onChange({ task_id: e.target.value ? parseInt(e.target.value) : undefined })}
            placeholder="Task ID"
            className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
          />
        </div>

        <div className="pt-2 border-t border-border">
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">타입:</span> {data.agentType}
          </p>
          <p className="text-[11px] text-muted-foreground">
            <span className="font-medium">카테고리:</span> {data.category}
          </p>
        </div>
      </div>
    </div>
  );
}
