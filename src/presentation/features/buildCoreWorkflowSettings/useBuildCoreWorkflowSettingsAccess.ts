'use client';

import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export function useBuildCoreWorkflowSettingsAccess(): {
  readonly isLoadingPermissions: boolean;
  readonly canManageWorkflowSettings: boolean;
} {
  const dash = useBuildCoreDashboardContext();
  return {
    isLoadingPermissions: dash.isOrganizationPermissionsLoading,
    canManageWorkflowSettings: dash.canAccessBuildCoreWorkflowStages,
  };
}
