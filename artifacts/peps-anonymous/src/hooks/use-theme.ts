import { create } from "zustand";
import { persist } from "zustand/middleware";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

function applyTheme(dark: boolean) {
  document.documentElement.setAttribute("data-theme", dark ? "dark" : "light");
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set, get) => ({
      dark: false,
      toggle: () => {
        const next = !get().dark;
        applyTheme(next);
        set({ dark: next });
      },
    }),
    { name: "peps-theme" }
  )
);

// Apply stored theme immediately on module load (before first render)
try {
  const raw = localStorage.getItem("peps-theme");
  const saved = raw ? JSON.parse(raw) : null;
  applyTheme(!!saved?.state?.dark);
} catch {
  applyTheme(false);
}

// Keep legacy export for any existing consumers
export function useTheme() {
  const { dark, toggle } = useThemeStore();
  return { theme: dark ? "dark" : "light", toggleTheme: toggle, isDark: dark };
}
