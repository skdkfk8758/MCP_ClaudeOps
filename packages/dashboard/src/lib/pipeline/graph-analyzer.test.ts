import { describe, it, expect } from 'vitest';
import { analyzeGraph, validateGraph, type GraphNode, type GraphEdge } from './graph-analyzer';

function makeNode(id: string, agentType = 'executor', model: 'haiku' | 'sonnet' | 'opus' = 'sonnet'): GraphNode {
  return { id, data: { agentType, model, prompt: `Task for ${id}` } };
}

describe('analyzeGraph', () => {
  it('should return empty steps for empty graph', () => {
    expect(analyzeGraph([], [])).toEqual([]);
  });

  it('should handle a single node', () => {
    const nodes = [makeNode('A')];
    const steps = analyzeGraph(nodes, []);
    expect(steps).toHaveLength(1);
    expect(steps[0].step).toBe(1);
    expect(steps[0].parallel).toBe(false);
    expect(steps[0].agents).toHaveLength(1);
    expect(steps[0].agents[0].type).toBe('executor');
  });

  it('should produce sequential steps for a linear chain A->B->C', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    const steps = analyzeGraph(nodes, edges);
    expect(steps).toHaveLength(3);
    expect(steps[0].parallel).toBe(false);
    expect(steps[1].parallel).toBe(false);
    expect(steps[2].parallel).toBe(false);
  });

  it('should group parallel paths: A->C, B->C', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'C' },
      { source: 'B', target: 'C' },
    ];
    const steps = analyzeGraph(nodes, edges);
    expect(steps).toHaveLength(2);
    // A and B should be in the same parallel step
    expect(steps[0].parallel).toBe(true);
    expect(steps[0].agents).toHaveLength(2);
    // C should be in a sequential step
    expect(steps[1].parallel).toBe(false);
    expect(steps[1].agents).toHaveLength(1);
  });

  it('should handle diamond: A->B, A->C, B->D, C->D', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C'), makeNode('D')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'A', target: 'C' },
      { source: 'B', target: 'D' },
      { source: 'C', target: 'D' },
    ];
    const steps = analyzeGraph(nodes, edges);
    expect(steps).toHaveLength(3);
    // Step 1: A alone
    expect(steps[0].agents).toHaveLength(1);
    expect(steps[0].parallel).toBe(false);
    // Step 2: B and C in parallel
    expect(steps[1].agents).toHaveLength(2);
    expect(steps[1].parallel).toBe(true);
    // Step 3: D alone
    expect(steps[2].agents).toHaveLength(1);
    expect(steps[2].parallel).toBe(false);
  });

  it('should include task_id when present in node data', () => {
    const node: GraphNode = {
      id: 'X',
      data: { agentType: 'planner', model: 'opus', prompt: 'Plan', task_id: 42 },
    };
    const steps = analyzeGraph([node], []);
    expect(steps[0].agents[0].task_id).toBe(42);
  });

  it('should not include task_id when absent', () => {
    const node = makeNode('X');
    const steps = analyzeGraph([node], []);
    expect(steps[0].agents[0]).not.toHaveProperty('task_id');
  });

  it('should assign sequential step numbers', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    const steps = analyzeGraph(nodes, edges);
    expect(steps.map((s) => s.step)).toEqual([1, 2, 3]);
  });
});

describe('validateGraph', () => {
  it('should fail for empty graph', () => {
    const result = validateGraph([], []);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('Graph must have at least 1 node');
  });

  it('should pass for valid single node', () => {
    const result = validateGraph([makeNode('A')], []);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('should detect invalid edge source', () => {
    const result = validateGraph([makeNode('A')], [{ source: 'X', target: 'A' }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"X"'))).toBe(true);
  });

  it('should detect invalid edge target', () => {
    const result = validateGraph([makeNode('A')], [{ source: 'A', target: 'Z' }]);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('"Z"'))).toBe(true);
  });

  it('should detect cycles', () => {
    const nodes = [makeNode('A'), makeNode('B')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'A' },
    ];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(false);
    expect(result.errors.some((e) => e.includes('cycle'))).toBe(true);
  });

  it('should pass for valid DAG', () => {
    const nodes = [makeNode('A'), makeNode('B'), makeNode('C')];
    const edges: GraphEdge[] = [
      { source: 'A', target: 'B' },
      { source: 'B', target: 'C' },
    ];
    const result = validateGraph(nodes, edges);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });
});
