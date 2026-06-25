'use client';

import { useMemo } from 'react';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useZenformedOrganizationWorkspace } from '@zenformed/core/organization-settings';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { createDemoOrganizationWorkspaceSnapshot } from '@/infrastructure/demo/demoOrganizationTeamsFixtures';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import {
  buildBuildCoreTeamsPageModel,
  type BuildCoreTeamsPageModel,
} from './buildCoreTeamsViewModel';

export function useBuildCoreTeamsPage(): {
  model: BuildCoreTeamsPageModel;
  isLoading: boolean;
  loadError: string | null;
  refetch: () => Promise<void>;
} {
  const dash = useBuildCoreDashboardContext();
  const subscriptionActive = dash.entitlementSnapshot?.subscriptionActive ?? false;
  const isDemoRuntime = runtimeModes.isDemoRuntime();

  const workspace = useZenformedOrganizationWorkspace({
    apiUrls: {
      membershipContext: nav.apis.organizationMembershipContext,
      members: nav.apis.organizationMembers,
      invites: nav.apis.organizationInvites,
      seats: nav.apis.organizationSeats,
      appAccess: nav.apis.organizationAppAccess,
      memberRole: nav.apis.organizationMemberRole,
    },
    getAccessToken: dash.getAccessToken,
    enabled: dash.canAccessBuildCoreTeams && !isDemoRuntime,
  });

  const demoSnapshot = useMemo(
    () => (isDemoRuntime ? createDemoOrganizationWorkspaceSnapshot() : null),
    [isDemoRuntime]
  );

  const model = useMemo(
    () =>
      buildBuildCoreTeamsPageModel(
        isDemoRuntime ? demoSnapshot : workspace.snapshot,
        subscriptionActive
      ),
    [demoSnapshot, isDemoRuntime, subscriptionActive, workspace.snapshot]
  );

  return {
    model,
    isLoading: isDemoRuntime ? false : workspace.isLoading,
    loadError: isDemoRuntime ? null : workspace.loadError,
    refetch: workspace.refetch,
  };
}
