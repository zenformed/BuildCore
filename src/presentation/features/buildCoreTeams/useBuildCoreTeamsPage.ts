'use client';

import { useMemo } from 'react';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useZenformedOrganizationWorkspace } from '@zenformed/core/organization-settings';
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
    enabled: true,
  });

  const model = useMemo(
    () => buildBuildCoreTeamsPageModel(workspace.snapshot, subscriptionActive),
    [workspace.snapshot, subscriptionActive]
  );

  return {
    model,
    isLoading: workspace.isLoading,
    loadError: workspace.loadError,
    refetch: workspace.refetch,
  };
}
