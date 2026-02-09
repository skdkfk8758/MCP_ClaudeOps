import { create } from 'zustand';

interface SessionState {
  activeSessionId: string | null;
  setActiveSessionId: (id: string | null) => void;
}

export const useSessionStore = create<SessionState>((set) => ({
  activeSessionId: null,
  setActiveSessionId: (id) => set({ activeSessionId: id }),
}));
