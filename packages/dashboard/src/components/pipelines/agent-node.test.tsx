import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

// Mock @xyflow/react
vi.mock('@xyflow/react', () => ({
  Handle: ({ type, position, ...props }: Record<string, unknown>) => (
    <div data-testid={`handle-${type}`} {...props} />
  ),
  Position: { Top: 'top', Bottom: 'bottom' },
  memo: (fn: unknown) => fn,
}));

// Import after mock
import { AgentNode, type AgentNodeData } from './agent-node';

function renderNode(dataOverrides: Partial<AgentNodeData> = {}, selected = false) {
  const defaultData: AgentNodeData = {
    agentType: 'executor',
    label: 'Executor',
    model: 'sonnet',
    prompt: 'Implement the feature',
    color: '#3b82f6',
    category: 'build',
  };
  const data = { ...defaultData, ...dataOverrides };
  // NodeProps shape
  const props = {
    id: 'node-1',
    data,
    selected,
    type: 'agent',
    isConnectable: true,
    zIndex: 0,
    positionAbsoluteX: 0,
    positionAbsoluteY: 0,
  } as never;
  return render(<AgentNode {...props} />);
}

describe('AgentNode', () => {
  it('renders agent label', () => {
    renderNode();
    expect(screen.getByText('Executor')).toBeInTheDocument();
  });

  it('renders model badge for sonnet', () => {
    renderNode({ model: 'sonnet' });
    expect(screen.getByText('S')).toBeInTheDocument();
  });

  it('renders model badge for haiku', () => {
    renderNode({ model: 'haiku' });
    expect(screen.getByText('H')).toBeInTheDocument();
  });

  it('renders model badge for opus', () => {
    renderNode({ model: 'opus' });
    expect(screen.getByText('O')).toBeInTheDocument();
  });

  it('renders prompt text', () => {
    renderNode({ prompt: 'Do some work' });
    expect(screen.getByText('Do some work')).toBeInTheDocument();
  });

  it('does not render prompt when empty', () => {
    renderNode({ prompt: '' });
    expect(screen.queryByText('Do some work')).not.toBeInTheDocument();
  });

  it('renders task_id link when present', () => {
    renderNode({ task_id: 42 });
    expect(screen.getByText('Task #42')).toBeInTheDocument();
  });

  it('does not render task_id when absent', () => {
    renderNode({ task_id: undefined });
    expect(screen.queryByText(/Task #/)).not.toBeInTheDocument();
  });

  it('renders handles for connections', () => {
    renderNode();
    expect(screen.getByTestId('handle-target')).toBeInTheDocument();
    expect(screen.getByTestId('handle-source')).toBeInTheDocument();
  });

  it('applies ring-primary when selected', () => {
    const { container } = renderNode({}, true);
    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('ring-primary');
  });

  it('applies status ring when running', () => {
    const { container } = renderNode({ status: 'running' });
    const node = container.firstChild as HTMLElement;
    expect(node.className).toContain('ring-yellow-400');
  });

  it('applies border color from data', () => {
    const { container } = renderNode({ color: '#ff0000' });
    const node = container.firstChild as HTMLElement;
    expect(node.style.borderColor).toBe('rgb(255, 0, 0)');
  });
});
