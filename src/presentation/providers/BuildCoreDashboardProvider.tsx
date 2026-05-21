'use client';

import {
  createContext,
  useContext,
  type ReactElement,
  type ReactNode,
} from 'react';
import { useBuildCoreDashboard } from '@/presentation/features/buildCoreDashboard/useBuildCoreDashboard';

export type BuildCoreDashboardContextValue = ReturnType<typeof useBuildCoreDashboard>;

const BuildCoreDashboardContext = createContext<BuildCoreDashboardContextValue | null>(null);

export type BuildCoreDashboardProviderProps = {
  children: ReactNode;
};

export function BuildCoreDashboardProvider({ children }: BuildCoreDashboardProviderProps): ReactElement {
  const dash = useBuildCoreDashboard();
  return (
    <BuildCoreDashboardContext.Provider value={dash}>{children}</BuildCoreDashboardContext.Provider>
  );
}

export function useBuildCoreDashboardContext(): BuildCoreDashboardContextValue {
  const value = useContext(BuildCoreDashboardContext);
  if (value == null) {
    throw new Error('useBuildCoreDashboardContext must be used within BuildCoreDashboardProvider');
  }
  return value;
}
