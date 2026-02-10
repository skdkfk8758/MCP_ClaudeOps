import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { PresetSelector } from './preset-selector';

const mockPresets = [
  {
    id: 'p1',
    name: 'Feature Dev',
    description: 'Full feature development',
    category: 'dev',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'planner', model: 'opus' as const, prompt: 'plan' }] },
      { step: 2, parallel: true, agents: [{ type: 'executor', model: 'sonnet' as const, prompt: 'exec' }, { type: 'tester', model: 'haiku' as const, prompt: 'test' }] },
    ],
  },
  {
    id: 'p2',
    name: 'Quick Fix',
    description: 'Bug fix preset',
    category: 'fix',
    steps: [{ step: 1, parallel: false, agents: [{ type: 'debugger', model: 'sonnet' as const, prompt: 'debug' }] }],
  },
];

vi.mock('@/lib/hooks/use-pipelines', () => ({
  usePipelinePresets: () => ({ data: mockPresets }),
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
  Layers: mockIcon('Layers'),
  X: mockIcon('X'),
  BookTemplate: mockIcon('BookTemplate'),
}));

function renderWithQuery(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe('PresetSelector', () => {
  it('renders preset button with text', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    expect(screen.getByText('프리셋')).toBeInTheDocument();
  });

  it('opens modal on button click', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('프리셋'));
    expect(screen.getByText('프리셋 템플릿')).toBeInTheDocument();
  });

  it('displays preset cards when modal is open', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('프리셋'));
    expect(screen.getByText('Feature Dev')).toBeInTheDocument();
    expect(screen.getByText('Quick Fix')).toBeInTheDocument();
  });

  it('displays preset descriptions', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('프리셋'));
    expect(screen.getByText('Full feature development')).toBeInTheDocument();
    expect(screen.getByText('Bug fix preset')).toBeInTheDocument();
  });

  it('displays preset step and agent counts', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('프리셋'));
    expect(screen.getByText('2단계')).toBeInTheDocument();
    expect(screen.getByText('3개 에이전트')).toBeInTheDocument();
  });

  it('calls onSelect with preset and closes modal', () => {
    const onSelect = vi.fn();
    renderWithQuery(<PresetSelector onSelect={onSelect} />);
    fireEvent.click(screen.getByText('프리셋'));
    fireEvent.click(screen.getByText('Feature Dev'));
    expect(onSelect).toHaveBeenCalledWith(mockPresets[0]);
    expect(screen.queryByText('프리셋 템플릿')).not.toBeInTheDocument();
  });

  it('closes modal via close button', () => {
    renderWithQuery(<PresetSelector onSelect={vi.fn()} />);
    fireEvent.click(screen.getByText('프리셋'));
    expect(screen.getByText('프리셋 템플릿')).toBeInTheDocument();
    const closeBtn = screen.getByTestId('icon-X');
    fireEvent.click(closeBtn);
    expect(screen.queryByText('프리셋 템플릿')).not.toBeInTheDocument();
  });
});
