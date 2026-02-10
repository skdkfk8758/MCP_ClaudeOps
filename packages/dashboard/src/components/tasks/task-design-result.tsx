'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApproveDesign, useDesignTask, useUpdateDesign, useScopeProposal, useScopeSplit } from '@/lib/hooks/use-tasks';
import {
  CheckCircle, RefreshCw, Loader2, Pencil, X, Save,
  Plus, Trash2, ChevronUp, ChevronDown, ToggleLeft, ToggleRight, AlertTriangle,
} from 'lucide-react';
import { DesignFlowEditor } from './design-flow-editor';
import { AGENT_DEFINITIONS } from '@/lib/pipeline/agents';
import type { Task, DesignResult, DesignStep, AgentTier } from '@claudeops/shared';

// --- 인라인 편집 가능 텍스트 필드 ---

function EditableOverview({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!editing) {
    return (
      <div
        className="group relative rounded-md bg-muted/50 p-3 cursor-pointer hover:bg-muted/70 transition-colors"
        onClick={() => { setDraft(value); setEditing(true); }}
      >
        <p className="text-sm whitespace-pre-wrap">{value}</p>
        <Pencil className="absolute top-2 right-2 h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        rows={4}
        className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm resize-y"
        autoFocus
      />
      <div className="flex justify-end gap-1.5">
        <button
          onClick={() => setEditing(false)}
          className="cursor-pointer flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent transition-colors"
        >
          <X className="h-3 w-3" /> 취소
        </button>
        <button
          onClick={() => { onChange(draft); setEditing(false); }}
          className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-2 py-1 text-xs font-medium text-primary-foreground hover:opacity-90"
        >
          <Save className="h-3 w-3" /> 적용
        </button>
      </div>
    </div>
  );
}

// --- 편집 가능한 리스트 (위험 요소 / 성공 기준) ---

function EditableList({
  label,
  items,
  onChange,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
}) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    const trimmed = newItem.trim();
    if (!trimmed) return;
    onChange([...items, trimmed]);
    setNewItem('');
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1">{label}</h4>
      <ul className="text-sm text-muted-foreground space-y-1">
        {items.map((item, i) => (
          <li key={i} className="group flex items-start gap-1.5">
            <span className="mt-0.5 text-muted-foreground/60">•</span>
            <span className="flex-1">{item}</span>
            <button
              onClick={() => handleRemove(i)}
              className="cursor-pointer opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-destructive/10 transition-all"
              title="삭제"
            >
              <Trash2 className="h-3 w-3 text-destructive" />
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-1.5 mt-1.5">
        <input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') handleAdd(); }}
          placeholder="항목 추가..."
          className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-xs"
        />
        <button
          onClick={handleAdd}
          disabled={!newItem.trim()}
          className="cursor-pointer flex items-center gap-1 rounded-md border border-input px-2 py-1 text-xs hover:bg-accent transition-colors disabled:opacity-50"
        >
          <Plus className="h-3 w-3" /> 추가
        </button>
      </div>
    </div>
  );
}

// --- 편집 가능한 구현 단계 카드 ---

function EditableStepCard({
  step,
  index,
  total,
  onChange,
  onRemove,
  onMove,
}: {
  step: DesignStep;
  index: number;
  total: number;
  onChange: (updated: DesignStep) => void;
  onRemove: () => void;
  onMove: (direction: 'up' | 'down') => void;
}) {
  const [editingTitle, setEditingTitle] = useState(false);
  const [editingDesc, setEditingDesc] = useState(false);

  const scopeStyle = step.scope_tag === 'out-of-scope'
    ? 'border-l-4 border-l-red-500'
    : step.scope_tag === 'partial'
      ? 'border-l-4 border-l-amber-500'
      : '';

  return (
    <div className={`rounded-md border border-border p-3 text-sm space-y-2 ${scopeStyle}`}>
      {/* 헤더 */}
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary shrink-0">
          Step {step.step}
        </span>

        {/* scope_tag 배지 */}
        {step.scope_tag === 'out-of-scope' && (
          <span className="rounded-full bg-red-100 dark:bg-red-900/30 px-2 py-0.5 text-[10px] font-medium text-red-700 dark:text-red-400">범위 외</span>
        )}
        {step.scope_tag === 'partial' && (
          <span className="rounded-full bg-amber-100 dark:bg-amber-900/30 px-2 py-0.5 text-[10px] font-medium text-amber-700 dark:text-amber-400">부분적</span>
        )}

        {/* 제목 인라인 편집 */}
        {editingTitle ? (
          <input
            value={step.title}
            onChange={(e) => onChange({ ...step, title: e.target.value })}
            onBlur={() => setEditingTitle(false)}
            onKeyDown={(e) => { if (e.key === 'Enter') setEditingTitle(false); }}
            className="flex-1 rounded border border-input bg-background px-2 py-0.5 text-sm font-medium"
            autoFocus
          />
        ) : (
          <span
            className="font-medium flex-1 cursor-pointer hover:text-primary transition-colors"
            onClick={() => setEditingTitle(true)}
            title="클릭하여 편집"
          >
            {step.title || '(제목 없음)'}
          </span>
        )}

        {/* agent_type 드롭다운 */}
        <select
          value={step.agent_type}
          onChange={(e) => {
            const def = AGENT_DEFINITIONS.find((a) => a.id === e.target.value);
            onChange({
              ...step,
              agent_type: e.target.value,
              model: def?.defaultModel ?? step.model,
            });
          }}
          className="rounded bg-muted px-1.5 py-0.5 text-xs border-0 cursor-pointer"
        >
          {AGENT_DEFINITIONS.map((a) => (
            <option key={a.id} value={a.id}>{a.id}</option>
          ))}
        </select>

        {/* model 드롭다운 */}
        <select
          value={step.model}
          onChange={(e) => onChange({ ...step, model: e.target.value as AgentTier })}
          className="rounded bg-muted px-1.5 py-0.5 text-xs border-0 cursor-pointer"
        >
          <option value="haiku">haiku</option>
          <option value="sonnet">sonnet</option>
          <option value="opus">opus</option>
        </select>

        {/* parallel 토글 */}
        <button
          onClick={() => onChange({ ...step, parallel: !step.parallel })}
          className="cursor-pointer flex items-center gap-0.5 rounded px-1.5 py-0.5 text-xs transition-colors hover:bg-accent"
          title={step.parallel ? '병렬 실행 ON' : '병렬 실행 OFF'}
        >
          {step.parallel ? (
            <ToggleRight className="h-3.5 w-3.5 text-blue-500" />
          ) : (
            <ToggleLeft className="h-3.5 w-3.5 text-muted-foreground" />
          )}
          <span className={step.parallel ? 'text-blue-500' : 'text-muted-foreground'}>병렬</span>
        </button>
      </div>

      {/* description 인라인 편집 */}
      {editingDesc ? (
        <textarea
          value={step.description}
          onChange={(e) => onChange({ ...step, description: e.target.value })}
          onBlur={() => setEditingDesc(false)}
          rows={2}
          className="w-full rounded border border-input bg-background px-2 py-1 text-xs resize-y"
          autoFocus
        />
      ) : (
        <p
          className="text-muted-foreground text-xs cursor-pointer hover:text-foreground transition-colors"
          onClick={() => setEditingDesc(true)}
          title="클릭하여 편집"
        >
          {step.description || '(설명 없음 - 클릭하여 추가)'}
        </p>
      )}

      {/* 액션 버튼 */}
      <div className="flex items-center gap-1 pt-1 border-t border-border/50">
        <button
          onClick={() => onMove('up')}
          disabled={index === 0}
          className="cursor-pointer p-1 rounded hover:bg-accent transition-colors disabled:opacity-30"
          title="위로 이동"
        >
          <ChevronUp className="h-3 w-3" />
        </button>
        <button
          onClick={() => onMove('down')}
          disabled={index === total - 1}
          className="cursor-pointer p-1 rounded hover:bg-accent transition-colors disabled:opacity-30"
          title="아래로 이동"
        >
          <ChevronDown className="h-3 w-3" />
        </button>
        <div className="flex-1" />
        <button
          onClick={onRemove}
          className="cursor-pointer p-1 rounded hover:bg-destructive/10 transition-colors"
          title="삭제"
        >
          <Trash2 className="h-3 w-3 text-destructive" />
        </button>
      </div>
    </div>
  );
}

// --- 메인 컴포넌트 ---

export function TaskDesignResult({ task, projectPath }: { task: Task; projectPath: string }) {
  const router = useRouter();
  const approveDesign = useApproveDesign();
  const redesignTask = useDesignTask();
  const updateDesign = useUpdateDesign();
  const { data: scopeData } = useScopeProposal(task.id);
  const scopeSplit = useScopeSplit();

  const isDesigning = task.design_status === 'running';
  const designCompleted = task.design_status === 'completed';
  const designFailed = task.design_status === 'failed';

  // 설계 결과 파싱
  let result: DesignResult | null = null;
  if (designCompleted && task.design_result) {
    try {
      result = typeof task.design_result === 'string' ? JSON.parse(task.design_result) : task.design_result;
    } catch {
      result = null;
    }
  }

  // 편집 상태: 단일 editedSteps를 텍스트 카드와 플로우 에디터에서 공유
  const [editedSteps, setEditedSteps] = useState<DesignStep[] | null>(null);
  const [editedOverview, setEditedOverview] = useState<string | null>(null);
  const [editedRisks, setEditedRisks] = useState<string[] | null>(null);
  const [editedCriteria, setEditedCriteria] = useState<string[] | null>(null);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  // 현재 표시할 값 (편집 중이면 편집값, 아니면 원본)
  const currentSteps = editedSteps ?? result?.steps ?? [];
  const currentOverview = editedOverview ?? result?.overview ?? '';
  const currentRisks = editedRisks ?? result?.risks ?? [];
  const currentCriteria = editedCriteria ?? result?.success_criteria ?? [];

  // 저장 핸들러
  const handleSaveAll = useCallback(() => {
    if (!result) return;
    updateDesign.mutate({
      id: task.id,
      steps: editedSteps ?? result.steps,
      overview: editedOverview ?? result.overview,
      risks: editedRisks ?? result.risks,
      success_criteria: editedCriteria ?? result.success_criteria,
    }, {
      onSuccess: () => {
        setEditedSteps(null);
        setEditedOverview(null);
        setEditedRisks(null);
        setEditedCriteria(null);
        setHasUnsavedChanges(false);
      },
    });
  }, [task.id, result, editedSteps, editedOverview, editedRisks, editedCriteria, updateDesign]);

  // 플로우 에디터에서 저장
  const handleFlowSave = useCallback((steps: DesignStep[]) => {
    setEditedSteps(steps);
    setHasUnsavedChanges(true);
    // 즉시 API로 저장
    updateDesign.mutate({
      id: task.id,
      steps,
      overview: editedOverview ?? result?.overview,
      risks: editedRisks ?? result?.risks,
      success_criteria: editedCriteria ?? result?.success_criteria,
    }, {
      onSuccess: () => {
        setEditedSteps(null);
        setEditedOverview(null);
        setEditedRisks(null);
        setEditedCriteria(null);
        setHasUnsavedChanges(false);
      },
    });
  }, [task.id, result, editedOverview, editedRisks, editedCriteria, updateDesign]);

  // overview 변경
  const handleOverviewChange = useCallback((v: string) => {
    setEditedOverview(v);
    setHasUnsavedChanges(true);
  }, []);

  // risks 변경
  const handleRisksChange = useCallback((items: string[]) => {
    setEditedRisks(items);
    setHasUnsavedChanges(true);
  }, []);

  // criteria 변경
  const handleCriteriaChange = useCallback((items: string[]) => {
    setEditedCriteria(items);
    setHasUnsavedChanges(true);
  }, []);

  // 카드 단일 수정 → editedSteps 반영
  const handleStepChange = useCallback((index: number, updated: DesignStep) => {
    const steps = [...currentSteps];
    steps[index] = updated;
    setEditedSteps(steps);
    setHasUnsavedChanges(true);
  }, [currentSteps]);

  // 카드 삭제
  const handleStepRemove = useCallback((index: number) => {
    const steps = currentSteps.filter((_, i) => i !== index);
    // step 번호 재정렬
    const renumbered = steps.map((s, i) => ({ ...s, step: i + 1 }));
    setEditedSteps(renumbered);
    setHasUnsavedChanges(true);
  }, [currentSteps]);

  // 카드 이동
  const handleStepMove = useCallback((index: number, direction: 'up' | 'down') => {
    const steps = [...currentSteps];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= steps.length) return;
    [steps[index], steps[targetIndex]] = [steps[targetIndex], steps[index]];
    const renumbered = steps.map((s, i) => ({ ...s, step: i + 1 }));
    setEditedSteps(renumbered);
    setHasUnsavedChanges(true);
  }, [currentSteps]);

  // --- 렌더링 ---

  if (isDesigning) {
    return (
      <div className="rounded-lg border border-border bg-card p-6 flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-primary" />
        <div>
          <p className="text-sm font-medium">설계 진행 중...</p>
          <p className="text-xs text-muted-foreground mt-1">Claude가 구현 계획을 작성하고 있습니다</p>
        </div>
      </div>
    );
  }

  if (designFailed) {
    return (
      <div className="rounded-lg border border-destructive/50 bg-destructive/5 p-4 space-y-3">
        <p className="text-sm font-medium text-destructive">설계 실패</p>
        <button
          onClick={() => redesignTask.mutate({ id: task.id, project_path: projectPath })}
          disabled={redesignTask.isPending}
          className="cursor-pointer flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" /> 재설계
        </button>
      </div>
    );
  }

  if (!designCompleted || !result) return null;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold text-muted-foreground">설계 결과</h3>
        {hasUnsavedChanges && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-amber-500">변경사항 미저장</span>
            <button
              onClick={handleSaveAll}
              disabled={updateDesign.isPending}
              className="cursor-pointer flex items-center gap-1 rounded-md bg-primary px-2.5 py-1 text-xs font-medium text-primary-foreground hover:opacity-90 disabled:opacity-50"
            >
              {updateDesign.isPending ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Save className="h-3 w-3" />
              )}
              모두 저장
            </button>
          </div>
        )}
      </div>

      {/* 범위 초과 경고 배너 */}
      {scopeData?.has_proposal && scopeData.proposal && (
        <div className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/30 p-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500 mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-sm font-medium text-amber-800 dark:text-amber-300">
                에픽 범위 초과 감지
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                {scopeData.proposal.out_of_scope_steps.length}개 단계가 현재 에픽의 범위를 벗어납니다.
                {scopeData.proposal.partial_steps.length > 0 && ` (부분적: ${scopeData.proposal.partial_steps.length}개)`}
              </p>
            </div>
          </div>

          <div className="rounded-md bg-white/60 dark:bg-black/20 p-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">제안된 새 에픽</p>
            <p className="text-sm font-medium">{scopeData.proposal.suggested_epic.title}</p>
            <p className="text-xs text-muted-foreground line-clamp-2">{scopeData.proposal.suggested_epic.description}</p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => scopeSplit.mutate({ id: task.id })}
              disabled={scopeSplit.isPending}
              className="cursor-pointer flex items-center gap-1.5 rounded-md bg-amber-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-amber-700 transition-colors disabled:opacity-50"
            >
              {scopeSplit.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <CheckCircle className="h-3 w-3" />}
              분리 승인
            </button>
            <button
              onClick={() => {/* 무시 — 배너 숨기기 */}}
              className="cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs hover:bg-accent transition-colors"
            >
              무시
            </button>
          </div>
        </div>
      )}

      {/* Overview 인라인 편집 */}
      {currentOverview && (
        <EditableOverview
          value={currentOverview}
          onChange={handleOverviewChange}
        />
      )}

      {/* 플로우 에디터 (미리보기 + 편집 토글) */}
      {currentSteps.length > 0 && (
        <DesignFlowEditor
          steps={currentSteps}
          onSave={handleFlowSave}
          saving={updateDesign.isPending}
        />
      )}

      {/* 구현 단계 카드 리스트 (인라인 편집) */}
      {currentSteps.length > 0 && (
        <div className="space-y-2">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            구현 단계 ({currentSteps.length})
          </h4>
          {currentSteps.map((step, i) => (
            <EditableStepCard
              key={`step-${step.step}-${i}`}
              step={step}
              index={i}
              total={currentSteps.length}
              onChange={(updated) => handleStepChange(i, updated)}
              onRemove={() => handleStepRemove(i)}
              onMove={(dir) => handleStepMove(i, dir)}
            />
          ))}
        </div>
      )}

      {/* 위험 요소 편집 */}
      {(currentRisks.length > 0 || hasUnsavedChanges) && (
        <EditableList
          label="위험 요소"
          items={currentRisks}
          onChange={handleRisksChange}
        />
      )}

      {/* 성공 기준 편집 */}
      {(currentCriteria.length > 0 || hasUnsavedChanges) && (
        <EditableList
          label="성공 기준"
          items={currentCriteria}
          onChange={handleCriteriaChange}
        />
      )}

      {/* 승인/재설계 버튼 */}
      {!task.pipeline_id && (
        <div className="flex justify-end gap-2 pt-2 border-t border-border">
          <button
            onClick={() => redesignTask.mutate({ id: task.id, project_path: projectPath })}
            disabled={redesignTask.isPending}
            className="cursor-pointer flex items-center gap-1.5 rounded-md border border-input px-3 py-1.5 text-sm hover:bg-accent transition-colors disabled:opacity-50"
          >
            <RefreshCw className="h-3.5 w-3.5" /> 재설계
          </button>
          <button
            onClick={() => approveDesign.mutate(task.id, {
              onSuccess: (data) => {
                router.push(`/pipelines/${data.pipeline_id}`);
              },
            })}
            disabled={approveDesign.isPending}
            className="cursor-pointer flex items-center gap-1.5 rounded-md bg-green-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-green-700 transition-colors disabled:opacity-50"
          >
            <CheckCircle className="h-3.5 w-3.5" /> {approveDesign.isPending ? '승인 중...' : '승인 및 파이프라인 생성'}
          </button>
        </div>
      )}
    </div>
  );
}
