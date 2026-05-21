'use client';

import { useEffect, useState } from 'react';
import { getChartTheme, type ChartTheme } from './chartTheme';

/** Re-read chart colors when the app light/dark theme toggles. */
export function useChartTheme(): ChartTheme {
  const [theme, setTheme] = useState(getChartTheme);

  useEffect(() => {
    const root = document.documentElement;
    const sync = (): void => setTheme(getChartTheme());
    const observer = new MutationObserver(sync);
    observer.observe(root, { attributes: true, attributeFilter: ['data-theme'] });
    return () => observer.disconnect();
  }, []);

  return theme;
}
