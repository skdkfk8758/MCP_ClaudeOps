import type { AgentDefinition, AgentTier } from '@claudeops/shared';

export interface AgentCategory {
  id: string;
  label: string;
  color: string;
}

export const AGENT_CATEGORIES: AgentCategory[] = [
  { id: 'build-analysis', label: 'Build/Analysis', color: '#3b82f6' },
  { id: 'review', label: 'Review', color: '#a855f7' },
  { id: 'domain', label: 'Domain Specialists', color: '#22c55e' },
  { id: 'product', label: 'Product', color: '#f59e0b' },
  { id: 'coordination', label: 'Coordination', color: '#ef4444' },
  { id: 'custom', label: 'Custom', color: '#6b7280' },
];

export const AGENT_DEFINITIONS: AgentDefinition[] = [
  // Build/Analysis
  { id: 'explore', label: 'Explore', category: 'build-analysis', defaultModel: 'haiku', color: '#3b82f6', description: 'Codebase discovery & search' },
  { id: 'analyst', label: 'Analyst', category: 'build-analysis', defaultModel: 'opus', color: '#1d4ed8', description: 'Requirements clarity & acceptance criteria' },
  { id: 'planner', label: 'Planner', category: 'build-analysis', defaultModel: 'opus', color: '#2563eb', description: 'Task sequencing & execution plans' },
  { id: 'architect', label: 'Architect', category: 'build-analysis', defaultModel: 'opus', color: '#1e40af', description: 'System design & boundaries' },
  { id: 'debugger', label: 'Debugger', category: 'build-analysis', defaultModel: 'sonnet', color: '#60a5fa', description: 'Root-cause analysis & regression' },
  { id: 'executor', label: 'Executor', category: 'build-analysis', defaultModel: 'sonnet', color: '#3b82f6', description: 'Code implementation & refactoring' },
  { id: 'deep-executor', label: 'Deep Executor', category: 'build-analysis', defaultModel: 'opus', color: '#1e3a8a', description: 'Complex autonomous tasks' },
  { id: 'verifier', label: 'Verifier', category: 'build-analysis', defaultModel: 'sonnet', color: '#93c5fd', description: 'Completion evidence & validation' },

  // Review
  { id: 'style-reviewer', label: 'Style Reviewer', category: 'review', defaultModel: 'haiku', color: '#a855f7', description: 'Formatting & naming conventions' },
  { id: 'quality-reviewer', label: 'Quality Reviewer', category: 'review', defaultModel: 'sonnet', color: '#9333ea', description: 'Logic defects & anti-patterns' },
  { id: 'api-reviewer', label: 'API Reviewer', category: 'review', defaultModel: 'sonnet', color: '#7c3aed', description: 'API contracts & versioning' },
  { id: 'security-reviewer', label: 'Security Reviewer', category: 'review', defaultModel: 'sonnet', color: '#6d28d9', description: 'Vulnerabilities & auth' },
  { id: 'performance-reviewer', label: 'Performance Reviewer', category: 'review', defaultModel: 'sonnet', color: '#8b5cf6', description: 'Hotspots & optimization' },
  { id: 'code-reviewer', label: 'Code Reviewer', category: 'review', defaultModel: 'opus', color: '#581c87', description: 'Comprehensive review' },

  // Domain Specialists
  { id: 'dependency-expert', label: 'Dependency Expert', category: 'domain', defaultModel: 'sonnet', color: '#22c55e', description: 'SDK/package evaluation' },
  { id: 'test-engineer', label: 'Test Engineer', category: 'domain', defaultModel: 'sonnet', color: '#16a34a', description: 'Test strategy & coverage' },
  { id: 'quality-strategist', label: 'Quality Strategist', category: 'domain', defaultModel: 'sonnet', color: '#15803d', description: 'Quality & release readiness' },
  { id: 'build-fixer', label: 'Build Fixer', category: 'domain', defaultModel: 'sonnet', color: '#4ade80', description: 'Build/toolchain failures' },
  { id: 'designer', label: 'Designer', category: 'domain', defaultModel: 'sonnet', color: '#86efac', description: 'UX/UI architecture' },
  { id: 'writer', label: 'Writer', category: 'domain', defaultModel: 'haiku', color: '#bbf7d0', description: 'Docs & migration notes' },
  { id: 'qa-tester', label: 'QA Tester', category: 'domain', defaultModel: 'sonnet', color: '#34d399', description: 'CLI/service runtime validation' },
  { id: 'scientist', label: 'Scientist', category: 'domain', defaultModel: 'sonnet', color: '#059669', description: 'Data/statistical analysis' },
  { id: 'git-master', label: 'Git Master', category: 'domain', defaultModel: 'sonnet', color: '#10b981', description: 'Commit strategy & history' },

  // Product
  { id: 'product-manager', label: 'Product Manager', category: 'product', defaultModel: 'sonnet', color: '#f59e0b', description: 'Problem framing & PRDs' },
  { id: 'ux-researcher', label: 'UX Researcher', category: 'product', defaultModel: 'sonnet', color: '#d97706', description: 'Usability & accessibility' },
  { id: 'information-architect', label: 'Information Architect', category: 'product', defaultModel: 'sonnet', color: '#b45309', description: 'Taxonomy & navigation' },
  { id: 'product-analyst', label: 'Product Analyst', category: 'product', defaultModel: 'sonnet', color: '#fbbf24', description: 'Product metrics & experiments' },

  // Coordination
  { id: 'critic', label: 'Critic', category: 'coordination', defaultModel: 'opus', color: '#ef4444', description: 'Plan/design challenge' },
  { id: 'vision', label: 'Vision', category: 'coordination', defaultModel: 'sonnet', color: '#f97316', description: 'Image/screenshot analysis' },

  // Custom
  { id: 'custom-agent-1', label: 'Custom Agent 1', category: 'custom', defaultModel: 'sonnet', color: '#6b7280', description: 'Custom agent slot 1' },
  { id: 'custom-agent-2', label: 'Custom Agent 2', category: 'custom', defaultModel: 'sonnet', color: '#9ca3af', description: 'Custom agent slot 2' },
  { id: 'custom-agent-3', label: 'Custom Agent 3', category: 'custom', defaultModel: 'haiku', color: '#d1d5db', description: 'Custom agent slot 3' },
];
