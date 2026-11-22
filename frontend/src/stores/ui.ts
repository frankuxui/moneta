import { create } from 'zustand';
import { persist } from 'zustand/middleware';
type Theme = 'light' | 'dark';
export const useUi = create<{
  theme: Theme;
  sidebarOpen: boolean;
  setTheme: (theme: Theme) => void;
  toggleSidebar: () => void;
  closeSidebar: () => void;
}>()(
  persist(
    (set) => ({
      theme: 'light',
      sidebarOpen: false,
      setTheme: (theme) => set({ theme }),
      toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
      closeSidebar: () => set({ sidebarOpen: false }),
    }),
    { name: 'moneta-ui', partialize: (s) => ({ theme: s.theme }) },
  ),
);
