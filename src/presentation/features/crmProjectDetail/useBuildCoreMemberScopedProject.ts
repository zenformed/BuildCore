'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  applyBuildCoreMemberProjectDetailView,
  DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
  filterBudgetEntriesForBuildCoreMember,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import { maskProjectDetailContactEmailForMember } from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useAuth } from '@/presentation/hooks/useAuth';
import { fetchBuildCoreWorkflowTaskMemberVisibilityBff } from '@/infrastructure/coreApi/buildCoreWorkflowTaskMemberVisibilityBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export function useBuildCoreMemberScopedProject(
  project: CrmProjectDetail,
  isMemberRole: boolean,
  isApiSource: boolean
): CrmProjectDetail {
  const { user } = useAuth();
  const dash = useBuildCoreDashboardContext();
  const { access, isReady } = useBuildCoreWorkflowTaskAccess();
  const { payment: paymentAccess, budget: budgetAccess } = useBuildCoreProjectSectionAccess();
  const [fallbackMemberIds, setFallbackMemberIds] = useState<readonly string[]>([]);
  const [fallbackOnlyAssigned, setFallbackOnlyAssigned] = useState(
    DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW
  );
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  const needsMockVisibility = isMemberRole && !isApiSource;
  const needsFallback = needsMockVisibility && isReady && access?.actorRole !== 'member';

  const loadFallbackVisibility = useCallback(async () => {
    if (!needsMockVisibility) {
      setFallbackLoaded(true);
      return;
    }
    const token = dash.getAccessToken();
    if (!token) {
      setFallbackLoaded(true);
      return;
    }
    try {
      const settings = await fetchBuildCoreWorkflowTaskMemberVisibilityBff(token);
      setFallbackOnlyAssigned(settings.onlyAssignedUserCanView);
      setFallbackMemberIds(settings.memberRoleUserIds);
    } catch {
      setFallbackOnlyAssigned(DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW);
      setFallbackMemberIds([]);
    } finally {
      setFallbackLoaded(true);
    }
  }, [dash, needsMockVisibility]);

  useEffect(() => {
    setFallbackLoaded(false);
    void loadFallbackVisibility();
  }, [loadFallbackVisibility, project.summary.id]);

  return useMemo(() => {
    if (!isMemberRole) return project;

    // API responses are already scoped server-side in scopeCrmProjectDetailForViewer().
    if (isApiSource) return project;

    const viewerUserId = access?.viewerUserId ?? user?.id ?? null;
    if (!viewerUserId) return project;

    const onlyAssignedUserCanView =
      access?.actorRole === 'member'
        ? access.onlyAssignedUserCanView
        : fallbackOnlyAssigned;
    const memberRoleUserIds =
      access?.actorRole === 'member' ? access.memberRoleUserIds : fallbackMemberIds;

    if (needsFallback && !fallbackLoaded) {
      return project;
    }

    const scopeInput = {
      viewerUserId,
      onlyAssignedUserCanView,
      memberRoleUserIds,
      includePaymentsAssignedToViewer:
        paymentAccess.isReady && paymentAccess.permissions.canView,
      includeBudgetForViewer:
        budgetAccess.isReady && budgetAccess.permissions.canView,
    };

    const visibleTasks = filterWorkflowTasksForBuildCoreMember(project.workflowTasks, scopeInput);
    const visibleBudgetEntries = filterBudgetEntriesForBuildCoreMember(
      project.budget.entries,
      scopeInput
    );

    return maskProjectDetailContactEmailForMember(
      applyBuildCoreMemberProjectDetailView(project, visibleTasks, visibleBudgetEntries)
    );
  }, [
    access,
    fallbackLoaded,
    fallbackMemberIds,
    fallbackOnlyAssigned,
    isApiSource,
    isMemberRole,
    needsFallback,
    paymentAccess.isReady,
    paymentAccess.permissions.canView,
    budgetAccess.isReady,
    budgetAccess.permissions.canView,
    project,
    user?.id,
  ]);
}
