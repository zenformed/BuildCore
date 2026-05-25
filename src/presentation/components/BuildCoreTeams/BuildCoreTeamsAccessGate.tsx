'use client';

import type { ReactElement, ReactNode } from 'react';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { BuildCoreTeamsNoAccess } from './BuildCoreTeamsNoAccess';

export type BuildCoreTeamsAccessGateProps = {
  readonly children: ReactNode;
};

/** Blocks Teams page content when the signed-in user lacks org permission to view team members. */
export function BuildCoreTeamsAccessGate({ children }: BuildCoreTeamsAccessGateProps): ReactElement {
  const dash = useBuildCoreDashboardContext();
  if (!dash.canAccessBuildCoreTeams) {
    return <BuildCoreTeamsNoAccess />;
  }
  return <>{children}</>;
}
