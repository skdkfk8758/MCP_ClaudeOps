'use client';

import { usePipelines, useCreatePipeline } from '@/lib/hooks/use-pipelines';
import { PipelineCard } from '@/components/pipelines/pipeline-card';
import { PresetSelector } from '@/components/pipelines/preset-selector';
import { useAppFilterStore } from '@/stores/app-filter-store';
import { FilterResetButton } from '@/components/shared/filter-reset-button';
import type { PipelinePreset } from '@claudeops/shared';
import { Plus, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function PipelinesPage() {
  const statusFilter = useAppFilterStore((s) => s.pipelines.status);
  const setPipelineFilter = useAppFilterStore((s) => s.setPipelineFilter);
  const resetPipelineFilters = useAppFilterStore((s) => s.resetPipelineFilters);
  const pipelineFilterCount = useAppFilterStore((s) => s.getActiveFilterCount('pipelines'));
  const { data: pipelinesData, isLoading } = usePipelines({ status: statusFilter });
  const createPipeline = useCreatePipeline();
  const router = useRouter();

  const pipelines = pipelinesData?.items ?? [];

  const handleCreate = async () => {
    const result = await createPipeline.mutateAsync({
      name: '새 파이프라인',
      steps: [],
    });
    router.push(`/pipelines/${result.id}`);
  };

  const handlePreset = async (preset: PipelinePreset) => {
    const result = await createPipeline.mutateAsync({
      name: preset.name,
      description: preset.description,
      steps: preset.steps,
    });
    router.push(`/pipelines/${result.id}`);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">파이프라인</h1>
          <p className="text-sm text-muted-foreground mt-1">
            에이전트 워크플로우를 시각적으로 설계하고 실행하세요
          </p>
        </div>
        <div className="flex items-center gap-2">
          <PresetSelector onSelect={handlePreset} />
          <button
            onClick={handleCreate}
            disabled={createPipeline.isPending}
            className="cursor-pointer flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {createPipeline.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            새 파이프라인
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        {['all', 'draft', 'ready', 'running', 'completed', 'failed'].map((s) => (
          <button
            key={s}
            onClick={() => setPipelineFilter({ status: s === 'all' ? undefined : s })}
            className={`cursor-pointer rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              (s === 'all' && !statusFilter) || statusFilter === s
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-muted-foreground hover:bg-accent'
            }`}
          >
            {s === 'all' ? '전체' : s === 'draft' ? '초안' : s === 'ready' ? '준비됨' : s === 'running' ? '실행 중' : s === 'completed' ? '완료' : '실패'}
          </button>
        ))}
        <FilterResetButton activeCount={pipelineFilterCount} onReset={resetPipelineFilters} />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : pipelines.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.map((p) => (
            <PipelineCard key={p.id} pipeline={p} />
          ))}
        </div>
      ) : (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">파이프라인이 없습니다</p>
          <p className="text-xs mt-1">새 파이프라인을 만들거나 프리셋을 선택하세요</p>
        </div>
      )}
    </div>
  );
}
