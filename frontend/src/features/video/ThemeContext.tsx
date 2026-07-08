import React, { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

/**
 * Light/dark theme for the Video Expert shell (T7.8). Ported from VideoExpert.
 * Toggles a `.dark` class on <html>; the dark CSS variables are SCOPED under
 * `.video-app` in index.css, so only the video subtree changes — the Vehicle
 * Report pages are unaffected even when dark is active.
 */
type Theme = 'light' | 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

const THEME_STORAGE_KEY = 'video-app-theme';

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem(THEME_STORAGE_KEY) as Theme | null;
      if (saved) return saved;
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');
    root.classList.add(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    // Leaving the video shell shouldn't strand the report pages in `.dark`; the
    // dark vars are scoped to `.video-app`, but drop the class on unmount anyway.
    return () => {
      root.classList.remove('dark');
    };
  }, [theme]);

  const toggleTheme = () => setThemeState((p) => (p === 'light' ? 'dark' : 'light'));
  const setTheme = (t: Theme) => setThemeState(t);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
