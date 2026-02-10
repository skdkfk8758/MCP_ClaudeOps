import { describe, it, expect } from 'vitest';
import { exportAsJson, importFromJson } from './export-json';
import type { PipelineStep } from '@claudeops/shared';

const sampleSteps: PipelineStep[] = [
  { step: 1, parallel: false, agents: [{ type: 'analyst', model: 'opus', prompt: 'Analyze' }] },
  {
    step: 2,
    parallel: true,
    agents: [
      { type: 'executor', model: 'sonnet', prompt: 'Build' },
      { type: 'test-engineer', model: 'sonnet', prompt: 'Test' },
    ],
  },
];

describe('exportAsJson', () => {
  it('should produce valid JSON', () => {
    const json = exportAsJson({ name: 'Test', steps: sampleSteps });
    expect(() => JSON.parse(json)).not.toThrow();
  });

  it('should include pipeline name', () => {
    const json = exportAsJson({ name: 'My Pipeline', steps: [] });
    const parsed = JSON.parse(json);
    expect(parsed.name).toBe('My Pipeline');
  });

  it('should include description when provided', () => {
    const json = exportAsJson({ name: 'Test', description: 'A test pipeline', steps: [] });
    const parsed = JSON.parse(json);
    expect(parsed.description).toBe('A test pipeline');
  });

  it('should include all steps', () => {
    const json = exportAsJson({ name: 'Test', steps: sampleSteps });
    const parsed = JSON.parse(json);
    expect(parsed.steps).toHaveLength(2);
  });

  it('should produce pretty-printed JSON with 2-space indentation', () => {
    const json = exportAsJson({ name: 'Test', steps: [] });
    expect(json).toContain('\n');
    expect(json).toContain('  ');
  });
});

describe('importFromJson', () => {
  it('should parse valid JSON', () => {
    const data = importFromJson('{"name":"Test","steps":[]}');
    expect(data.name).toBe('Test');
    expect(data.steps).toEqual([]);
  });

  it('should throw for invalid JSON', () => {
    expect(() => importFromJson('not json')).toThrow();
  });

  it('should throw for empty string', () => {
    expect(() => importFromJson('')).toThrow();
  });
});

describe('export/import roundtrip', () => {
  it('should preserve data through export then import', () => {
    const original = { name: 'Roundtrip Test', description: 'Testing roundtrip', steps: sampleSteps };
    const json = exportAsJson(original);
    const imported = importFromJson(json);
    expect(imported.name).toBe(original.name);
    expect(imported.description).toBe(original.description);
    expect(imported.steps).toEqual(original.steps);
  });

  it('should preserve data without optional fields', () => {
    const original = { name: 'Minimal', steps: [] };
    const json = exportAsJson(original);
    const imported = importFromJson(json);
    expect(imported.name).toBe('Minimal');
    expect(imported.steps).toEqual([]);
  });
});
