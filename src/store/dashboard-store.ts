import { create } from "zustand";

interface DashboardState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const useDashboardStore = create<DashboardState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  searchQuery: "",
  setSearchQuery: (searchQuery) => set({ searchQuery }),
  activeTab: "dashboard",
  setActiveTab: (activeTab) => set({ activeTab }),
}));
