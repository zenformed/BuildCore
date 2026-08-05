'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState, type ReactElement, type ReactNode } from 'react';

export type BuildCoreQueryProviderProps = {
  readonly children: ReactNode;
};

/**
 * App-shell TanStack Query foundation (Phase 0).
 * No existing lists are migrated onto Query yet.
 */
export function BuildCoreQueryProvider({ children }: BuildCoreQueryProviderProps): ReactElement {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000,
            gcTime: 5 * 60_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}
