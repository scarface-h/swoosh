import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AdminTheme = "light" | "dark" | "system";

interface UiState {
  theme: AdminTheme;
  sidebarCollapsed: boolean;
  setTheme: (theme: AdminTheme) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
}

export const useUiStore = create<UiState>()(
  persist(
    (set) => ({
      theme: "system",
      sidebarCollapsed: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () =>
        set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
      setSidebarCollapsed: (sidebarCollapsed) => set({ sidebarCollapsed }),
    }),
    { name: "swoosh-admin-ui" },
  ),
);
