'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchBuildCoreWorkflowTaskMemberVisibilityBff,
  patchBuildCoreWorkflowTaskMemberVisibilityBff,
} from '@/infrastructure/coreApi/buildCoreWorkflowTaskMemberVisibilityBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

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
  const [onlyAssignedUserCanView, setOnlyAssignedUserCanView] = useState(false);
  const [memberRoleUserIds, setMemberRoleUserIds] = useState<readonly string[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const loadGenerationRef = useRef(0);

  const applyResponse = useCallback(
    (next: {
      onlyAssignedUserCanView: boolean;
      memberRoleUserIds: readonly string[];
      canEdit: boolean;
    }) => {
      setOnlyAssignedUserCanView(next.onlyAssignedUserCanView);
      setMemberRoleUserIds(next.memberRoleUserIds);
      setCanEdit(next.canEdit);
    },
    []
  );

  const load = useCallback(async () => {
    if (!enabled) return;

    const token = getAccessToken();
    if (!token) {
      setLoadError('Sign in required.');
      setIsLoading(false);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setIsLoading(true);
    setLoadError(null);

    try {
      const next = await fetchBuildCoreWorkflowTaskMemberVisibilityBff(token);
      if (loadGenerationRef.current !== generation) return;
      applyResponse(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load visibility settings.');
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
      }
    }
  }, [applyResponse, enabled, getAccessToken]);

  useEffect(() => {
    if (!enabled) return;
    void load();
  }, [enabled, load]);

  useEffect(() => {
    if (!enabled) return;

    const onPageShow = (event: PageTransitionEvent) => {
      if (event.persisted) {
        void load();
      }
    };
    const onVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void load();
      }
    };

    window.addEventListener('pageshow', onPageShow);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pageshow', onPageShow);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [enabled, load]);

  const toggleOnlyAssignedUserCanView = useCallback(
    async (nextValue: boolean) => {
      if (!canEdit) return;
      const token = getAccessToken();
      if (!token) return;

      const previous = {
        onlyAssignedUserCanView,
        memberRoleUserIds,
        canEdit,
      };

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
        applyResponse(previous);
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not save visibility setting.');
      } finally {
        setIsSaving(false);
      }
    },
    [applyResponse, canEdit, getAccessToken, memberRoleUserIds, onlyAssignedUserCanView]
  );

  return {
    onlyAssignedUserCanView,
    memberRoleUserIds,
    canEdit,
    isLoading,
    loadError,
    statusMessage,
    statusKind,
    isSaving,
    toggleOnlyAssignedUserCanView,
    refetch: load,
  };
}
