import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { NodeSettingsPanel } from './node-settings-panel';
import type { AgentNodeData } from './agent-node';

const { mockIcon } = vi.hoisted(() => ({
  mockIcon: (name: string) => {
    const Comp = (props: Record<string, unknown>) =>
      require('react').createElement('span', { 'data-testid': `icon-${name}`, ...props });
    Comp.displayName = name;
    return Comp;
  },
}));

vi.mock('lucide-react', () => ({
  X: mockIcon('X'),
}));

const baseData: AgentNodeData = {
  agentType: 'executor',
  label: 'Executor Agent',
  model: 'sonnet',
  prompt: 'Execute the task',
  color: '#3b82f6',
  category: 'build',
  task_id: undefined,
};

describe('NodeSettingsPanel', () => {
  it('renders agent label', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Executor Agent')).toBeInTheDocument();
  });

  it('renders model selector with correct value', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    const select = screen.getByRole('combobox') as HTMLSelectElement;
    expect(select.value).toBe('sonnet');
  });

  it('renders all model options', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('Haiku (빠름, 저비용)')).toBeInTheDocument();
    expect(screen.getByText('Sonnet (균형)')).toBeInTheDocument();
    expect(screen.getByText('Opus (고성능)')).toBeInTheDocument();
  });

  it('calls onChange when model is changed', () => {
    const onChange = vi.fn();
    render(<NodeSettingsPanel data={baseData} onChange={onChange} onClose={vi.fn()} />);
    const select = screen.getByRole('combobox');
    fireEvent.change(select, { target: { value: 'opus' } });
    expect(onChange).toHaveBeenCalledWith({ model: 'opus' });
  });

  it('renders prompt textarea with correct value', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('Execute the task');
  });

  it('calls onChange when prompt is changed', () => {
    const onChange = vi.fn();
    render(<NodeSettingsPanel data={baseData} onChange={onChange} onClose={vi.fn()} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: 'New prompt' } });
    expect(onChange).toHaveBeenCalledWith({ prompt: 'New prompt' });
  });

  it('renders task id input', () => {
    render(<NodeSettingsPanel data={{ ...baseData, task_id: 42 }} onChange={vi.fn()} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Task ID') as HTMLInputElement;
    expect(input.value).toBe('42');
  });

  it('calls onChange when task id is changed', () => {
    const onChange = vi.fn();
    render(<NodeSettingsPanel data={baseData} onChange={onChange} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Task ID');
    fireEvent.change(input, { target: { value: '99' } });
    expect(onChange).toHaveBeenCalledWith({ task_id: 99 });
  });

  it('calls onChange with undefined when task id is cleared', () => {
    const onChange = vi.fn();
    render(<NodeSettingsPanel data={{ ...baseData, task_id: 42 }} onChange={onChange} onClose={vi.fn()} />);
    const input = screen.getByPlaceholderText('Task ID');
    fireEvent.change(input, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ task_id: undefined });
  });

  it('renders agent type info', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('executor')).toBeInTheDocument();
  });

  it('renders category info', () => {
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={vi.fn()} />);
    expect(screen.getByText('build')).toBeInTheDocument();
  });

  it('calls onClose when close button clicked', () => {
    const onClose = vi.fn();
    render(<NodeSettingsPanel data={baseData} onChange={vi.fn()} onClose={onClose} />);
    const closeBtn = screen.getByTestId('icon-X');
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});
