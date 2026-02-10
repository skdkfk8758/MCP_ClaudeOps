import { describe, it, expect } from 'vitest';
import { AGENT_DEFINITIONS, AGENT_CATEGORIES } from './agents';

describe('AGENT_CATEGORIES', () => {
  it('should have 6 categories', () => {
    expect(AGENT_CATEGORIES).toHaveLength(6);
  });

  it('should have unique category IDs', () => {
    const ids = AGENT_CATEGORIES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields on every category', () => {
    for (const cat of AGENT_CATEGORIES) {
      expect(cat.id).toBeTruthy();
      expect(cat.label).toBeTruthy();
      expect(cat.color).toBeTruthy();
    }
  });
});

describe('AGENT_DEFINITIONS', () => {
  it('should have 32 agent definitions', () => {
    expect(AGENT_DEFINITIONS).toHaveLength(32);
  });

  it('should have unique agent IDs', () => {
    const ids = AGENT_DEFINITIONS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have all required fields on every agent', () => {
    for (const agent of AGENT_DEFINITIONS) {
      expect(agent.id).toBeTruthy();
      expect(agent.label).toBeTruthy();
      expect(agent.category).toBeTruthy();
      expect(agent.defaultModel).toBeTruthy();
      expect(agent.color).toBeTruthy();
      expect(agent.description).toBeTruthy();
    }
  });

  it('should only use valid model tiers', () => {
    const validModels = new Set(['haiku', 'sonnet', 'opus']);
    for (const agent of AGENT_DEFINITIONS) {
      expect(validModels.has(agent.defaultModel)).toBe(true);
    }
  });

  it('should reference existing category IDs', () => {
    const categoryIds = new Set(AGENT_CATEGORIES.map((c) => c.id));
    for (const agent of AGENT_DEFINITIONS) {
      expect(categoryIds.has(agent.category)).toBe(true);
    }
  });

  it('should have agents in every category', () => {
    const usedCategories = new Set(AGENT_DEFINITIONS.map((a) => a.category));
    for (const cat of AGENT_CATEGORIES) {
      expect(usedCategories.has(cat.id)).toBe(true);
    }
  });

  it('should have correct agent counts per category', () => {
    const counts = new Map<string, number>();
    for (const agent of AGENT_DEFINITIONS) {
      counts.set(agent.category, (counts.get(agent.category) ?? 0) + 1);
    }
    expect(counts.get('build-analysis')).toBe(8);
    expect(counts.get('review')).toBe(6);
    expect(counts.get('domain')).toBe(9);
    expect(counts.get('product')).toBe(4);
    expect(counts.get('coordination')).toBe(2);
    expect(counts.get('custom')).toBe(3);
  });
});
