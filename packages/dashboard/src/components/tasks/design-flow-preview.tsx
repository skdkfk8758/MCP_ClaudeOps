'use client';

import { useMemo } from 'react';
import {
  ReactFlow,
  Background,
  type Node,
  type Edge,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode } from '@/components/pipelines/agent-node';
import { AGENT_DEFINITIONS } from '@/lib/pipeline/agents';
import type { DesignStep } from '@claudeops/shared';

const nodeTypes = { agent: AgentNode };

/**
 * DesignStep[] -> 레벨 기반 그룹핑
 * 연속된 parallel=true 스텝을 한 레벨로 묶고, parallel=false는 개별 레벨
 */
function groupStepsIntoLevels(steps: DesignStep[]): DesignStep[][] {
  const levels: DesignStep[][] = [];
  let currentGroup: DesignStep[] = [];

  for (const step of steps) {
    if (step.parallel) {
      currentGroup.push(step);
    } else {
      if (currentGroup.length > 0) {
        levels.push(currentGroup);
        currentGroup = [];
      }
      levels.push([step]);
    }
  }
  if (currentGroup.length > 0) {
    levels.push(currentGroup);
  }

  return levels;
}

function designStepsToGraph(steps: DesignStep[]): { nodes: Node[]; edges: Edge[] } {
  const levels = groupStepsIntoLevels(steps);
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  let prevIds: string[] = [];

  levels.forEach((level, levelIdx) => {
    const currentIds: string[] = [];
    const xStart = -(level.length - 1) * 110;

    level.forEach((step, i) => {
      const nodeId = `design-${levelIdx}-${i}`;
      const def = AGENT_DEFINITIONS.find((a) => a.id === step.agent_type);
      currentIds.push(nodeId);

      nodes.push({
        id: nodeId,
        type: 'agent',
        position: { x: xStart + i * 220, y: levelIdx * 120 },
        data: {
          agentType: step.agent_type,
          label: def?.label ?? step.agent_type,
          model: step.model,
          prompt: step.title,
          category: def?.category ?? 'custom',
          color: def?.color ?? '#6b7280',
        },
      });
    });

    // 이전 레벨 -> 현재 레벨 엣지
    for (const prevId of prevIds) {
      for (const curId of currentIds) {
        edges.push({
          id: `e-${prevId}-${curId}`,
          source: prevId,
          target: curId,
          animated: true,
        });
      }
    }

    prevIds = currentIds;
  });

  return { nodes, edges };
}

export function DesignFlowPreview({ steps }: { steps: DesignStep[] }) {
  const { nodes, edges } = useMemo(() => designStepsToGraph(steps), [steps]);

  if (nodes.length === 0) return null;

  return (
    <div className="h-[300px] rounded-md border border-border bg-background/50 overflow-hidden">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        nodesDraggable={false}
        nodesConnectable={false}
        elementsSelectable={false}
        panOnDrag={true}
        zoomOnScroll={true}
        fitView
        fitViewOptions={{ padding: 0.3 }}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={16} size={1} />
      </ReactFlow>
    </div>
  );
}
