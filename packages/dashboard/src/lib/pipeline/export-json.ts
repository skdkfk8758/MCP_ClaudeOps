import type { PipelineStep } from '@claudeops/shared';

interface PipelineData {
  name: string;
  description?: string;
  steps: PipelineStep[];
}

export function exportAsJson(pipeline: PipelineData): string {
  return JSON.stringify(pipeline, null, 2);
}

export function importFromJson(json: string): PipelineData {
  return JSON.parse(json) as PipelineData;
}
