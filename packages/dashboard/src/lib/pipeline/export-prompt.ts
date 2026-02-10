import type { PipelineStep } from '@claudeops/shared';

export function exportAsPrompt(name: string, steps: PipelineStep[]): string {
  const lines: string[] = [
    `# Pipeline: ${name}`,
    '',
    `Total steps: ${steps.length}`,
    '',
  ];

  for (const step of steps) {
    lines.push(`## Step ${step.step}${step.parallel ? ' (parallel)' : ''}`);
    lines.push('');

    for (const agent of step.agents) {
      lines.push(`- **${agent.type}** (${agent.model})`);
      if (agent.prompt) {
        lines.push(`  > ${agent.prompt}`);
      }
    }

    lines.push('');
  }

  return lines.join('\n');
}
