'use client';

import type { ReactElement, ReactNode } from 'react';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreReportsAccessGateProps = {
  readonly children: ReactNode;
};

/** Blocks Reports page content when the signed-in user is a BuildCore member. */
export function BuildCoreReportsAccessGate({
  children,
}: BuildCoreReportsAccessGateProps): ReactElement | null {
  const dash = useBuildCoreDashboardContext();
  if (!dash.canAccessBuildCoreReports) {
    return null;
  }
  return <>{children}</>;
}
