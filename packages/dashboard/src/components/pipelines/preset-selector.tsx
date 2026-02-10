'use client';

import { useState } from 'react';
import { usePipelinePresets } from '@/lib/hooks/use-pipelines';
import type { PipelinePreset } from '@claudeops/shared';
import { Layers, X, BookTemplate } from 'lucide-react';

interface PresetSelectorProps {
  onSelect: (preset: PipelinePreset) => void;
}

export function PresetSelector({ onSelect }: PresetSelectorProps) {
  const [open, setOpen] = useState(false);
  const { data: presets } = usePipelinePresets();

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="cursor-pointer flex items-center gap-1.5 rounded-md border border-input px-3 py-2 text-sm font-medium hover:bg-accent transition-colors"
      >
        <BookTemplate className="h-4 w-4" />
        프리셋
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-[560px] max-h-[70vh] rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h2 className="text-lg font-semibold">프리셋 템플릿</h2>
              <button onClick={() => setOpen(false)} className="cursor-pointer p-1 rounded hover:bg-accent transition-colors">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 overflow-y-auto max-h-[55vh] grid grid-cols-2 gap-3">
              {presets?.map((preset) => (
                <button
                  key={preset.id}
                  onClick={() => { onSelect(preset); setOpen(false); }}
                  className="cursor-pointer text-left rounded-lg border border-border p-4 hover:bg-accent/50 hover:border-primary/50 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Layers className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium">{preset.name}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-2">{preset.description}</p>
                  <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                    <span>{preset.steps.length}단계</span>
                    <span>&middot;</span>
                    <span>{preset.steps.reduce((sum, s) => sum + s.agents.length, 0)}개 에이전트</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
