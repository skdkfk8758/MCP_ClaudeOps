'use client';

import { memo } from 'react';
import { Handle, Position, type NodeProps } from '@xyflow/react';
import type { AgentTier } from '@claudeops/shared';

export interface AgentNodeData {
  agentType: string;
  label: string;
  model: AgentTier;
  prompt: string;
  color: string;
  category: string;
  task_id?: number;
  status?: 'pending' | 'running' | 'completed' | 'failed';
  [key: string]: unknown;
}

const MODEL_BADGES: Record<AgentTier, { label: string; bg: string }> = {
  haiku: { label: 'H', bg: 'bg-emerald-500/20 text-emerald-400' },
  sonnet: { label: 'S', bg: 'bg-blue-500/20 text-blue-400' },
  opus: { label: 'O', bg: 'bg-purple-500/20 text-purple-400' },
};

const STATUS_RING: Record<string, string> = {
  running: 'ring-2 ring-yellow-400 animate-pulse',
  completed: 'ring-2 ring-green-400',
  failed: 'ring-2 ring-red-400',
};

function AgentNodeComponent({ data, selected }: NodeProps) {
  const nodeData = data as unknown as AgentNodeData;
  const badge = MODEL_BADGES[nodeData.model] ?? MODEL_BADGES.sonnet;
  const statusRing = nodeData.status ? STATUS_RING[nodeData.status] ?? '' : '';

  return (
    <div
      className={`rounded-lg border bg-card p-3 min-w-[160px] max-w-[200px] shadow-sm transition-all ${
        selected ? 'ring-2 ring-primary shadow-md' : statusRing
      }`}
      style={{ borderColor: nodeData.color }}
    >
      <Handle type="target" position={Position.Top} className="!bg-muted-foreground !w-2 !h-2" />
      <div className="flex items-center gap-2 mb-1">
        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: nodeData.color }} />
        <span className="text-sm font-medium truncate">{nodeData.label}</span>
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded ${badge.bg}`}>
          {badge.label}
        </span>
      </div>
      {nodeData.prompt && (
        <p className="text-[11px] text-muted-foreground line-clamp-2 leading-tight">{nodeData.prompt}</p>
      )}
      {nodeData.task_id && (
        <p className="text-[10px] text-primary mt-1">Task #{nodeData.task_id}</p>
      )}
      <Handle type="source" position={Position.Bottom} className="!bg-muted-foreground !w-2 !h-2" />
    </div>
  );
}

export const AgentNode = memo(AgentNodeComponent);
