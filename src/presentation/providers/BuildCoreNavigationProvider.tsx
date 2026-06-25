'use client';

import { createContext, useContext, type ReactElement, type ReactNode } from 'react';
import type { BuildCoreNavigation } from '@/platform/navigation/buildCoreNavigationTypes';
import { buildCoreLiveNavigation } from '@/platform/navigation/buildCoreNavigationTypes';

const BuildCoreNavigationContext = createContext<BuildCoreNavigation>(buildCoreLiveNavigation);

export type BuildCoreNavigationProviderProps = {
  readonly navigation: BuildCoreNavigation;
  readonly children: ReactNode;
};

export function BuildCoreNavigationProvider({
  navigation,
  children,
}: BuildCoreNavigationProviderProps): ReactElement {
  return (
    <BuildCoreNavigationContext.Provider value={navigation}>{children}</BuildCoreNavigationContext.Provider>
  );
}

export function useBuildCoreNavigation(): BuildCoreNavigation {
  return useContext(BuildCoreNavigationContext);
}

export type { BuildCoreNavigation };
