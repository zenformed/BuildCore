'use client';

import type { ReactElement, ReactNode } from 'react';

/** Pass-through wrapper; degraded banner lives in dashboard navbar. */
export function CorePlatformAppShell({ children }: { children: ReactNode }): ReactElement {
  return <>{children}</>;
}
