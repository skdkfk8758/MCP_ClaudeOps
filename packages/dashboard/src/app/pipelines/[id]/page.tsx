'use client';

import { useState, useCallback } from 'react';
import { useParams } from 'next/navigation';
import dynamic from 'next/dynamic';
import type { Node, Edge } from '@xyflow/react';
import type { PipelinePreset } from '@claudeops/shared';
import { usePipeline, useUpdatePipeline, useExecutePipeline, useCancelPipeline } from '@/lib/hooks/use-pipelines';
import { AgentPalette } from '@/components/pipelines/agent-palette';
import { NodeSettingsPanel } from '@/components/pipelines/node-settings-panel';
import { PipelineToolbar } from '@/components/pipelines/pipeline-toolbar';
import { ExecutionPanel } from '@/components/pipelines/execution-panel';
import { PresetSelector } from '@/components/pipelines/preset-selector';
import { analyzeGraph, type GraphNode, type GraphEdge } from '@/lib/pipeline/graph-analyzer';
import { exportAsJson, importFromJson } from '@/lib/pipeline/export-json';
import { AGENT_DEFINITIONS } from '@/lib/pipeline/agents';
import { Loader2, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import type { AgentNodeData } from '@/components/pipelines/agent-node';

// Dynamic import to avoid SSR issues with React Flow
const PipelineCanvas = dynamic(
  () => import('@/components/pipelines/pipeline-canvas').then(mod => ({ default: mod.PipelineCanvas })),
  { ssr: false, loading: () => <div className="flex-1 flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-muted-foreground" /></div> }
);

function parseGraphData(raw: string | null): { nodes: Node[]; edges: Edge[] } {
  if (!raw) return { nodes: [], edges: [] };
  try {
    return JSON.parse(raw);
  } catch {
    return { nodes: [], edges: [] };
  }
}

export default function PipelineEditorPage() {
  const { id } = useParams<{ id: string }>();
  const pipelineId = Number(id);

  const { data: pipeline, isLoading } = usePipeline(pipelineId);
  const updatePipeline = useUpdatePipeline();
  const executePipeline = useExecutePipeline();
  const cancelPipeline = useCancelPipeline();

  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [showExecution, setShowExecution] = useState(false);
  const [name, setName] = useState('');
  const [initialized, setInitialized] = useState(false);

  // Initialize from pipeline data once loaded
  if (pipeline && !initialized) {
    const graph = parseGraphData(pipeline.graph_data);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    setName(pipeline.name);
    setInitialized(true);
  }

  const handleNodeUpdate = useCallback((nodeId: string, data: Partial<AgentNodeData>) => {
    setNodes((nds) =>
      nds.map((n) => (n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n)),
    );
    if (selectedNode?.id === nodeId) {
      setSelectedNode((prev) => prev ? { ...prev, data: { ...prev.data, ...data } } : null);
    }
  }, [selectedNode]);

  const getStepsFromGraph = useCallback(() => {
    const graphNodes: GraphNode[] = nodes.map((n) => ({
      id: n.id,
      data: n.data as GraphNode['data'],
    }));
    const graphEdges: GraphEdge[] = edges.map((e) => ({ source: e.source, target: e.target }));
    return analyzeGraph(graphNodes, graphEdges);
  }, [nodes, edges]);

  const handleSave = async () => {
    const steps = getStepsFromGraph();
    await updatePipeline.mutateAsync({
      id: pipelineId,
      name,
      steps,
      graph_data: JSON.stringify({ nodes, edges }),
      status: steps.length > 0 ? 'ready' : 'draft',
    });
  };

  const handleExecute = async () => {
    await handleSave();
    await executePipeline.mutateAsync({
      id: pipelineId,
      project_path: '.',
    });
    setShowExecution(true);
  };

  const handleSimulate = async () => {
    await handleSave();
    await executePipeline.mutateAsync({
      id: pipelineId,
      project_path: '.',
      simulate: true,
    });
    setShowExecution(true);
  };

  const handleExportJson = () => {
    const steps = getStepsFromGraph();
    const json = exportAsJson({ name, steps });
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '-').toLowerCase()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const data = importFromJson(ev.target?.result as string);
          setName(data.name);
          loadStepsToCanvas(data.steps);
        } catch { /* invalid JSON */ }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const loadStepsToCanvas = (steps: { step: number; parallel: boolean; agents: { type: string; model: string; prompt: string; task_id?: number }[] }[]) => {
    let y = 0;
    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];
    let prevIds: string[] = [];

    for (const step of steps) {
      const currentIds: string[] = [];
      const xStart = -(step.agents.length - 1) * 110;

      step.agents.forEach((agent, i) => {
        const nodeId = `import-${step.step}-${i}`;
        const def = AGENT_DEFINITIONS.find((a) => a.id === agent.type);
        currentIds.push(nodeId);
        newNodes.push({
          id: nodeId,
          type: 'agent',
          position: { x: xStart + i * 220, y },
          data: {
            agentType: agent.type,
            label: def?.label ?? agent.type,
            model: agent.model,
            prompt: agent.prompt,
            category: def?.category ?? 'custom',
            color: def?.color ?? '#6b7280',
            ...(agent.task_id != null ? { task_id: agent.task_id } : {}),
          },
        });
      });

      for (const prevId of prevIds) {
        for (const curId of currentIds) {
          newEdges.push({ id: `e-${prevId}-${curId}`, source: prevId, target: curId, animated: true });
        }
      }

      prevIds = currentIds;
      y += 120;
    }

    setNodes(newNodes);
    setEdges(newEdges);
  };

  const handlePresetSelect = (preset: PipelinePreset) => {
    setName(preset.name);
    loadStepsToCanvas(preset.steps);
  };

  const handleAutoLayout = () => {
    if (nodes.length === 0) return;
    const steps = getStepsFromGraph();
    loadStepsToCanvas(steps);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[calc(100vh-4rem)]">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!pipeline) {
    return (
      <div className="flex flex-col items-center justify-center h-[calc(100vh-4rem)] gap-4">
        <p className="text-muted-foreground">파이프라인을 찾을 수 없습니다</p>
        <Link href="/pipelines" className="text-sm text-primary hover:underline">
          목록으로 돌아가기
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] -m-6">
      <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-card">
        <Link href="/pipelines" className="cursor-pointer rounded p-1 hover:bg-accent transition-colors">
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <span className="text-sm text-muted-foreground">#{pipeline.id}</span>
        <div className="flex-1" />
        <PresetSelector onSelect={handlePresetSelect} />
      </div>

      <PipelineToolbar
        name={name}
        onNameChange={setName}
        onSave={handleSave}
        onExecute={handleExecute}
        onSimulate={handleSimulate}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onAutoLayout={handleAutoLayout}
        saving={updatePipeline.isPending}
        executing={executePipeline.isPending}
        hasChanges={initialized}
      />

      <div className="flex flex-1 overflow-hidden">
        <AgentPalette onDragStart={() => {}} />
        <PipelineCanvas
          initialNodes={nodes}
          initialEdges={edges}
          onNodesChange={setNodes}
          onEdgesChange={setEdges}
          onNodeSelect={setSelectedNode}
        />
        {selectedNode && (
          <NodeSettingsPanel
            data={selectedNode.data as unknown as AgentNodeData}
            onChange={(updates) => handleNodeUpdate(selectedNode.id, updates)}
            onClose={() => setSelectedNode(null)}
          />
        )}
        {showExecution && (
          <ExecutionPanel
            pipelineId={pipelineId}
            onClose={() => setShowExecution(false)}
          />
        )}
      </div>
    </div>
  );
}
