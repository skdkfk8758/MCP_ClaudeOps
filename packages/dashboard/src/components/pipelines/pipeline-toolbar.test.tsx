import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { PipelineToolbar } from './pipeline-toolbar';

// Mock lucide-react
vi.mock('lucide-react', () => ({
  Save: (props: Record<string, unknown>) => <span data-testid="icon-Save" {...props} />,
  Play: (props: Record<string, unknown>) => <span data-testid="icon-Play" {...props} />,
  PlayCircle: (props: Record<string, unknown>) => <span data-testid="icon-PlayCircle" {...props} />,
  Download: (props: Record<string, unknown>) => <span data-testid="icon-Download" {...props} />,
  Upload: (props: Record<string, unknown>) => <span data-testid="icon-Upload" {...props} />,
  Undo2: (props: Record<string, unknown>) => <span data-testid="icon-Undo2" {...props} />,
}));

function renderToolbar(overrides: Partial<Parameters<typeof PipelineToolbar>[0]> = {}) {
  const defaultProps = {
    name: 'Test Pipeline',
    onNameChange: vi.fn(),
    onSave: vi.fn(),
    onExecute: vi.fn(),
    onSimulate: vi.fn(),
    onExportJson: vi.fn(),
    onImportJson: vi.fn(),
    onAutoLayout: vi.fn(),
  };
  const props = { ...defaultProps, ...overrides };
  return { ...render(<PipelineToolbar {...props} />), props };
}

describe('PipelineToolbar', () => {
  it('renders pipeline name input', () => {
    renderToolbar();
    const input = screen.getByDisplayValue('Test Pipeline');
    expect(input).toBeInTheDocument();
  });

  it('calls onNameChange when input changes', () => {
    const { props } = renderToolbar();
    const input = screen.getByDisplayValue('Test Pipeline');
    fireEvent.change(input, { target: { value: 'New Name' } });
    expect(props.onNameChange).toHaveBeenCalledWith('New Name');
  });

  it('renders save button', () => {
    renderToolbar();
    expect(screen.getByText('저장')).toBeInTheDocument();
  });

  it('shows saving state', () => {
    renderToolbar({ saving: true });
    expect(screen.getByText('저장 중...')).toBeInTheDocument();
  });

  it('shows changes indicator', () => {
    const { container } = renderToolbar({ hasChanges: true });
    const indicator = container.querySelector('.bg-yellow-400');
    expect(indicator).toBeInTheDocument();
  });

  it('calls onSave when save button clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByText('저장'));
    expect(props.onSave).toHaveBeenCalled();
  });

  it('renders simulate button', () => {
    renderToolbar();
    expect(screen.getByText('시뮬레이션')).toBeInTheDocument();
  });

  it('calls onSimulate when simulate clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByText('시뮬레이션'));
    expect(props.onSimulate).toHaveBeenCalled();
  });

  it('renders execute button', () => {
    renderToolbar();
    expect(screen.getByText('실행')).toBeInTheDocument();
  });

  it('shows executing state', () => {
    renderToolbar({ executing: true });
    expect(screen.getByText('실행 중...')).toBeInTheDocument();
  });

  it('calls onExecute when execute clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByText('실행'));
    expect(props.onExecute).toHaveBeenCalled();
  });

  it('calls onAutoLayout when auto layout clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByTestId('icon-Undo2'));
    expect(props.onAutoLayout).toHaveBeenCalled();
  });

  it('calls onExportJson when export clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByTestId('icon-Download'));
    expect(props.onExportJson).toHaveBeenCalled();
  });

  it('calls onImportJson when import clicked', () => {
    const { props } = renderToolbar();
    fireEvent.click(screen.getByTestId('icon-Upload'));
    expect(props.onImportJson).toHaveBeenCalled();
  });

  it('disables execute when executing', () => {
    renderToolbar({ executing: true });
    const btn = screen.getByText('실행 중...').closest('button');
    expect(btn).toBeDisabled();
  });
});
