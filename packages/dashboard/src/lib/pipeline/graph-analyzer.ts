import type { AgentTier, PipelineStep } from '@claudeops/shared';

export interface GraphNode {
  id: string;
  data: {
    agentType: string;
    model: AgentTier;
    prompt: string;
    task_id?: number;
  };
}

export interface GraphEdge {
  source: string;
  target: string;
}

export function analyzeGraph(nodes: GraphNode[], edges: GraphEdge[]): PipelineStep[] {
  if (nodes.length === 0) return [];

  // Build adjacency list and in-degree map
  const adjacency = new Map<string, string[]>();
  const inDegree = new Map<string, number>();

  for (const node of nodes) {
    adjacency.set(node.id, []);
    inDegree.set(node.id, 0);
  }

  for (const edge of edges) {
    adjacency.get(edge.source)?.push(edge.target);
    inDegree.set(edge.target, (inDegree.get(edge.target) ?? 0) + 1);
  }

  // Kahn's algorithm with level grouping
  const queue: string[] = [];
  for (const [nodeId, degree] of inDegree) {
    if (degree === 0) queue.push(nodeId);
  }

  const steps: PipelineStep[] = [];
  let stepNumber = 1;

  while (queue.length > 0) {
    const currentLevel = [...queue];
    queue.length = 0;

    const nodeMap = new Map(nodes.map((n) => [n.id, n]));
    const agents = currentLevel.map((nodeId) => {
      const node = nodeMap.get(nodeId)!;
      return {
        type: node.data.agentType,
        model: node.data.model,
        prompt: node.data.prompt,
        ...(node.data.task_id != null ? { task_id: node.data.task_id } : {}),
      };
    });

    steps.push({
      step: stepNumber++,
      parallel: currentLevel.length > 1,
      agents,
    });

    for (const nodeId of currentLevel) {
      for (const neighbor of adjacency.get(nodeId) ?? []) {
        const newDegree = (inDegree.get(neighbor) ?? 1) - 1;
        inDegree.set(neighbor, newDegree);
        if (newDegree === 0) queue.push(neighbor);
      }
    }
  }

  return steps;
}

export function validateGraph(
  nodes: GraphNode[],
  edges: GraphEdge[],
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (nodes.length === 0) {
    errors.push('Graph must have at least 1 node');
    return { valid: false, errors };
  }

  const nodeIds = new Set(nodes.map((n) => n.id));

  for (const edge of edges) {
    if (!nodeIds.has(edge.source)) {
      errors.push(`Edge source "${edge.source}" does not reference an existing node`);
    }
    if (!nodeIds.has(edge.target)) {
      errors.push(`Edge target "${edge.target}" does not reference an existing node`);
    }
  }

  // Cycle detection via DFS
  const adjacency = new Map<string, string[]>();
  for (const node of nodes) adjacency.set(node.id, []);
  for (const edge of edges) adjacency.get(edge.source)?.push(edge.target);

  const WHITE = 0, GRAY = 1, BLACK = 2;
  const color = new Map<string, number>();
  for (const node of nodes) color.set(node.id, WHITE);

  function dfs(nodeId: string): boolean {
    color.set(nodeId, GRAY);
    for (const neighbor of adjacency.get(nodeId) ?? []) {
      if (color.get(neighbor) === GRAY) return true; // cycle found
      if (color.get(neighbor) === WHITE && dfs(neighbor)) return true;
    }
    color.set(nodeId, BLACK);
    return false;
  }

  for (const node of nodes) {
    if (color.get(node.id) === WHITE && dfs(node.id)) {
      errors.push('Graph contains a cycle');
      break;
    }
  }

  return { valid: errors.length === 0, errors };
}
