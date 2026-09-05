import { create } from 'zustand';

interface UIState {
  sidebarCollapsed: boolean;
  toggleSidebar: () => void;
  deviceFilters: { status?: string; search?: string };
  setDeviceFilters: (filters: { status?: string; search?: string }) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarCollapsed: false,
  toggleSidebar: () => set((s) => ({ sidebarCollapsed: !s.sidebarCollapsed })),
  deviceFilters: {},
  setDeviceFilters: (filters) => set({ deviceFilters: filters }),
}));