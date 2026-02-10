'use client';

import { useCallback, useRef, useMemo } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  addEdge,
  useNodesState,
  useEdgesState,
  type OnConnect,
  type OnNodesChange,
  type OnEdgesChange,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode, type AgentNodeData } from './agent-node';
import { AGENT_DEFINITIONS } from '@/lib/pipeline/agents';

interface PipelineCanvasProps {
  initialNodes: Node[];
  initialEdges: Edge[];
  onNodesChange: (nodes: Node[]) => void;
  onEdgesChange: (edges: Edge[]) => void;
  onNodeSelect: (node: Node | null) => void;
}

const nodeTypes = { agent: AgentNode };

let nodeIdCounter = 0;
function getNextNodeId() {
  return `agent-${Date.now()}-${nodeIdCounter++}`;
}

export function PipelineCanvas({
  initialNodes,
  initialEdges,
  onNodesChange: onNodesChangeExternal,
  onEdgesChange: onEdgesChangeExternal,
  onNodeSelect,
}: PipelineCanvasProps) {
  const [nodes, setNodes, onNodesChangeInternal] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChangeInternal] = useEdgesState(initialEdges);
  const reactFlowInstance = useRef<ReactFlowInstance | null>(null);

  // Sync nodes/edges back to parent
  const handleNodesChange: OnNodesChange = useCallback(
    (changes) => {
      onNodesChangeInternal(changes);
      // We need to defer to get updated state
      setTimeout(() => {
        onNodesChangeExternal(reactFlowInstance.current?.getNodes() ?? []);
      }, 0);
    },
    [onNodesChangeInternal, onNodesChangeExternal],
  );

  const handleEdgesChange: OnEdgesChange = useCallback(
    (changes) => {
      onEdgesChangeInternal(changes);
      setTimeout(() => {
        onEdgesChangeExternal(reactFlowInstance.current?.getEdges() ?? []);
      }, 0);
    },
    [onEdgesChangeInternal, onEdgesChangeExternal],
  );

  const onConnect: OnConnect = useCallback(
    (params) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
      setTimeout(() => {
        onEdgesChangeExternal(reactFlowInstance.current?.getEdges() ?? []);
      }, 0);
    },
    [setEdges, onEdgesChangeExternal],
  );

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      onNodeSelect(node);
    },
    [onNodeSelect],
  );

  const onPaneClick = useCallback(() => {
    onNodeSelect(null);
  }, [onNodeSelect]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();
      const agentId = event.dataTransfer.getData('application/pipeline-agent');
      if (!agentId || !reactFlowInstance.current) return;

      const agent = AGENT_DEFINITIONS.find((a) => a.id === agentId);
      if (!agent) return;

      const position = reactFlowInstance.current.screenToFlowPosition({
        x: event.clientX,
        y: event.clientY,
      });

      const newNode: Node = {
        id: getNextNodeId(),
        type: 'agent',
        position,
        data: {
          agentType: agent.id,
          label: agent.label,
          model: agent.defaultModel,
          prompt: '',
          category: agent.category,
          color: agent.color,
        } satisfies AgentNodeData,
      };

      setNodes((nds) => [...nds, newNode]);
      setTimeout(() => {
        onNodesChangeExternal(reactFlowInstance.current?.getNodes() ?? []);
      }, 0);
    },
    [setNodes, onNodesChangeExternal],
  );

  const defaultEdgeOptions = useMemo(() => ({ animated: true, type: 'smoothstep' }), []);

  return (
    <div className="flex-1 h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={handleNodesChange}
        onEdgesChange={handleEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onDragOver={onDragOver}
        onDrop={onDrop}
        onInit={(instance) => { reactFlowInstance.current = instance; }}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        fitView
        proOptions={{ hideAttribution: true }}
        className="bg-background"
      >
        <Background gap={16} size={1} />
        <Controls position="bottom-right" />
        <MiniMap
          position="bottom-left"
          nodeColor={(node) => {
            const data = node.data as AgentNodeData;
            return data?.color ?? '#6b7280';
          }}
          maskColor="rgba(0,0,0,0.1)"
          className="!bg-card !border-border"
        />
      </ReactFlow>
    </div>
  );
}
