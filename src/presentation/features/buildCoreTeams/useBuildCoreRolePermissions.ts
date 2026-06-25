'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  fetchBuildCoreRolePermissionsBff,
  patchBuildCoreRolePermissionBff,
} from '@/infrastructure/coreApi/buildCoreRolePermissionsBff';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { buildDefaultBuildCoreRolePermissionsResponse } from '@/infrastructure/crm/server/buildCoreRolePermissionService';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';
import type {
  BuildCorePermissionColumnId,
  BuildCorePermissionDomain,
  BuildCorePermissionRoleKey,
  BuildCoreRolePermissionRow,
  BuildCoreRolePermissionsResponse,
} from '@/domain/buildcore/rolePermissions';
import {
  buildCoreEditablePermissionRoleKeys,
  canEditBuildCorePermissionRoleRow,
} from '@/domain/buildcore/rolePermissions';

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
  const { organizationMembershipContext, membershipContextStatus } = useSaaSProfile();
  const [responseMeta, setResponseMeta] = useState<Omit<
    BuildCoreRolePermissionsResponse,
    'rows'
  > | null>(null);
  const [draftRows, setDraftRows] = useState<readonly BuildCoreRolePermissionRow[] | null>(null);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const hasLoadedOnceRef = useRef(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const [busyCell, setBusyCell] = useState<{
    roleKey: BuildCorePermissionRoleKey;
    columnId: BuildCorePermissionColumnId;
  } | null>(null);
  const loadGenerationRef = useRef(0);

  const editableRoleKeys = useMemo(() => {
    const role = organizationMembershipContext?.role;
    if (role == null) return [];
    return buildCoreEditablePermissionRoleKeys(role);
  }, [organizationMembershipContext?.role]);

  const canEditRow = useCallback(
    (roleKey: BuildCorePermissionRoleKey) =>
      !runtimeModes.isDemoRuntime() &&
      canEditBuildCorePermissionRoleRow(editableRoleKeys, roleKey),
    [editableRoleKeys]
  );

  const applyServerResponse = useCallback((next: BuildCoreRolePermissionsResponse) => {
    setResponseMeta({
      domain: next.domain,
      actorRole: next.actorRole,
      editableRoleKeys: next.editableRoleKeys,
    });
    setDraftRows(next.rows);
    hasLoadedOnceRef.current = true;
    setHasLoadedOnce(true);
  }, []);

  const load = useCallback(
    async (options?: { background?: boolean }) => {
      if (!enabled) return;

      if (runtimeModes.isDemoRuntime()) {
        applyServerResponse(
          buildDefaultBuildCoreRolePermissionsResponse(
            domain,
            organizationMembershipContext?.role ?? 'owner'
          )
        );
        setLoadError(null);
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
        return;
      }

      const token = getAccessToken();
      if (!token) {
        if (membershipContextStatus !== 'ready') return;
        setLoadError('Sign in required.');
        hasLoadedOnceRef.current = true;
        setHasLoadedOnce(true);
        return;
      }

      const generation = loadGenerationRef.current + 1;
      loadGenerationRef.current = generation;
      if (!options?.background && !hasLoadedOnceRef.current) {
        setLoadError(null);
      }

      try {
        const next = await fetchBuildCoreRolePermissionsBff(token, domain);
        if (loadGenerationRef.current !== generation) return;
        applyServerResponse(next);
        setLoadError(null);
      } catch (err) {
        if (loadGenerationRef.current !== generation) return;
        setLoadError(err instanceof Error ? err.message : 'Could not load permissions.');
        if (!hasLoadedOnceRef.current) {
          setResponseMeta(null);
          setDraftRows(null);
        }
      } finally {
        if (loadGenerationRef.current === generation && !hasLoadedOnceRef.current) {
          hasLoadedOnceRef.current = true;
          setHasLoadedOnce(true);
        }
      }
    },
    [applyServerResponse, domain, enabled, getAccessToken, membershipContextStatus, organizationMembershipContext?.role]
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

  const togglePermission = useCallback(
    async (
      roleKey: BuildCorePermissionRoleKey,
      columnId: BuildCorePermissionColumnId,
      nextValue: boolean
    ) => {
      if (draftRows == null || !canEditRow(roleKey) || runtimeModes.isDemoRuntime()) return;
      const token = getAccessToken();
      if (!token) return;

      const previousRows = draftRows;
      const row = previousRows.find((r) => r.roleKey === roleKey);
      if (row == null) return;

      const nextFlags = { ...row, [columnId]: nextValue };
      const optimisticRows = previousRows.map((r) =>
        r.roleKey === roleKey ? { ...r, ...nextFlags } : r
      );

      setBusyCell({ roleKey, columnId });
      setStatusMessage(null);
      setStatusKind(null);
      setDraftRows(optimisticRows);

      try {
        await patchBuildCoreRolePermissionBff(token, domain, roleKey, nextFlags);
        const refreshed = await fetchBuildCoreRolePermissionsBff(token, domain);
        applyServerResponse(refreshed);
        setStatusKind('success');
        setStatusMessage('Permissions saved.');
      } catch (err) {
        setDraftRows(previousRows);
        setStatusKind('error');
        setStatusMessage(err instanceof Error ? err.message : 'Could not update permissions.');
      } finally {
        setBusyCell(null);
      }
    },
    [applyServerResponse, canEditRow, domain, draftRows, getAccessToken]
  );

  const data =
    responseMeta != null && draftRows != null
      ? { ...responseMeta, rows: draftRows }
      : null;

  return {
    data,
    isLoading: enabled && !hasLoadedOnce,
    loadError,
    statusMessage,
    statusKind,
    busyCell,
    canEditRow,
    togglePermission,
    refetch: () => load({ background: true }),
  };
}
