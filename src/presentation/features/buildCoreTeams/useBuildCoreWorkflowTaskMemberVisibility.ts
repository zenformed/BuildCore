'use client';

import { useCallback, useEffect, useState } from 'react';
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
  const dash = useBuildCoreDashboardContext();
  const [onlyAssignedUserCanView, setOnlyAssignedUserCanView] = useState(false);
  const [memberRoleUserIds, setMemberRoleUserIds] = useState<readonly string[]>([]);
  const [canEdit, setCanEdit] = useState(false);
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const load = useCallback(async () => {
    if (!enabled) return;
    const token = dash.getAccessToken();
    if (!token) {
      setLoadError('Sign in required.');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const next = await fetchBuildCoreWorkflowTaskMemberVisibilityBff(token);
      setOnlyAssignedUserCanView(next.onlyAssignedUserCanView);
      setMemberRoleUserIds(next.memberRoleUserIds);
      setCanEdit(next.canEdit);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load visibility settings.');
    } finally {
      setIsLoading(false);
    }
  }, [dash, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

  const toggleOnlyAssignedUserCanView = useCallback(
    async (nextValue: boolean) => {
      if (!canEdit) return;
      const token = dash.getAccessToken();
      if (!token) return;

      const previous = onlyAssignedUserCanView;
      setOnlyAssignedUserCanView(nextValue);
      setIsSaving(true);
      setStatusMessage(null);
      setStatusKind(null);

      try {
        const saved = await patchBuildCoreWorkflowTaskMemberVisibilityBff(token, nextValue);
        setOnlyAssignedUserCanView(saved.onlyAssignedUserCanView);
        setMemberRoleUserIds(saved.memberRoleUserIds);
        setCanEdit(saved.canEdit);
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
    [canEdit, dash, onlyAssignedUserCanView]
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
