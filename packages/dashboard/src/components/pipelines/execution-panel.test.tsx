import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExecutionPanel } from './execution-panel';

const mockExecutionsDefault = [
  {
    id: 1,
    pipeline_id: 10,
    status: 'running' as const,
    current_step: 2,
    total_steps: 3,
    started_at: '2025-01-01T00:00:00Z',
    completed_at: null,
    results: [
      {
        step: 1,
        status: 'completed' as const,
        agents: [{ type: 'planner', status: 'completed' as const }],
      },
      {
        step: 2,
        status: 'running' as const,
        agents: [
          { type: 'executor', status: 'running' as const },
          { type: 'tester', status: 'pending' as const },
        ],
      },
      {
        step: 3,
        status: 'pending' as const,
        agents: [{ type: 'reviewer', status: 'pending' as const }],
      },
    ],
  },
];

let mockReturnData: typeof mockExecutionsDefault | never[] = mockExecutionsDefault;

vi.mock('@/lib/hooks/use-pipeline-execution', () => ({
  usePipelineExecutions: () => ({ data: mockReturnData }),
}));

const { mockIcon } = vi.hoisted(() => ({
  mockIcon: (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      require('react').createElement('span', { 'data-testid': `icon-${name}`, ...props });
    Comp.displayName = name;
    return Comp;
  },
}));

vi.mock('lucide-react', () => ({
  CheckCircle2: mockIcon('CheckCircle2'),
  XCircle: mockIcon('XCircle'),
  Loader2: mockIcon('Loader2'),
  Clock: mockIcon('Clock'),
  X: mockIcon('X'),
}));

describe('ExecutionPanel', () => {
  beforeEach(() => {
    mockReturnData = mockExecutionsDefault;
  });

  it('renders panel header', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('실행 상태')).toBeInTheDocument();
  });

  it('renders execution progress', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('2/3 단계')).toBeInTheDocument();
  });

  it('renders execution status label', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    const labels = screen.getAllByText('실행 중');
    expect(labels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders step results', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('Step 1')).toBeInTheDocument();
    expect(screen.getByText('Step 2')).toBeInTheDocument();
    expect(screen.getByText('Step 3')).toBeInTheDocument();
  });

  it('renders agent types', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('planner')).toBeInTheDocument();
    expect(screen.getByText('executor')).toBeInTheDocument();
    expect(screen.getByText('tester')).toBeInTheDocument();
    expect(screen.getByText('reviewer')).toBeInTheDocument();
  });

  it('renders agent status labels', () => {
    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('완료')).toBeInTheDocument();
    const pendingLabels = screen.getAllByText('대기');
    expect(pendingLabels.length).toBeGreaterThanOrEqual(1);
  });

  it('renders agent error when present', () => {
    mockReturnData = [{
      ...mockExecutionsDefault[0],
      status: 'failed' as const,
      results: [
        {
          step: 1,
          status: 'failed' as const,
          agents: [{ type: 'executor', status: 'failed' as const, error: 'Timeout exceeded' }],
        },
      ],
    }];

    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('Timeout exceeded')).toBeInTheDocument();
  });

  it('shows empty state when no executions', () => {
    mockReturnData = [];

    render(<ExecutionPanel pipelineId={10} onClose={vi.fn()} />);
    expect(screen.getByText('실행 이력이 없습니다.')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<ExecutionPanel pipelineId={10} onClose={onClose} />);
    const closeBtn = screen.getByTestId('icon-X');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
