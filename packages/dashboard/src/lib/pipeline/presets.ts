import type { PipelinePreset } from '@claudeops/shared';

export const PIPELINE_PRESETS: PipelinePreset[] = [
  {
    id: 'feature-development',
    name: 'Feature Development',
    description: 'Full feature lifecycle: analysis, planning, implementation, testing, review, and verification',
    category: 'development',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'analyst', model: 'opus', prompt: 'Analyze requirements and define acceptance criteria' }] },
      { step: 2, parallel: false, agents: [{ type: 'planner', model: 'opus', prompt: 'Create execution plan with task breakdown' }] },
      { step: 3, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Implement the feature according to plan' }] },
      { step: 4, parallel: false, agents: [{ type: 'test-engineer', model: 'sonnet', prompt: 'Write and run tests for the implementation' }] },
      { step: 5, parallel: false, agents: [{ type: 'quality-reviewer', model: 'sonnet', prompt: 'Review code quality and identify issues' }] },
      { step: 6, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify all acceptance criteria are met' }] },
    ],
  },
  {
    id: 'bug-investigation',
    name: 'Bug Investigation',
    description: 'Parallel exploration and debugging, followed by fix, test, and verification',
    category: 'debugging',
    steps: [
      { step: 1, parallel: true, agents: [
        { type: 'explore', model: 'haiku', prompt: 'Search codebase for related code and patterns' },
        { type: 'debugger', model: 'sonnet', prompt: 'Analyze the bug and identify root cause' },
      ] },
      { step: 2, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Implement the bug fix' }] },
      { step: 3, parallel: false, agents: [{ type: 'test-engineer', model: 'sonnet', prompt: 'Add regression tests for the bug' }] },
      { step: 4, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify the fix resolves the issue' }] },
    ],
  },
  {
    id: 'code-review',
    name: 'Code Review',
    description: 'Comprehensive parallel review covering style, quality, API, and security',
    category: 'review',
    steps: [
      { step: 1, parallel: true, agents: [
        { type: 'style-reviewer', model: 'haiku', prompt: 'Check formatting, naming, and coding conventions' },
        { type: 'quality-reviewer', model: 'sonnet', prompt: 'Identify logic defects and anti-patterns' },
        { type: 'api-reviewer', model: 'sonnet', prompt: 'Review API contracts and backward compatibility' },
        { type: 'security-reviewer', model: 'sonnet', prompt: 'Check for vulnerabilities and auth issues' },
      ] },
    ],
  },
  {
    id: 'product-discovery',
    name: 'Product Discovery',
    description: 'Parallel research and analysis, followed by design',
    category: 'product',
    steps: [
      { step: 1, parallel: true, agents: [
        { type: 'product-manager', model: 'sonnet', prompt: 'Frame the problem and identify user personas' },
        { type: 'ux-researcher', model: 'sonnet', prompt: 'Conduct heuristic evaluation and usability analysis' },
      ] },
      { step: 2, parallel: false, agents: [{ type: 'product-analyst', model: 'sonnet', prompt: 'Analyze product metrics and define experiments' }] },
      { step: 3, parallel: false, agents: [{ type: 'designer', model: 'sonnet', prompt: 'Design UI/UX based on research findings' }] },
    ],
  },
  {
    id: 'refactoring',
    name: 'Refactoring',
    description: 'Architecture-guided refactoring with performance review and verification',
    category: 'development',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'architect', model: 'opus', prompt: 'Analyze current architecture and plan refactoring' }] },
      { step: 2, parallel: false, agents: [{ type: 'explore', model: 'haiku', prompt: 'Map affected files and dependencies' }] },
      { step: 3, parallel: false, agents: [{ type: 'executor', model: 'sonnet', prompt: 'Execute the refactoring plan' }] },
      { step: 4, parallel: false, agents: [{ type: 'test-engineer', model: 'sonnet', prompt: 'Ensure all tests pass after refactoring' }] },
      { step: 5, parallel: false, agents: [{ type: 'performance-reviewer', model: 'sonnet', prompt: 'Review performance impact of changes' }] },
      { step: 6, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify refactoring maintains all functionality' }] },
    ],
  },
  {
    id: 'documentation',
    name: 'Documentation',
    description: 'Explore codebase, write docs, review quality, and verify completeness',
    category: 'documentation',
    steps: [
      { step: 1, parallel: false, agents: [{ type: 'explore', model: 'haiku', prompt: 'Discover code structure and public APIs' }] },
      { step: 2, parallel: false, agents: [{ type: 'writer', model: 'haiku', prompt: 'Write documentation based on codebase analysis' }] },
      { step: 3, parallel: false, agents: [{ type: 'quality-reviewer', model: 'sonnet', prompt: 'Review documentation accuracy and completeness' }] },
      { step: 4, parallel: false, agents: [{ type: 'verifier', model: 'sonnet', prompt: 'Verify all public APIs are documented' }] },
    ],
  },
];
