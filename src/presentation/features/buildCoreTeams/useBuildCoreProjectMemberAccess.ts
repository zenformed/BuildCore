'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { BuildCoreProjectAccessScope } from '@/domain/buildcore/projectAccessScope';
import {
  fetchBuildCoreProjectMemberAccessBff,
  putBuildCoreProjectMemberAccessBff,
  type BuildCoreProjectMemberAccessEntry,
} from '@/infrastructure/coreApi/buildCoreProjectMemberAccessBff';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useSaaSProfile } from '@/presentation/hooks/useSaaSProfile';

export function useBuildCoreProjectMemberAccess(enabled: boolean) {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { organizationMembershipContext, membershipContextStatus } = useSaaSProfile();
  const canManage = organizationMembershipContext?.role === 'owner' || organizationMembershipContext?.role === 'admin';
  const [entries, setEntries] = useState<readonly BuildCoreProjectMemberAccessEntry[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [statusKind, setStatusKind] = useState<'success' | 'error' | null>(null);
  const loaded = useRef(false);

  const load = useCallback(async () => {
    if (!enabled || !canManage || runtimeModes.isDemoRuntime()) return;
    const token = getAccessToken();
    if (!token) {
      if (membershipContextStatus === 'ready') setLoadError('Sign in required.');
      return;
    }
    setIsLoading(true);
    try {
      const next = await fetchBuildCoreProjectMemberAccessBff(token);
      setEntries(next);
      setLoadError(null);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : 'Could not load project visibility settings.');
    } finally {
      loaded.current = true;
      setIsLoading(false);
    }
  }, [canManage, enabled, getAccessToken, membershipContextStatus]);

  useEffect(() => { void load(); }, [load]);

  const save = useCallback(async (userId: string, scope: BuildCoreProjectAccessScope) => {
    if (!canManage || runtimeModes.isDemoRuntime()) return;
    const token = getAccessToken();
    if (!token) return;
    setSavingUserId(userId);
    setStatusMessage(null);
    setStatusKind(null);
    try {
      const saved = await putBuildCoreProjectMemberAccessBff(token, userId, scope);
      setEntries((previous) => previous.map((entry) => entry.userId === userId ? saved : entry));
      await load();
      setStatusKind('success');
      setStatusMessage('Project visibility saved.');
    } catch (error) {
      setStatusKind('error');
      setStatusMessage(error instanceof Error ? error.message : 'Could not save project visibility.');
    } finally {
      setSavingUserId(null);
    }
  }, [canManage, getAccessToken, load]);

  return { entries, canManage, isLoading: enabled && canManage && !loaded.current ? isLoading : isLoading, loadError, savingUserId, statusMessage, statusKind, save, refetch: load };
}
