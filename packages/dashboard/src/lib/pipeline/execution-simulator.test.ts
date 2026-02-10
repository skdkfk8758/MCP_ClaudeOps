import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { simulatePipeline, type SimulationCallbacks } from './execution-simulator';
import type { PipelineStep } from '@claudeops/shared';

function makeCallbacks(): SimulationCallbacks & {
  calls: { fn: string; args: unknown[] }[];
} {
  const calls: { fn: string; args: unknown[] }[] = [];
  return {
    calls,
    onStepStart: vi.fn((step, agents) => calls.push({ fn: 'onStepStart', args: [step, agents] })),
    onAgentStart: vi.fn((step, type) => calls.push({ fn: 'onAgentStart', args: [step, type] })),
    onAgentComplete: vi.fn((step, type) => calls.push({ fn: 'onAgentComplete', args: [step, type] })),
    onStepComplete: vi.fn((step) => calls.push({ fn: 'onStepComplete', args: [step] })),
    onComplete: vi.fn(() => calls.push({ fn: 'onComplete', args: [] })),
  };
}

describe('simulatePipeline', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should call onComplete for empty steps', async () => {
    const cb = makeCallbacks();
    const promise = simulatePipeline([], cb);
    await promise;
    expect(cb.onComplete).toHaveBeenCalledOnce();
  });

  it('should call all callbacks in correct order for sequential step', async () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Do work' }] },
    ];
    const cb = makeCallbacks();
    const promise = simulatePipeline(steps, cb);
    // Advance timers enough for sonnet delay (max 3000ms)
    await vi.advanceTimersByTimeAsync(5000);
    await promise;

    expect(cb.onStepStart).toHaveBeenCalledWith(1, ['executor']);
    expect(cb.onAgentStart).toHaveBeenCalledWith(1, 'executor');
    expect(cb.onAgentComplete).toHaveBeenCalledWith(1, 'executor');
    expect(cb.onStepComplete).toHaveBeenCalledWith(1);
    expect(cb.onComplete).toHaveBeenCalledOnce();
  });

  it('should process multiple sequential steps in order', async () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'explore', model: 'haiku', prompt: 'Search' }] },
      { step: 2, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Build' }] },
    ];
    const cb = makeCallbacks();
    const promise = simulatePipeline(steps, cb);
    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(cb.onStepStart).toHaveBeenCalledTimes(2);
    expect(cb.onStepComplete).toHaveBeenCalledTimes(2);
    // Step 1 should complete before step 2 starts
    const stepStartCalls = cb.calls.filter((c) => c.fn === 'onStepStart');
    const stepCompleteCalls = cb.calls.filter((c) => c.fn === 'onStepComplete');
    expect(stepStartCalls[0].args[0]).toBe(1);
    expect(stepCompleteCalls[0].args[0]).toBe(1);
    expect(stepStartCalls[1].args[0]).toBe(2);
  });

  it('should call onAgentStart for all parallel agents', async () => {
    const steps: PipelineStep[] = [
      {
        step: 1,
        parallel: true,
        agents: [
          { type: 'style-reviewer', model: 'haiku', prompt: 'Check style' },
          { type: 'quality-reviewer', model: 'sonnet', prompt: 'Check quality' },
        ],
      },
    ];
    const cb = makeCallbacks();
    const promise = simulatePipeline(steps, cb);
    await vi.advanceTimersByTimeAsync(10000);
    await promise;

    expect(cb.onAgentStart).toHaveBeenCalledTimes(2);
    expect(cb.onAgentComplete).toHaveBeenCalledTimes(2);
    expect(cb.onStepComplete).toHaveBeenCalledWith(1);
  });

  it('should call onComplete after all steps finish', async () => {
    const steps: PipelineStep[] = [
      { step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Design' }] },
      { step: 2, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify' }] },
    ];
    const cb = makeCallbacks();
    const promise = simulatePipeline(steps, cb);
    await vi.advanceTimersByTimeAsync(15000);
    await promise;

    const lastCall = cb.calls[cb.calls.length - 1];
    expect(lastCall.fn).toBe('onComplete');
  });
});
