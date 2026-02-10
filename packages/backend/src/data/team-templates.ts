import type { AgentCapability, AgentRole, TeamTemplate } from '@claudeops/shared';
import type Database from 'better-sqlite3';

// ─── 프리셋 페르소나 데이터 인터페이스 ───

export interface PresetPersonaData {
  agent_type: string;
  name: string;
  model: string;
  category: string;
  description: string;
  capabilities: AgentCapability[];
  color: string;
}

// ─── 프리셋 페르소나 데이터 (30종) ───

export const PRESET_PERSONAS: PresetPersonaData[] = [
  // Build/Analysis (8종)
  {
    agent_type: 'explore',
    name: 'Explore',
    model: 'haiku',
    category: 'build-analysis',
    description: 'Codebase discovery & search',
    capabilities: ['read_code', 'lsp_access'],
    color: '#3b82f6',
  },
  {
    agent_type: 'analyst',
    name: 'Analyst',
    model: 'opus',
    category: 'build-analysis',
    description: 'Requirements clarity & acceptance criteria',
    capabilities: ['read_code'],
    color: '#1d4ed8',
  },
  {
    agent_type: 'planner',
    name: 'Planner',
    model: 'opus',
    category: 'build-analysis',
    description: 'Task sequencing & execution plans',
    capabilities: ['read_code'],
    color: '#2563eb',
  },
  {
    agent_type: 'architect',
    name: 'Architect',
    model: 'opus',
    category: 'build-analysis',
    description: 'System design & boundaries',
    capabilities: ['read_code', 'lsp_access'],
    color: '#1e40af',
  },
  {
    agent_type: 'debugger',
    name: 'Debugger',
    model: 'sonnet',
    category: 'build-analysis',
    description: 'Root-cause analysis & regression',
    capabilities: ['read_code', 'execute_shell', 'lsp_access'],
    color: '#60a5fa',
  },
  {
    agent_type: 'executor',
    name: 'Executor',
    model: 'sonnet',
    category: 'build-analysis',
    description: 'Code implementation & refactoring',
    capabilities: ['read_code', 'write_code', 'execute_shell', 'file_management', 'git_operations', 'test_execution', 'lsp_access'],
    color: '#3b82f6',
  },
  {
    agent_type: 'deep-executor',
    name: 'Deep Executor',
    model: 'opus',
    category: 'build-analysis',
    description: 'Complex autonomous tasks',
    capabilities: ['read_code', 'write_code', 'execute_shell', 'file_management', 'git_operations', 'test_execution', 'lsp_access', 'mcp_tools'],
    color: '#1e3a8a',
  },
  {
    agent_type: 'verifier',
    name: 'Verifier',
    model: 'sonnet',
    category: 'build-analysis',
    description: 'Completion evidence & validation',
    capabilities: ['read_code', 'execute_shell', 'test_execution'],
    color: '#93c5fd',
  },

  // Review (6종)
  {
    agent_type: 'style-reviewer',
    name: 'Style Reviewer',
    model: 'haiku',
    category: 'review',
    description: 'Formatting & naming conventions',
    capabilities: ['read_code', 'lsp_access'],
    color: '#a855f7',
  },
  {
    agent_type: 'quality-reviewer',
    name: 'Quality Reviewer',
    model: 'sonnet',
    category: 'review',
    description: 'Logic defects & anti-patterns',
    capabilities: ['read_code', 'lsp_access'],
    color: '#9333ea',
  },
  {
    agent_type: 'api-reviewer',
    name: 'API Reviewer',
    model: 'sonnet',
    category: 'review',
    description: 'API contracts & versioning',
    capabilities: ['read_code', 'lsp_access'],
    color: '#7c3aed',
  },
  {
    agent_type: 'security-reviewer',
    name: 'Security Reviewer',
    model: 'sonnet',
    category: 'review',
    description: 'Vulnerabilities & auth',
    capabilities: ['read_code', 'lsp_access'],
    color: '#6d28d9',
  },
  {
    agent_type: 'performance-reviewer',
    name: 'Performance Reviewer',
    model: 'sonnet',
    category: 'review',
    description: 'Hotspots & optimization',
    capabilities: ['read_code', 'lsp_access'],
    color: '#8b5cf6',
  },
  {
    agent_type: 'code-reviewer',
    name: 'Code Reviewer',
    model: 'opus',
    category: 'review',
    description: 'Comprehensive review',
    capabilities: ['read_code', 'lsp_access'],
    color: '#581c87',
  },

  // Domain Specialists (9종)
  {
    agent_type: 'dependency-expert',
    name: 'Dependency Expert',
    model: 'sonnet',
    category: 'domain',
    description: 'SDK/package evaluation',
    capabilities: ['read_code', 'web_search', 'mcp_tools'],
    color: '#22c55e',
  },
  {
    agent_type: 'test-engineer',
    name: 'Test Engineer',
    model: 'sonnet',
    category: 'domain',
    description: 'Test strategy & coverage',
    capabilities: ['read_code', 'write_code', 'execute_shell', 'test_execution'],
    color: '#16a34a',
  },
  {
    agent_type: 'quality-strategist',
    name: 'Quality Strategist',
    model: 'sonnet',
    category: 'domain',
    description: 'Quality & release readiness',
    capabilities: ['read_code'],
    color: '#15803d',
  },
  {
    agent_type: 'build-fixer',
    name: 'Build Fixer',
    model: 'sonnet',
    category: 'domain',
    description: 'Build/toolchain failures',
    capabilities: ['read_code', 'write_code', 'execute_shell'],
    color: '#4ade80',
  },
  {
    agent_type: 'designer',
    name: 'Designer',
    model: 'sonnet',
    category: 'domain',
    description: 'UX/UI architecture',
    capabilities: ['read_code', 'write_code', 'web_search'],
    color: '#86efac',
  },
  {
    agent_type: 'writer',
    name: 'Writer',
    model: 'haiku',
    category: 'domain',
    description: 'Docs & migration notes',
    capabilities: ['read_code', 'write_code', 'file_management'],
    color: '#bbf7d0',
  },
  {
    agent_type: 'qa-tester',
    name: 'QA Tester',
    model: 'sonnet',
    category: 'domain',
    description: 'CLI/service runtime validation',
    capabilities: ['read_code', 'execute_shell', 'test_execution'],
    color: '#34d399',
  },
  {
    agent_type: 'scientist',
    name: 'Scientist',
    model: 'sonnet',
    category: 'domain',
    description: 'Data/statistical analysis',
    capabilities: ['read_code', 'execute_shell', 'mcp_tools'],
    color: '#059669',
  },
  {
    agent_type: 'git-master',
    name: 'Git Master',
    model: 'sonnet',
    category: 'domain',
    description: 'Commit strategy & history',
    capabilities: ['read_code', 'execute_shell', 'git_operations'],
    color: '#10b981',
  },

  // Product (4종)
  {
    agent_type: 'product-manager',
    name: 'Product Manager',
    model: 'sonnet',
    category: 'product',
    description: 'Problem framing & PRDs',
    capabilities: ['read_code', 'web_search'],
    color: '#f59e0b',
  },
  {
    agent_type: 'ux-researcher',
    name: 'UX Researcher',
    model: 'sonnet',
    category: 'product',
    description: 'Usability & accessibility',
    capabilities: ['read_code', 'web_search'],
    color: '#d97706',
  },
  {
    agent_type: 'information-architect',
    name: 'Information Architect',
    model: 'sonnet',
    category: 'product',
    description: 'Taxonomy & navigation',
    capabilities: ['read_code', 'web_search'],
    color: '#b45309',
  },
  {
    agent_type: 'product-analyst',
    name: 'Product Analyst',
    model: 'sonnet',
    category: 'product',
    description: 'Product metrics & experiments',
    capabilities: ['read_code', 'web_search'],
    color: '#fbbf24',
  },

  // Coordination (2종)
  {
    agent_type: 'critic',
    name: 'Critic',
    model: 'opus',
    category: 'coordination',
    description: 'Plan/design challenge',
    capabilities: ['read_code'],
    color: '#ef4444',
  },
  {
    agent_type: 'vision',
    name: 'Vision',
    model: 'sonnet',
    category: 'coordination',
    description: 'Image/screenshot analysis',
    capabilities: ['read_code', 'web_search'],
    color: '#f97316',
  },
];

