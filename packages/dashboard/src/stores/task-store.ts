import { create } from 'zustand';

interface TaskStoreState {
  statusFilter: string | null;
  priorityFilter: string | null;
  assigneeFilter: string | null;
  searchQuery: string;
  setStatusFilter: (status: string | null) => void;
  setPriorityFilter: (priority: string | null) => void;
  setAssigneeFilter: (assignee: string | null) => void;
  setSearchQuery: (query: string) => void;
  resetFilters: () => void;
}

export const useTaskStore = create<TaskStoreState>((set) => ({
  statusFilter: null,
  priorityFilter: null,
  assigneeFilter: null,
  searchQuery: '',
  setStatusFilter: (status) => set({ statusFilter: status }),
  setPriorityFilter: (priority) => set({ priorityFilter: priority }),
  setAssigneeFilter: (assignee) => set({ assigneeFilter: assignee }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  resetFilters: () => set({ statusFilter: null, priorityFilter: null, assigneeFilter: null, searchQuery: '' }),
}));
