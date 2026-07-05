import React, { createContext, useContext, useState } from "react";

interface ThemeStore {
  dark: boolean;
  toggle: () => void;
}

const ThemeCtx = createContext<ThemeStore>({ dark: true, toggle: () => {} });

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [dark, setDark] = useState(true);
  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export function useThemeStore(): ThemeStore {
  return useContext(ThemeCtx);
}
