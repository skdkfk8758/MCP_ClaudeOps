import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useEffect, useState } from 'react';

// --- 필터 타입 ---

export interface TaskBoardFilters {
  epic_id?: number;
  priority?: string;
  assignee_id?: number;
  label?: string;
  team_id?: number;
  effort?: string;
}

interface PipelineFilters {
  status?: string;
}

interface EpicFilters {
  prd_id?: number;
  status?: string;
}

interface PrdFilters {
  status?: string;
}

// --- 스토어 ---

interface AppFilterState {
  taskBoard: TaskBoardFilters;
  pipelines: PipelineFilters;
  epics: EpicFilters;
  prds: PrdFilters;

  setTaskBoardFilter: (filters: Partial<TaskBoardFilters>) => void;
  setPipelineFilter: (filters: Partial<PipelineFilters>) => void;
  setEpicFilter: (filters: Partial<EpicFilters>) => void;
  setPrdFilter: (filters: Partial<PrdFilters>) => void;

  resetTaskBoardFilters: () => void;
  resetPipelineFilters: () => void;
  resetEpicFilters: () => void;
  resetPrdFilters: () => void;
  resetAllFilters: () => void;

  getActiveFilterCount: (page: 'taskBoard' | 'pipelines' | 'epics' | 'prds') => number;
}

type PersistedSlice = Pick<AppFilterState, 'taskBoard' | 'pipelines' | 'epics' | 'prds'>;

export const useAppFilterStore = create<AppFilterState>()(
  persist<AppFilterState, [], [], PersistedSlice>(
    (set, get) => ({
      taskBoard: {},
      pipelines: {},
      epics: {},
      prds: {},

      setTaskBoardFilter: (f) => set((s) => ({ taskBoard: { ...s.taskBoard, ...f } })),
      setPipelineFilter: (f) => set((s) => ({ pipelines: { ...s.pipelines, ...f } })),
      setEpicFilter: (f) => set((s) => ({ epics: { ...s.epics, ...f } })),
      setPrdFilter: (f) => set((s) => ({ prds: { ...s.prds, ...f } })),

      resetTaskBoardFilters: () => set({ taskBoard: {} }),
      resetPipelineFilters: () => set({ pipelines: {} }),
      resetEpicFilters: () => set({ epics: {} }),
      resetPrdFilters: () => set({ prds: {} }),
      resetAllFilters: () => set({ taskBoard: {}, pipelines: {}, epics: {}, prds: {} }),

      getActiveFilterCount: (page) => {
        const filters = get()[page];
        return Object.values(filters).filter((v) => v !== undefined && v !== '').length;
      },
    }),
    {
      name: 'claudeops-filters',
      version: 1,
      partialize: (state) => ({
        taskBoard: state.taskBoard,
        pipelines: state.pipelines,
        epics: state.epics,
        prds: state.prds,
      }),
    }
  )
);

// SSR 하이드레이션 안전 훅
export function useFilterStoreHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => { setHydrated(true); }, []);
  return hydrated;
}
