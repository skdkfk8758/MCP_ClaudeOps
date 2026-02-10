'use client';

import { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import {
  ReactFlow,
  Background,
  Controls,
  useNodesState,
  useEdgesState,
  addEdge,
  type Node,
  type Edge,
  type Connection,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AgentNode, type AgentNodeData } from '@/components/pipelines/agent-node';
import { NodeSettingsPanel } from '@/components/pipelines/node-settings-panel';
import { AGENT_DEFINITIONS, AGENT_CATEGORIES } from '@/lib/pipeline/agents';
import { analyzeGraph, type GraphNode, type GraphEdge } from '@/lib/pipeline/graph-analyzer';
import type { DesignStep } from '@claudeops/shared';
import {
  Pencil, Save, X, Plus, AlignVerticalSpaceAround,
  Loader2,
} from 'lucide-react';

const nodeTypes = { agent: AgentNode };

// --- 변환 함수 ---

/** DesignStep[] -> 레벨 기반 그룹핑 */
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

/** DesignStep[] → ReactFlow nodes/edges */
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

      // scope_tag에 따라 테두리 색상 오버라이드
      const scopeColor = step.scope_tag === 'out-of-scope' ? '#ef4444'
        : step.scope_tag === 'partial' ? '#f59e0b'
        : undefined;

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
          color: scopeColor ?? def?.color ?? '#6b7280',
          scopeTag: step.scope_tag,
          // 편집 시 원본 DesignStep 데이터 보존
          _designStep: step,
        },
      });
    });

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

/** ReactFlow nodes/edges → DesignStep[] (역변환) */
function graphToDesignSteps(nodes: Node[], edges: Edge[]): DesignStep[] {
  if (nodes.length === 0) return [];

  // analyzeGraph를 사용해 위상 정렬
  const graphNodes: GraphNode[] = nodes.map((n) => ({
    id: n.id,
    data: {
      agentType: (n.data as AgentNodeData).agentType,
      model: (n.data as AgentNodeData).model,
      prompt: (n.data as AgentNodeData).prompt,
    },
  }));

  const graphEdges: GraphEdge[] = edges.map((e) => ({
    source: e.source,
    target: e.target,
  }));

  const pipelineSteps = analyzeGraph(graphNodes, graphEdges);

  // PipelineStep[] → DesignStep[]
  const designSteps: DesignStep[] = [];
  let stepNumber = 1;

  for (const ps of pipelineSteps) {
    for (const agent of ps.agents) {
      // 노드에서 원본 DesignStep 데이터 찾기
      const node = nodes.find(
        (n) =>
          (n.data as AgentNodeData).agentType === agent.type &&
          (n.data as AgentNodeData).prompt === agent.prompt,
      );
      const original = node?.data?._designStep as DesignStep | undefined;

      designSteps.push({
        step: stepNumber++,
        title: agent.prompt || original?.title || '',
        agent_type: agent.type,
        model: agent.model,
        parallel: ps.parallel,
        description: original?.description || '',
        prompt: original?.prompt || agent.prompt || '',
        expected_output: original?.expected_output || '',
      });
    }
  }

  return designSteps;
}

// --- 컴포넌트 ---

interface DesignFlowEditorProps {
  steps: DesignStep[];
  onSave: (steps: DesignStep[]) => void;
  saving?: boolean;
}

