'use client';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactElement,
  type ReactNode,
} from 'react';
import {
  DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS,
  fullAdminBuildCoreRoleAccess,
  type BuildCoreRoleAccess,
  type BuildCoreRolePermissionFlags,
} from '@/domain/buildcore/rolePermissions';
import { fetchBuildCoreRoleAccessBff } from '@/infrastructure/coreApi/buildCoreRoleAccessBff';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

type SectionAccessState = {
  readonly access: BuildCoreRoleAccess | null;
  readonly permissions: BuildCoreRolePermissionFlags;
  readonly isLoading: boolean;
  readonly isReady: boolean;
  readonly loadError: string | null;
};

export type BuildCoreProjectSectionAccessContextValue = {
  readonly payment: SectionAccessState;
  readonly budget: SectionAccessState;
  readonly refetch: () => Promise<void>;
};

const BuildCoreProjectSectionAccessContext =
  createContext<BuildCoreProjectSectionAccessContextValue | null>(null);

export type BuildCoreProjectSectionAccessProviderProps = {
  readonly children: ReactNode;
};

function buildSectionState(
  access: BuildCoreRoleAccess | null,
  isLoading: boolean,
  loadError: string | null
): SectionAccessState {
  const permissions = access ?? DENIED_BUILDCORE_WORKFLOW_TASK_PERMISSIONS;
  return {
    access,
    permissions,
    isLoading,
    isReady: !isLoading && loadError == null && access != null,
    loadError,
  };
}

export function BuildCoreProjectSectionAccessProvider({
  children,
}: BuildCoreProjectSectionAccessProviderProps): ReactElement {
  const dash = useBuildCoreDashboardContext();
  const [paymentAccess, setPaymentAccess] = useState<BuildCoreRoleAccess | null>(null);
  const [budgetAccess, setBudgetAccess] = useState<BuildCoreRoleAccess | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (runtimeModes.useMockAuth()) {
      const full = fullAdminBuildCoreRoleAccess('owner');
      setPaymentAccess(full);
      setBudgetAccess(full);
      setLoadError(null);
      setIsLoading(false);
      return;
    }

    const token = dash.getAccessToken();
    if (!token) {
      setPaymentAccess(null);
      setBudgetAccess(null);
      setLoadError('Sign in required.');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      const [payment, budget] = await Promise.all([
        fetchBuildCoreRoleAccessBff(token, 'payments'),
        fetchBuildCoreRoleAccessBff(token, 'budget'),
      ]);
      setPaymentAccess(payment);
      setBudgetAccess(budget);
    } catch (err) {
      setPaymentAccess(null);
      setBudgetAccess(null);
      setLoadError(err instanceof Error ? err.message : 'Could not load project permissions.');
    } finally {
      setIsLoading(false);
    }
  }, [dash]);

  useEffect(() => {
    void load();
  }, [load]);

  const value = useMemo(
    (): BuildCoreProjectSectionAccessContextValue => ({
      payment: buildSectionState(paymentAccess, isLoading, loadError),
      budget: buildSectionState(budgetAccess, isLoading, loadError),
      refetch: load,
    }),
    [budgetAccess, isLoading, load, loadError, paymentAccess]
  );

  return (
    <BuildCoreProjectSectionAccessContext.Provider value={value}>
      {children}
    </BuildCoreProjectSectionAccessContext.Provider>
  );
}

export function useBuildCoreProjectSectionAccess(): BuildCoreProjectSectionAccessContextValue {
  const value = useContext(BuildCoreProjectSectionAccessContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreProjectSectionAccess must be used within BuildCoreProjectSectionAccessProvider'
    );
  }
  return value;
}
