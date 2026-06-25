'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  fullAdminBuildCoreWorkflowTaskAccess,
  type BuildCoreRolePermissionFlags,
  type BuildCoreWorkflowTaskAccess,
} from '@/domain/buildcore/rolePermissions';
import { fetchBuildCoreWorkflowTaskAccessBff } from '@/infrastructure/coreApi/buildCoreWorkflowTaskAccessBff';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreWorkflowTaskAccessContextValue = {
  readonly permissions: BuildCoreRolePermissionFlags;
  readonly access: BuildCoreWorkflowTaskAccess | null;
  readonly isLoading: boolean;
  readonly isReady: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
};

const BuildCoreWorkflowTaskAccessContext =
  createContext<BuildCoreWorkflowTaskAccessContextValue | null>(null);

export type BuildCoreWorkflowTaskAccessProviderProps = {
  readonly children: ReactNode;
};

export function BuildCoreWorkflowTaskAccessProvider({
  children,
}: BuildCoreWorkflowTaskAccessProviderProps): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [access, setAccess] = useState<BuildCoreWorkflowTaskAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    if (runtimeModes.useMockAuth() || runtimeModes.isDemoRuntime()) {
      setAccess(fullAdminBuildCoreWorkflowTaskAccess('owner'));
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setAccess(null);
      setLoadError('Sign in required.');
      setIsLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setLoadError(null);
    try {
      const next = await runSessionCached(`workflow-task-access:${token}`, () =>
        fetchBuildCoreWorkflowTaskAccessBff(token)
      );
      setAccess(next);
    } catch (err) {
      setAccess(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load workflow task permissions.');
    } finally {
      setIsLoading(false);
      hasLoadedOnceRef.current = true;
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  const permissions = access ?? DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS;
  const isReady = !isLoading && loadError == null && access != null;

  const value = useMemo(
    (): BuildCoreWorkflowTaskAccessContextValue => ({
      permissions,
      access,
      isLoading,
      isReady,
      loadError,
      refetch: load,
    }),
    [access, isLoading, isReady, load, loadError, permissions]
  );

  return (
    <BuildCoreWorkflowTaskAccessContext.Provider value={value}>
      {children}
    </BuildCoreWorkflowTaskAccessContext.Provider>
  );
}

export function useBuildCoreWorkflowTaskAccess(): BuildCoreWorkflowTaskAccessContextValue {
  const value = useContext(BuildCoreWorkflowTaskAccessContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreWorkflowTaskAccess must be used within BuildCoreWorkflowTaskAccessProvider'
    );
  }
  return value;
}
