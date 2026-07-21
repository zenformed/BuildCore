'use client';

import { APIProvider } from '@vis.gl/react-google-maps';
import type { ReactElement, ReactNode } from 'react';
import { env } from '@/infrastructure/config/env';

export type BuildCoreGoogleMapsProviderProps = {
  readonly children: ReactNode;
};

/**
 * Single Maps JavaScript API boundary shared by the dashboard map and Places inputs.
 * When Maps is unconfigured, non-map dashboard features continue to work normally.
 */
export function BuildCoreGoogleMapsProvider({
  children,
}: BuildCoreGoogleMapsProviderProps): ReactElement {
  const apiKey = env.googleMapsApiKey;
  if (!apiKey) return <>{children}</>;

  return (
    <APIProvider apiKey={apiKey} onError={() => undefined}>
      {children}
    </APIProvider>
  );
}
