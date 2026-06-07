'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  fetchBuildCoreRolePermissionsBff,
  patchBuildCoreRolePermissionBff,
} from '@/infrastructure/coreApi/buildCoreRolePermissionsBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import { canEditBuildCorePermissionRoleRow } from '@/domain/buildcore/rolePermissions';

export function useBuildCoreRolePermissions(
  domain: BuildCorePermissionDomain,
  enabled: boolean
): {
  data: BuildCoreRolePermissionsResponse | null;
  isLoading: boolean;
  loadError: string | null;
  statusMessage: string | null;
  statusKind: 'success' | 'error' | null;
  busyCell: { roleKey: BuildCorePermissionRoleKey; columnId: BuildCorePermissionColumnId } | null;
  canEditRow: (roleKey: BuildCorePermissionRoleKey) => boolean;
  togglePermission: (
    roleKey: BuildCorePermissionRoleKey,
    columnId: BuildCorePermissionColumnId,
    nextValue: boolean
  ) => Promise<void>;
  refetch: () => Promise<void>;
} {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [data, setData] = useState<BuildCoreRolePermissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [busyCell, setBusyCell] = useState<{
    roleKey: BuildCorePermissionRoleKey;
    columnId: BuildCorePermissionColumnId;
  } | null>(null);
  const loadGenerationRef = useRef(0);

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
      const next = await fetchBuildCoreRolePermissionsBff(token, domain);
      if (loadGenerationRef.current !== generation) return;
      setData(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      if (err instanceof DOMException && err.name === 'AbortError') return;
      setLoadError(err instanceof Error ? err.message : 'Could not load permissions.');
      setData(null);
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
      }
    }
  }, [domain, enabled, getAccessToken]);

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

  const canEditRow = useCallback(
    (roleKey: BuildCorePermissionRoleKey) => {
      if (data == null) return false;
      return canEditBuildCorePermissionRoleRow(data.editableRoleKeys, roleKey);
    },
    [data]
  );

  const togglePermission = useCallback(
    async (
      roleKey: BuildCorePermissionRoleKey,
      columnId: BuildCorePermissionColumnId,
      nextValue: boolean
    ) => {
      if (data == null || !canEditRow(roleKey)) return;
      const token = getAccessToken();
      if (!token) return;

      const previousData = data;
      const row = previousData.rows.find((r) => r.roleKey === roleKey);
      if (row == null) return;

      const nextFlags = { ...row, [columnId]: nextValue };

      setBusyCell({ roleKey, columnId });
      setStatusMessage(null);
      setStatusKind(null);

      try {
        await patchBuildCoreRolePermissionBff(token, domain, roleKey, nextFlags);
        const refreshed = await fetchBuildCoreRolePermissionsBff(token, domain);
        setData(refreshed);
        setStatusKind('success');
        setStatusMessage('Permissions saved.');
      } catch (err) {
        setData(previousData);
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not update permissions.');
      } finally {
        setBusyCell(null);
      }
    },
    [canEditRow, data, domain, getAccessToken]
  );

  return {
    data,
    isLoading,
    loadError,
    statusMessage,
    statusKind,
    busyCell,
    canEditRow,
    togglePermission,
    refetch: load,
  };
}
