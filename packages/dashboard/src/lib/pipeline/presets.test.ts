import { describe, it, expect } from 'vitest';
import { PIPELINE_PRESETS } from './presets';
import { AGENT_DEFINITIONS } from './agents';

const knownAgentIds = new Set(AGENT_DEFINITIONS.map((a) => a.id));

describe('PIPELINE_PRESETS', () => {
  it('should have 6 presets', () => {
    expect(PIPELINE_PRESETS).toHaveLength(6);
  });

  it('should have unique preset IDs', () => {
    const ids = PIPELINE_PRESETS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('should have required fields on every preset', () => {
    for (const preset of PIPELINE_PRESETS) {
      expect(preset.id).toBeTruthy();
      expect(preset.name).toBeTruthy();
      expect(preset.description).toBeTruthy();
      expect(preset.category).toBeTruthy();
      expect(Array.isArray(preset.steps)).toBe(true);
      expect(preset.steps.length).toBeGreaterThan(0);
    }
  });

  it('should have valid step structure in every preset', () => {
    for (const preset of PIPELINE_PRESETS) {
      for (const step of preset.steps) {
        expect(typeof step.step).toBe('number');
        expect(typeof step.parallel).toBe('boolean');
        expect(Array.isArray(step.agents)).toBe(true);
        expect(step.agents.length).toBeGreaterThan(0);
      }
    }
  });

  it('should have sequential step numbers starting from 1', () => {
    for (const preset of PIPELINE_PRESETS) {
      const numbers = preset.steps.map((s) => s.step);
      for (let i = 0; i < numbers.length; i++) {
        expect(numbers[i]).toBe(i + 1);
      }
    }
  });

  it('should only reference known agent types', () => {
    for (const preset of PIPELINE_PRESETS) {
      for (const step of preset.steps) {
        for (const agent of step.agents) {
          expect(knownAgentIds.has(agent.type)).toBe(true);
        }
      }
    }
  });

  it('should only use valid model tiers', () => {
    const validModels = new Set(['haiku', 'sonnet', 'opus']);
    for (const preset of PIPELINE_PRESETS) {
      for (const step of preset.steps) {
        for (const agent of step.agents) {
          expect(validModels.has(agent.model)).toBe(true);
        }
      }
    }
  });

  it('should have non-empty prompts for all agents', () => {
    for (const preset of PIPELINE_PRESETS) {
      for (const step of preset.steps) {
        for (const agent of step.agents) {
          expect(agent.prompt).toBeTruthy();
        }
      }
    }
  });

  it('should mark multi-agent steps as parallel', () => {
    for (const preset of PIPELINE_PRESETS) {
      for (const step of preset.steps) {
        if (step.agents.length > 1) {
          expect(step.parallel).toBe(true);
        }
      }
    }
  });

  it('should include expected preset IDs', () => {
    const ids = PIPELINE_PRESETS.map((p) => p.id);
    expect(ids).toContain('feature-development');
    expect(ids).toContain('bug-investigation');
    expect(ids).toContain('code-review');
    expect(ids).toContain('product-discovery');
    expect(ids).toContain('refactoring');
    expect(ids).toContain('documentation');
  });
});
