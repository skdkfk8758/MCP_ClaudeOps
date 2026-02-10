'use client';

import { Save, Play, PlayCircle, Download, Upload, Undo2 } from 'lucide-react';

interface PipelineToolbarProps {
  name: string;
  onNameChange: (name: string) => void;
  onSave: () => void;
  onExecute: () => void;
  onSimulate: () => void;
  onExportJson: () => void;
  onImportJson: () => void;
  onAutoLayout: () => void;
  saving?: boolean;
  executing?: boolean;
  hasChanges?: boolean;
}

export function PipelineToolbar({
  name, onNameChange, onSave, onExecute, onSimulate,
  onExportJson, onImportJson, onAutoLayout,
  saving, executing, hasChanges,
}: PipelineToolbarProps) {
  return (
    <div className="flex items-center gap-2 p-2 border-b border-border bg-card">
      <input
        type="text"
        value={name}
        onChange={(e) => onNameChange(e.target.value)}
        className="rounded-md border border-input bg-background px-3 py-1.5 text-sm font-medium w-48"
        placeholder="파이프라인 이름"
      />

      <div className="h-5 w-px bg-border mx-1" />

      <button
        onClick={onSave}
        disabled={saving}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50 transition-opacity"
      >
        <Save className="h-3.5 w-3.5" />
        {saving ? '저장 중...' : '저장'}
        {hasChanges && <span className="w-1.5 h-1.5 rounded-full bg-yellow-400" />}
      </button>

      <button
        onClick={onSimulate}
        disabled={executing}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium border border-input hover:bg-accent transition-colors"
      >
        <PlayCircle className="h-3.5 w-3.5" />
        시뮬레이션
      </button>

      <button
        onClick={onExecute}
        disabled={executing}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium bg-green-600 text-white hover:bg-green-700 disabled:opacity-50 transition-colors"
      >
        <Play className="h-3.5 w-3.5" />
        {executing ? '실행 중...' : '실행'}
      </button>

      <div className="flex-1" />

      <button
        onClick={onAutoLayout}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        title="자동 정렬"
      >
        <Undo2 className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={onExportJson}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        title="JSON 내보내기"
      >
        <Download className="h-3.5 w-3.5" />
      </button>

      <button
        onClick={onImportJson}
        className="cursor-pointer flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs text-muted-foreground hover:bg-accent transition-colors"
        title="JSON 가져오기"
      >
        <Upload className="h-3.5 w-3.5" />
      </button>
    </div>
  );
}
