import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('lucide-react', () => ({
  ChevronDown: (props: Record<string, unknown>) => <span data-testid="icon-ChevronDown" {...props} />,
  Search: (props: Record<string, unknown>) => <span data-testid="icon-Search" {...props} />,
}));

vi.mock('@/lib/utils', () => ({
  cn: (...classes: (string | undefined | false)[]) => classes.filter(Boolean).join(' '),
}));

import { AgentPalette } from './agent-palette';
import { AGENT_DEFINITIONS, AGENT_CATEGORIES } from '@/lib/pipeline/agents';

describe('AgentPalette', () => {
  const onDragStart = vi.fn();

  it('renders search input', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    expect(screen.getByPlaceholderText('에이전트 검색...')).toBeInTheDocument();
  });

  it('renders all category labels', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    for (const cat of AGENT_CATEGORIES) {
      expect(screen.getByText(cat.label)).toBeInTheDocument();
    }
  });

  it('renders agent labels', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    // Check a few known agents exist
    const firstAgent = AGENT_DEFINITIONS[0];
    expect(screen.getByText(firstAgent.label)).toBeInTheDocument();
  });

  it('renders agent descriptions', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    const firstAgent = AGENT_DEFINITIONS[0];
    expect(screen.getByText(firstAgent.description)).toBeInTheDocument();
  });

  it('filters agents by search text', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    const input = screen.getByPlaceholderText('에이전트 검색...');
    fireEvent.change(input, { target: { value: 'executor' } });
    // Executor should be visible
    expect(screen.getByText('Executor')).toBeInTheDocument();
    // Others should be hidden - check a random non-matching one
    expect(screen.queryByText('Architect')).not.toBeInTheDocument();
  });

  it('toggles category collapse', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    const firstCat = AGENT_CATEGORIES[0];
    const catButton = screen.getByText(firstCat.label);
    // Click to collapse
    fireEvent.click(catButton);
    // Agents in that category should be hidden
    const agentsInCat = AGENT_DEFINITIONS.filter(a => a.category === firstCat.id);
    if (agentsInCat.length > 0) {
      expect(screen.queryByText(agentsInCat[0].label)).not.toBeInTheDocument();
    }
    // Click again to expand
    fireEvent.click(catButton);
    if (agentsInCat.length > 0) {
      expect(screen.getByText(agentsInCat[0].label)).toBeInTheDocument();
    }
  });

  it('displays model tier abbreviation', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    // Each agent should have a model abbreviation (h, s, or o)
    const firstAgent = AGENT_DEFINITIONS[0];
    const abbr = firstAgent.defaultModel[0].toLowerCase();
    const elements = screen.getAllByText(abbr, { exact: true });
    expect(elements.length).toBeGreaterThan(0);
  });

  it('renders draggable agents', () => {
    const { container } = render(<AgentPalette onDragStart={onDragStart} />);
    const draggables = container.querySelectorAll('[draggable="true"]');
    expect(draggables.length).toBe(AGENT_DEFINITIONS.length);
  });

  it('shows agent count per category', () => {
    render(<AgentPalette onDragStart={onDragStart} />);
    for (const cat of AGENT_CATEGORIES) {
      const count = AGENT_DEFINITIONS.filter(a => a.category === cat.id).length;
      expect(screen.getByText(`(${count})`)).toBeInTheDocument();
    }
  });
});