export function DesignFlowEditor({ steps, onSave, saving }: DesignFlowEditorProps) {
  const [editing, setEditing] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const nodeIdCounter = useRef(0);

  // 읽기 전용 그래프 (미리보기)
  const readonlyGraph = useMemo(() => designStepsToGraph(steps), [steps]);

  // 편집용 상태
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // 편집 시작
  const handleStartEdit = useCallback(() => {
    const graph = designStepsToGraph(steps);
    setNodes(graph.nodes);
    setEdges(graph.edges);
    nodeIdCounter.current = graph.nodes.length;
    setSelectedNodeId(null);
    setEditing(true);
  }, [steps, setNodes, setEdges]);

  // 편집 취소
  const handleCancel = useCallback(() => {
    setEditing(false);
    setSelectedNodeId(null);
    setAddMenuOpen(false);
  }, []);

  // 저장
  const handleSave = useCallback(() => {
    const designSteps = graphToDesignSteps(nodes, edges);
    onSave(designSteps);
    setEditing(false);
    setSelectedNodeId(null);
  }, [nodes, edges, onSave]);

  // 엣지 연결
  const onConnect = useCallback(
    (params: Connection) => {
      setEdges((eds) => addEdge({ ...params, animated: true }, eds));
    },
    [setEdges],
  );

  // 노드 클릭 → 설정 패널
  const onNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    setSelectedNodeId(node.id);
  }, []);

  // 배경 클릭 → 패널 닫기
  const onPaneClick = useCallback(() => {
    setSelectedNodeId(null);
  }, []);

  // 노드 삭제 (Delete 키)
  const onNodesDelete = useCallback(
    (deleted: Node[]) => {
      const deletedIds = new Set(deleted.map((n) => n.id));
      setEdges((eds) => eds.filter((e) => !deletedIds.has(e.source) && !deletedIds.has(e.target)));
      if (selectedNodeId && deletedIds.has(selectedNodeId)) {
        setSelectedNodeId(null);
      }
    },
    [selectedNodeId, setEdges],
  );

  // 노드 설정 변경
  const handleNodeDataChange = useCallback(
    (partial: Partial<AgentNodeData>) => {
      if (!selectedNodeId) return;
      setNodes((nds) =>
        nds.map((n) => {
          if (n.id !== selectedNodeId) return n;
          return { ...n, data: { ...n.data, ...partial } };
        }),
      );
    },
    [selectedNodeId, setNodes],
  );

  // 에이전트 추가
  const handleAddAgent = useCallback(
    (agentId: string) => {
      const def = AGENT_DEFINITIONS.find((a) => a.id === agentId);
      if (!def) return;

      const id = `design-new-${nodeIdCounter.current++}`;
      // 마지막 노드 아래에 배치
      const maxY = nodes.reduce((max, n) => Math.max(max, n.position.y), 0);

      const newNode: Node = {
        id,
        type: 'agent',
        position: { x: 0, y: maxY + 120 },
        data: {
          agentType: def.id,
          label: def.label,
          model: def.defaultModel,
          prompt: '',
          category: def.category,
          color: def.color,
          _designStep: {
            step: 0,
            title: '',
            agent_type: def.id,
            model: def.defaultModel,
            parallel: false,
            description: '',
            prompt: '',
            expected_output: '',
          },
        },
      };

      setNodes((nds) => [...nds, newNode]);

      // 마지막 노드와 자동 연결
      if (nodes.length > 0) {
        const lastNodes = nodes.filter(
          (n) => !edges.some((e) => e.source === n.id),
        );
        if (lastNodes.length > 0) {
          const newEdges = lastNodes.map((ln) => ({
            id: `e-${ln.id}-${id}`,
            source: ln.id,
            target: id,
            animated: true,
          }));
          setEdges((eds) => [...eds, ...newEdges]);
        }
      }

      setAddMenuOpen(false);
      setSelectedNodeId(id);
    },
    [nodes, edges, setNodes, setEdges],
  );

  // 자동 정렬
  const handleAutoLayout = useCallback(() => {
    const currentSteps = graphToDesignSteps(nodes, edges);
    const graph = designStepsToGraph(currentSteps);
    setNodes(graph.nodes);
    setEdges(graph.edges);
  }, [nodes, edges, setNodes, setEdges]);

  // 선택된 노드 데이터
  const selectedNode = selectedNodeId ? nodes.find((n) => n.id === selectedNodeId) : null;
  // ESC 키로 모달 닫기
  useEffect(() => {
    if (!editing) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleCancel();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [editing, handleCancel]);

  // 모달 열릴 때 body 스크롤 방지
  useEffect(() => {
    if (editing) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [editing]);

  if (readonlyGraph.nodes.length === 0 && !editing) return null;

  return (
    <div className="space-y-2">
      {/* 미리보기 모드 (항상 렌더링) */}
      <div className="relative group">
        <div className="h-[300px] rounded-md border border-border bg-background/50 overflow-hidden">
          <ReactFlow
            nodes={readonlyGraph.nodes}
            edges={readonlyGraph.edges}
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
        <button
          onClick={handleStartEdit}
          className="cursor-pointer absolute top-2 right-2 flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground opacity-0 group-hover:opacity-100 transition-opacity hover:opacity-100 shadow-sm"
        >
          <Pencil className="h-3 w-3" /> 편집
        </button>
      </div>

      {/* 편집 모드 - 풀스크린 모달 */}
      {editing && (
        <div
          className="fixed inset-0 z-50 flex flex-col bg-black/50 backdrop-blur-sm"
          onClick={handleCancel}
        >
          <div
            className="m-4 flex flex-1 flex-col rounded-lg border border-border bg-card shadow-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* 모달 헤더 */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-muted/30">
              <div className="flex items-center gap-2">
                <Pencil className="h-3.5 w-3.5 text-primary" />
                <span className="text-sm font-medium">플로우 편집</span>
              </div>
              <div className="flex items-center gap-1.5">
                {/* 에이전트 추가 */}
                <div className="relative">
                  <button
                    onClick={() => setAddMenuOpen(!addMenuOpen)}
                    className="cursor-pointer flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent transition-colors"
                  >
                    <Plus className="h-3 w-3" /> 에이전트 추가
                  </button>
                  {addMenuOpen && (
                    <div className="absolute right-0 top-full mt-1 z-50 w-64 max-h-72 overflow-y-auto rounded-md border border-border bg-card shadow-lg">
                      {AGENT_CATEGORIES.map((cat) => {
                        const agents = AGENT_DEFINITIONS.filter((a) => a.category === cat.id);
                        if (agents.length === 0) return null;
                        return (
                          <div key={cat.id}>
                            <div className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground bg-muted/50">
                              {cat.label}
                            </div>
                            {agents.map((agent) => (
                              <button
                                key={agent.id}
                                onClick={() => handleAddAgent(agent.id)}
                                className="cursor-pointer w-full flex items-center gap-2 px-3 py-1.5 text-xs hover:bg-accent transition-colors text-left"
                              >
                                <div
                                  className="w-2 h-2 rounded-full shrink-0"
                                  style={{ backgroundColor: agent.color }}
                                />
                                <span className="font-medium">{agent.label}</span>
                                <span className="text-muted-foreground truncate ml-auto text-[10px]">
                                  {agent.description}
                                </span>
                              </button>
                            ))}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

                <button
                  onClick={handleAutoLayout}
                  className="cursor-pointer flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent transition-colors"
                  title="자동 정렬"
                >
                  <AlignVerticalSpaceAround className="h-3 w-3" />
                </button>

                <div className="w-px h-4 bg-border mx-1" />

                <button
                  onClick={handleCancel}
                  className="cursor-pointer flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent transition-colors"
                >
                  <X className="h-3 w-3" /> 취소
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
                >
                  {saving ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Save className="h-3 w-3" />
                  )}
                  저장
                </button>
              </div>
            </div>

            {/* 모달 바디 - ReactFlow + 설정 패널 */}
            <div className="flex flex-1 min-h-0">
              <div className={`flex-1 ${selectedNode ? '' : 'w-full'}`}>
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  nodeTypes={nodeTypes}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onPaneClick={onPaneClick}
                  onNodesDelete={onNodesDelete}
                  nodesDraggable={true}
                  nodesConnectable={true}
                  elementsSelectable={true}
                  deleteKeyCode="Delete"
                  fitView
                  fitViewOptions={{ padding: 0.3 }}
                  proOptions={{ hideAttribution: true }}
                >
                  <Background gap={16} size={1} />
                  <Controls showInteractive={false} />
                </ReactFlow>
              </div>

              {/* 설정 패널 */}
              {selectedNode && (
                <NodeSettingsPanel
                  data={selectedNode.data as AgentNodeData}
                  onChange={handleNodeDataChange}
                  onClose={() => setSelectedNodeId(null)}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
