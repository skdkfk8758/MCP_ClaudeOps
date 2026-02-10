import React from 'react';
import { render, screen } from '@testing-library/react';
import { PipelineCard } from './pipeline-card';
import type { Pipeline } from '@claudeops/shared';

const { mockIcon, mockLink } = vi.hoisted(() => {
  return {
    mockIcon: (name: string) => {
      const Comp = (props: Record<string, unknown>) =>
        require('react').createElement('span', { 'data-testid': `icon-${name}`, ...props });
      Comp.displayName = name;
      return Comp;
    },
    mockLink: (props: { children: React.ReactNode; href: string; className?: string }) =>
      require('react').createElement('a', { href: props.href, className: props.className }, props.children),
  };
});

vi.mock('next/link', () => ({ default: mockLink }));

vi.mock('lucide-react', () => ({
  Layers: mockIcon('Layers'),
  Play: mockIcon('Play'),
  CheckCircle2: mockIcon('CheckCircle2'),
  XCircle: mockIcon('XCircle'),
  FileEdit: mockIcon('FileEdit'),
  Clock: mockIcon('Clock'),
}));

const basePipeline: Pipeline = {
  id: 1,
  name: 'My Pipeline',
  description: 'A test pipeline',
  epic_id: null,
  steps: [
    { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'do stuff' }] },
    { step: 2, parallel: true, agents: [{ type: 'reviewer', model: 'opus', prompt: 'review' }, { type: 'tester', model: 'haiku', prompt: 'test' }] },
  ],
  graph_data: null,
  status: 'draft',
  created_at: '2025-01-01T00:00:00Z',
  updated_at: '2025-01-01T00:00:00Z',
};

describe('PipelineCard', () => {
  it('renders pipeline name', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('My Pipeline')).toBeInTheDocument();
  });

  it('renders description', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('A test pipeline')).toBeInTheDocument();
  });

  it('renders step count', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('2단계')).toBeInTheDocument();
  });

  it('renders total agent count', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('3개 에이전트')).toBeInTheDocument();
  });

  it('renders status label for draft', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.getByText('초안')).toBeInTheDocument();
  });

  it('renders status label for running', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, status: 'running' }} />);
    expect(screen.getByText('실행 중')).toBeInTheDocument();
  });

  it('renders status label for completed', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, status: 'completed' }} />);
    expect(screen.getByText('완료')).toBeInTheDocument();
  });

  it('renders status label for failed', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, status: 'failed' }} />);
    expect(screen.getByText('실패')).toBeInTheDocument();
  });

  it('links to pipeline detail page', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/pipelines/1');
  });

  it('renders epic reference when epic_id is set', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, epic_id: 7 }} />);
    expect(screen.getByText('Epic #7')).toBeInTheDocument();
  });

  it('does not render epic reference when epic_id is null', () => {
    render(<PipelineCard pipeline={basePipeline} />);
    expect(screen.queryByText(/Epic #/)).not.toBeInTheDocument();
  });

  it('does not render description when null', () => {
    render(<PipelineCard pipeline={{ ...basePipeline, description: null }} />);
    expect(screen.queryByText('A test pipeline')).not.toBeInTheDocument();
  });
});
