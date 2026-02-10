import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';

// Capture props passed to ReactFlow
let capturedProps: Record<string, unknown> = {};

vi.mock('@xyflow/react', () => {
  const useNodesState = (initial: unknown[]) => {
    let nodes = [...initial] as unknown[];
    const setNodes = vi.fn((updater: unknown) => {
      if (typeof updater === 'function') {
        nodes = (updater as (prev: unknown[]) => unknown[])(nodes);
      } else {
        nodes = updater as unknown[];
      }
    });
    const onNodesChange = vi.fn();
    return [nodes, setNodes, onNodesChange];
  };

  const useEdgesState = (initial: unknown[]) => {
    let edges = [...initial] as unknown[];
    const setEdges = vi.fn((updater: unknown) => {
      if (typeof updater === 'function') {
        edges = (updater as (prev: unknown[]) => unknown[])(edges);
      } else {
        edges = updater as unknown[];
      }
    });
    const onEdgesChange = vi.fn();
    return [edges, setEdges, onEdgesChange];
  };

  return {
    ReactFlow: ({ children, ...props }: Record<string, unknown> & { children?: React.ReactNode }) => {
      capturedProps = props;
      return (
        <div data-testid="react-flow" onClick={() => (props.onPaneClick as () => void)?.()}>
          <div data-testid="flow-drop-zone"
            onDragOver={(e) => (props.onDragOver as (e: React.DragEvent) => void)?.(e)}
            onDrop={(e) => (props.onDrop as (e: React.DragEvent) => void)?.(e)}
          />
          {(props.nodes as { id: string; data: { label: string } }[])?.map((n) => (
            <div
              key={n.id}
              data-testid={`node-${n.id}`}
              onClick={(e) => (props.onNodeClick as (e: React.MouseEvent, node: unknown) => void)?.(e, n)}
            >
              {n.data?.label}
            </div>
          ))}
          {children}
        </div>
      );
    },
    Background: () => <div data-testid="background" />,
    Controls: () => <div data-testid="controls" />,
    MiniMap: (props: Record<string, unknown>) => {
      // Exercise nodeColor callback
      const nodeColorFn = props.nodeColor as ((node: unknown) => string) | undefined;
      if (nodeColorFn) {
        nodeColorFn({ data: { color: '#3b82f6' } });
        nodeColorFn({ data: {} });
      }
      return <div data-testid="minimap" />;
    },
    addEdge: vi.fn((params: unknown, edges: unknown[]) => [...edges, params]),
    useNodesState,
    useEdgesState,
  };
});

vi.mock('./agent-node', () => ({
  AgentNode: () => <div />,
}));

vi.mock('@/lib/pipeline/agents', () => ({
  AGENT_DEFINITIONS: [
    { id: 'executor', label: 'Executor', defaultModel: 'sonnet', category: 'build', color: '#3b82f6', description: 'Execute tasks' },
    { id: 'planner', label: 'Planner', defaultModel: 'opus', category: 'plan', color: '#8b5cf6', description: 'Plan work' },
  ],
}));

import { PipelineCanvas } from './pipeline-canvas';

function renderCanvas(overrides: Partial<Parameters<typeof PipelineCanvas>[0]> = {}) {
  const defaultProps = {
    initialNodes: [
      { id: 'n1', type: 'agent', position: { x: 0, y: 0 }, data: { label: 'Node 1', agentType: 'executor', model: 'sonnet', prompt: '', category: 'build', color: '#3b82f6' } },
    ],
    initialEdges: [
      { id: 'e1', source: 'n1', target: 'n2' },
    ],
    onNodesChange: vi.fn(),
    onEdgesChange: vi.fn(),
    onNodeSelect: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  return { ...render(<PipelineCanvas {...props} />), props };
}

describe('PipelineCanvas', () => {
  beforeEach(() => {
    capturedProps = {};
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders ReactFlow container', () => {
    renderCanvas();
    expect(screen.getByTestId('react-flow')).toBeInTheDocument();
  });

  it('renders Background, Controls, MiniMap', () => {
    renderCanvas();
    expect(screen.getByTestId('background')).toBeInTheDocument();
    expect(screen.getByTestId('controls')).toBeInTheDocument();
    expect(screen.getByTestId('minimap')).toBeInTheDocument();
  });

  it('renders initial nodes', () => {
    renderCanvas();
    expect(screen.getByText('Node 1')).toBeInTheDocument();
  });

  it('passes fitView and proOptions to ReactFlow', () => {
    renderCanvas();
    expect(capturedProps.fitView).toBe(true);
    expect(capturedProps.proOptions).toEqual({ hideAttribution: true });
  });

  it('passes defaultEdgeOptions to ReactFlow', () => {
    renderCanvas();
    expect(capturedProps.defaultEdgeOptions).toEqual({ animated: true, type: 'smoothstep' });
  });

  it('calls onNodeSelect when node clicked', () => {
    const { props } = renderCanvas();
    const node = screen.getByTestId('node-n1');
    fireEvent.click(node);
    expect(props.onNodeSelect).toHaveBeenCalled();
  });

  it('calls onNodeSelect(null) when pane clicked', () => {
    const { props } = renderCanvas();
    fireEvent.click(screen.getByTestId('react-flow'));
    expect(props.onNodeSelect).toHaveBeenCalledWith(null);
  });

  it('handles drag over', () => {
    renderCanvas();
    const dropZone = screen.getByTestId('flow-drop-zone');
    fireEvent.dragOver(dropZone, {
      dataTransfer: { dropEffect: '' },
    });
  });

  it('handles onNodesChange callback', () => {
    renderCanvas();
    const onNodesChange = capturedProps.onNodesChange as (changes: unknown[]) => void;
    expect(onNodesChange).toBeDefined();
    onNodesChange([{ type: 'position', id: 'n1' }]);
    vi.runAllTimers();
  });

  it('handles onEdgesChange callback', () => {
    renderCanvas();
    const onEdgesChange = capturedProps.onEdgesChange as (changes: unknown[]) => void;
    expect(onEdgesChange).toBeDefined();
    onEdgesChange([{ type: 'remove', id: 'e1' }]);
    vi.runAllTimers();
  });

  it('handles onConnect callback', () => {
    renderCanvas();
    const onConnect = capturedProps.onConnect as (params: unknown) => void;
    expect(onConnect).toBeDefined();
    onConnect({ source: 'n1', target: 'n2' });
    vi.runAllTimers();
  });

  it('handles onInit callback', () => {
    renderCanvas();
    const onInit = capturedProps.onInit as (instance: unknown) => void;
    expect(onInit).toBeDefined();
    onInit({ getNodes: vi.fn(() => []), getEdges: vi.fn(() => []) });
  });

  it('applies bg-background class', () => {
    renderCanvas();
    expect(capturedProps.className).toBe('bg-background');
  });
});
