import { create } from 'zustand';

interface UiState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  collapsedGroups: Record<string, boolean>;
  toggleGroup: (title: string) => void;
}

export const useUiStore = create<UiState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  collapsedGroups: {},
  toggleGroup: (title: string) =>
    set((state) => ({
      collapsedGroups: {
        ...state.collapsedGroups,
        [title]: !state.collapsedGroups[title],
      },
    })),
}));
