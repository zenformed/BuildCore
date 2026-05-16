'use client';

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

const STORAGE_KEY = buildcoreAppDefinition.themeStorageKey ?? 'buildcore_theme';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: 'light',
  setTheme: () => {},
  toggleTheme: () => {},
});

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  const existing = document.documentElement.dataset.theme as Theme | undefined;
  if (existing === 'dark' || existing === 'light') return existing;
  const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;
  if (stored === 'dark' || stored === 'light') return stored;
  if (window.matchMedia('(prefers-color-scheme: dark)').matches) return 'dark';
  return 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  localStorage.setItem(STORAGE_KEY, theme);
}

/**
 * Provides theme state and applies data-theme to document for CSS variable switching.
 * Persists to localStorage; respects system preference when no stored value.
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const [theme, setThemeState] = useState<Theme>('light');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const initial = getInitialTheme();
    setThemeState(initial);
    applyTheme(initial);
    setMounted(true);
  }, []);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
    applyTheme(next);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!mounted) return;
    applyTheme(theme);
  }, [mounted, theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