// ─── 팀 템플릿 (5개) ───

export const TEAM_TEMPLATES: TeamTemplate[] = [
  {
    id: 'feature-development',
    name: '기능 개발',
    description: '분석 → 계획 → 구현 → 테스트/리뷰 → 검증',
    category: 'development',
    pipeline_preset_id: 'feature-development',
    agents: [
      { agent_type: 'analyst', role: 'worker' as AgentRole },
      { agent_type: 'planner', role: 'worker' as AgentRole },
      { agent_type: 'executor', role: 'worker' as AgentRole },
      { agent_type: 'test-engineer', role: 'reviewer' as AgentRole },
      { agent_type: 'quality-reviewer', role: 'reviewer' as AgentRole },
      { agent_type: 'verifier', role: 'reviewer' as AgentRole },
    ],
  },
  {
    id: 'bug-investigation',
    name: '버그 수정',
    description: '탐색+디버깅 → 수정 → 회귀 테스트 → 검증',
    category: 'development',
    pipeline_preset_id: 'bug-fix',
    agents: [
      { agent_type: 'explore', role: 'worker' as AgentRole },
      { agent_type: 'debugger', role: 'worker' as AgentRole },
      { agent_type: 'executor', role: 'worker' as AgentRole },
      { agent_type: 'test-engineer', role: 'reviewer' as AgentRole },
      { agent_type: 'verifier', role: 'reviewer' as AgentRole },
    ],
  },
  {
    id: 'code-review',
    name: '코드 리뷰',
    description: '스타일/품질/보안/성능 동시 리뷰',
    category: 'review',
    pipeline_preset_id: 'code-review',
    agents: [
      { agent_type: 'style-reviewer', role: 'reviewer' as AgentRole },
      { agent_type: 'quality-reviewer', role: 'reviewer' as AgentRole },
      { agent_type: 'security-reviewer', role: 'reviewer' as AgentRole },
      { agent_type: 'performance-reviewer', role: 'reviewer' as AgentRole },
    ],
  },
  {
    id: 'product-discovery',
    name: '프로덕트 디스커버리',
    description: 'PM + UX 리서치 + IA + 분석가',
    category: 'product',
    pipeline_preset_id: 'product-discovery',
    agents: [
      { agent_type: 'product-manager', role: 'lead' as AgentRole },
      { agent_type: 'ux-researcher', role: 'worker' as AgentRole },
      { agent_type: 'information-architect', role: 'worker' as AgentRole },
      { agent_type: 'product-analyst', role: 'worker' as AgentRole },
    ],
  },
  {
    id: 'refactoring',
    name: '리팩토링',
    description: '아키텍처 분석 → 계획 → 실행 → 검증',
    category: 'development',
    pipeline_preset_id: 'refactor',
    agents: [
      { agent_type: 'architect', role: 'lead' as AgentRole },
      { agent_type: 'planner', role: 'worker' as AgentRole },
      { agent_type: 'executor', role: 'worker' as AgentRole },
      { agent_type: 'test-engineer', role: 'reviewer' as AgentRole },
      { agent_type: 'quality-reviewer', role: 'reviewer' as AgentRole },
      { agent_type: 'verifier', role: 'reviewer' as AgentRole },
    ],
  },
];

// ─── 시드 함수 ───

/**
 * 프리셋 페르소나를 DB에 시드
 * INSERT OR IGNORE를 사용하여 이미 존재하는 데이터는 건너뜀
 */
export function seedPresetPersonas(database: Database.Database): void {
  const insertStmt = database.prepare(`
    INSERT OR IGNORE INTO agent_personas
    (agent_type, name, model, category, description, capabilities, tool_access, source, color)
    VALUES (?, ?, ?, ?, ?, ?, NULL, 'preset', ?)
  `);

  const insertMany = database.transaction(() => {
    for (const persona of PRESET_PERSONAS) {
      insertStmt.run(
        persona.agent_type,
        persona.name,
        persona.model,
        persona.category,
        persona.description,
        JSON.stringify(persona.capabilities),
        persona.color
      );
    }
  });

  insertMany();
}
