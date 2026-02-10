import { describe, it, expect } from 'vitest';
import { exportAsPrompt } from './export-prompt';
import type { PipelineStep } from '@claudeops/shared';

describe('exportAsPrompt', () => {
  it('should include pipeline name', () => {
    const result = exportAsPrompt('My Pipeline', []);
    expect(result).toContain('# Pipeline: My Pipeline');
  });

  it('should include total steps count', () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do work' }] },
      { step: 2, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify' }] },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('Total steps: 2');
  });

  it('should include step numbers as headings', () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Build' }] },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('## Step 1');
  });

  it('should mark parallel steps', () => {
    const steps: PipelineStep[] = [
      {
        step: 1,
        parallel: true,
        agents: [
          { type: 'explore', model: 'haiku', prompt: 'Search' },
          { type: 'debugger', model: 'sonnet', prompt: 'Debug' },
        ],
      },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('## Step 1 (parallel)');
  });

  it('should not mark sequential steps as parallel', () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Build' }] },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('## Step 1');
    expect(result).not.toContain('(parallel)');
  });

  it('should include agent type and model', () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Design system' }] },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('**architect** (opus)');
  });

  it('should include agent prompt as blockquote', () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Implement the feature' }] },
    ];
    const result = exportAsPrompt('Test', steps);
    expect(result).toContain('> Implement the feature');
  });

  it('should handle empty steps', () => {
    const result = exportAsPrompt('Empty Pipeline', []);
    expect(result).toContain('# Pipeline: Empty Pipeline');
    expect(result).toContain('Total steps: 0');
  });

  it('should list multiple agents in the same step', () => {
    const steps: PipelineStep[] = [
      {
        step: 1,
        parallel: true,
        agents: [
          { type: 'style-reviewer', model: 'haiku', prompt: 'Check style' },
          { type: 'security-reviewer', model: 'sonnet', prompt: 'Check security' },
        ],
      },
    ];
    const result = exportAsPrompt('Review', steps);
    expect(result).toContain('**style-reviewer** (haiku)');
    expect(result).toContain('**security-reviewer** (sonnet)');
  });
});
