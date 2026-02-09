import { create } from 'zustand';

interface FilterState {
  dateRange: { from?: string; to?: string };
  sessionStatus: string | null;
  agentType: string | null;
  modelFilter: string | null;
  setDateRange: (range: { from?: string; to?: string }) => void;
  setSessionStatus: (status: string | null) => void;
  setAgentType: (type: string | null) => void;
  setModelFilter: (model: string | null) => void;
  resetFilters: () => void;
}

export const useFilterStore = create<FilterState>((set) => ({
  dateRange: {},
  sessionStatus: null,
  agentType: null,
  modelFilter: null,
  setDateRange: (range) => set({ dateRange: range }),
  setSessionStatus: (status) => set({ sessionStatus: status }),
  setAgentType: (type) => set({ agentType: type }),
  setModelFilter: (model) => set({ modelFilter: model }),
  resetFilters: () => set({ dateRange: {}, sessionStatus: null, agentType: null, modelFilter: null }),
}));
