'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchBuildCoreWorkflowTaskMemberVisibilityBff,
  patchBuildCoreWorkflowTaskMemberVisibilityBff,
} from '@/infrastructure/coreApi/buildCoreWorkflowTaskMemberVisibilityBff';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import { isBuildCoreTeamsManagerRole } from '@/domain/buildcore/memberRole';
import { DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW } from '@/domain/buildcore/workflowTaskMemberVisibility';

export function useBuildCoreWorkflowTaskMemberVisibility(enabled: boolean): {
  onlyAssignedUserCanView: boolean;
  memberRoleUserIds: readonly string[];
  canEdit: boolean;
  isLoading: boolean;
  loadError: string | null;
  statusMessage: string | null;
  statusKind: 'success' | 'error' | null;
  isSaving: boolean;
  toggleOnlyAssignedUserCanView: (nextValue: boolean) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { organizationMembershipContext, membershipContextStatus } = useSaaSProfile();
  const [onlyAssignedUserCanView, setOnlyAssignedUserCanView] = useState(
    DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW
  );
  const [memberRoleUserIds, setMemberRoleUserIds] = useState<readonly string[]>([]);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const loadGenerationRef = useRef(0);

  const canEdit =
    !runtimeModes.isDemoRuntime() && isBuildCoreTeamsManagerRole(organizationMembershipContext?.role);

  const applyResponse = useCallback(
    (next: {
      onlyAssignedUserCanView: boolean;
      memberRoleUserIds: readonly string[];
    }) => {
      setOnlyAssignedUserCanView(next.onlyAssignedUserCanView);
      setMemberRoleUserIds(next.memberRoleUserIds);
      setHasLoadedOnce(true);
    },
    []
  );

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) return;

      if (runtimeModes.isDemoRuntime()) {
        applyResponse({
          onlyAssignedUserCanView: DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
          memberRoleUserIds: [],
        });
        setLoadError(null);
        setHasLoadedOnce(true);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (membershipContextStatus !== 'ready') return;
        setLoadError('Sign in required.');
        setHasLoadedOnce(true);
        return;
      }

      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      if (!options?.background && !hasLoadedOnce) {
        setLoadError(null);
      }

      try {
        const next = await fetchBuildCoreWorkflowTaskMemberVisibilityBff(token);
        if (loadGenerationRef.current !== generation) return;
        applyResponse(next);
        setLoadError(null);
      } catch (err) {
        if (loadGenerationRef.current !== generation) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load visibility settings.');
      } finally {
        if (loadGenerationRef.current === generation && !hasLoadedOnce) {
          setHasLoadedOnce(true);
        }
      }
    },
    [applyResponse, enabled, getAccessToken, hasLoadedOnce, membershipContextStatus]
  );

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load, membershipContextStatus]);

  useEffect(() => {
    if (!enabled) return;

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void load({ background: true });
      }
    };

    window.addEventListener('pageshow', onPageShow);
    return () => window.removeEventListener('pageshow', onPageShow);
  }, [enabled, load]);

  const toggleOnlyAssignedUserCanView = useCallback(
    async (nextValue: boolean) => {
      if (!canEdit || runtimeModes.isDemoRuntime()) return;
      const token = getAccessToken();
      if (!token) return;

      const previous = onlyAssignedUserCanView;
      setOnlyAssignedUserCanView(nextValue);
      setIsSaving(true);
      setStatusMessage(null);
      setStatusKind(null);

      try {
        await patchBuildCoreWorkflowTaskMemberVisibilityBff(token, nextValue);
        const refreshed = await fetchBuildCoreWorkflowTaskMemberVisibilityBff(token);
        applyResponse(refreshed);
        setStatusKind('success');
        setStatusMessage('Visibility setting saved.');
      } catch (err) {
        setOnlyAssignedUserCanView(previous);
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not save visibility setting.');
      } finally {
        setIsSaving(false);
      }
    },
    [applyResponse, canEdit, getAccessToken, onlyAssignedUserCanView]
  );

  return {
    onlyAssignedUserCanView,
    memberRoleUserIds,
    canEdit,
    isLoading: enabled && !hasLoadedOnce,
    loadError,
    statusMessage,
    statusKind,
    isSaving,
    toggleOnlyAssignedUserCanView,
    refetch: () => load({ background: true }),
  };
}
