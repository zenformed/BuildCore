'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  fetchBuildCoreRolePermissionsBff,
  patchBuildCoreRolePermissionBff,
} from '@/infrastructure/coreApi/buildCoreRolePermissionsBff';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import { canEditBuildCorePermissionRoleRow } from '@/domain/buildcore/rolePermissions';

export function useBuildCoreWorkflowTaskPermissions(enabled: boolean): {
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
  const dash = useBuildCoreDashboardContext();
  const [data, setData] = useState<BuildCoreRolePermissionsResponse | null>(null);
  const [isLoading, setIsLoading] = useState(enabled);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [busyCell, setBusyCell] = useState<{
    roleKey: BuildCorePermissionRoleKey;
    columnId: BuildCorePermissionColumnId;
  } | null>(null);

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
      const next = await fetchBuildCoreRolePermissionsBff(token);
      setData(next);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Could not load permissions.');
      setData(null);
    } finally {
      setIsLoading(false);
    }
  }, [dash, enabled]);

  useEffect(() => {
    void load();
  }, [load]);

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
      const token = dash.getAccessToken();
      if (!token) return;

      const previousRows = data.rows;
      const row = previousRows.find((r) => r.roleKey === roleKey);
      if (row == null) return;

      const nextFlags = { ...row, [columnId]: nextValue };
      const optimisticRows = previousRows.map((r) =>
        r.roleKey === roleKey ? { ...r, ...nextFlags } : r
      );

      setBusyCell({ roleKey, columnId });
      setStatusMessage(null);
      setStatusKind(null);
      setData({ ...data, rows: optimisticRows });

      try {
        const updated = await patchBuildCoreRolePermissionBff(token, roleKey, nextFlags);
        setData((current) =>
          current == null
            ? current
            : {
                ...current,
                rows: current.rows.map((r) => (r.roleKey === roleKey ? updated : r)),
              }
        );
        setStatusKind('success');
        setStatusMessage('Permissions saved.');
      } catch (err) {
        setData((current) => (current == null ? current : { ...current, rows: previousRows }));
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not update permissions.');
      } finally {
        setBusyCell(null);
      }
    },
    [canEditRow, dash, data]
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
