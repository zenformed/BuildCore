'use client';

import { useMemo } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  applyBuildCoreMemberProjectDetailView,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useAuth } from '@/presentation/hooks/useAuth';
import { fetchBuildCoreWorkflowTaskMemberVisibilityBff } from '@/infrastructure/coreApi/buildCoreWorkflowTaskMemberVisibilityBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useCallback, useEffect, useState } from 'react';

export function useBuildCoreMemberScopedProject(
  project: CrmProjectDetail,
  isMemberRole: boolean
): CrmProjectDetail {
  const { user } = useAuth();
  const dash = useBuildCoreDashboardContext();
  const { access, isReady } = useBuildCoreWorkflowTaskAccess();
  const [fallbackMemberIds, setFallbackMemberIds] = useState<readonly string[]>([]);
  const [fallbackOnlyAssigned, setFallbackOnlyAssigned] = useState(false);
  const [fallbackLoaded, setFallbackLoaded] = useState(false);

  const needsFallback = isMemberRole && isReady && access?.actorRole !== 'member';

  const loadFallbackVisibility = useCallback(async () => {
    if (!needsFallback) {
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
      setFallbackOnlyAssigned(false);
      setFallbackMemberIds([]);
    } finally {
      setFallbackLoaded(true);
    }
  }, [dash, needsFallback]);

  useEffect(() => {
    setFallbackLoaded(false);
    void loadFallbackVisibility();
  }, [loadFallbackVisibility, project.summary.id]);

  return useMemo(() => {
    if (!isMemberRole) return project;

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

    const visibleTasks = filterWorkflowTasksForBuildCoreMember(project.workflowTasks, {
      viewerUserId,
      onlyAssignedUserCanView,
      memberRoleUserIds,
    });

    return applyBuildCoreMemberProjectDetailView(project, visibleTasks);
  }, [
    access,
    fallbackLoaded,
    fallbackMemberIds,
    fallbackOnlyAssigned,
    isMemberRole,
    needsFallback,
    project,
    user?.id,
  ]);
}
