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
import type {
  ProjectCustomFieldDefinition,
  ProjectCustomFieldScope,
} from '@/domain/buildcore/projectCustomFields';
import { listActiveProjectCustomFieldDefinitionsForScope } from '@/domain/buildcore/projectCustomFields';
import {
  createBuildCoreProjectCustomFieldBff,
  fetchBuildCoreProjectCustomFieldsBff,
  patchBuildCoreProjectCustomFieldBff,
} from '@/infrastructure/coreApi/buildCoreProjectCustomFieldsBff';
import type { BuildCoreProjectCustomFieldsResponse } from '@/infrastructure/crm/server/buildCoreProjectCustomFieldService';
import {
  createMockProjectCustomFieldDefinition,
  getMockProjectCustomFieldsResponse,
  updateMockProjectCustomFieldDefinition,
} from '@/infrastructure/crm/mock/mockProjectCustomFieldsStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { env } from '@/infrastructure/config/env';
import { usesClientSideOrganizationCustomization } from '@/infrastructure/runtime/usesClientSideOrganizationCustomization';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreProjectCustomFieldsContextValue = {
  readonly definitions: readonly ProjectCustomFieldDefinition[];
  readonly canManageDefinitions: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
  readonly activeDefinitionsForScope: (
    scope: ProjectCustomFieldScope
  ) => readonly ProjectCustomFieldDefinition[];
  readonly createDefinition: (
    label: string,
    scope: ProjectCustomFieldScope
  ) => Promise<ProjectCustomFieldDefinition | null>;
  readonly renameDefinition: (
    scope: ProjectCustomFieldScope,
    fieldKey: string,
    label: string
  ) => Promise<boolean>;
  readonly archiveDefinition: (
    scope: ProjectCustomFieldScope,
    fieldKey: string
  ) => Promise<boolean>;
};

const BuildCoreProjectCustomFieldsContext =
  createContext<BuildCoreProjectCustomFieldsContextValue | null>(null);

function buildDefaultResponse(canManage = true): BuildCoreProjectCustomFieldsResponse {
  if (usesClientSideOrganizationCustomization()) {
    return getMockProjectCustomFieldsResponse(canManage);
  }
  return { definitions: [], canManage };
}

export function BuildCoreProjectCustomFieldsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [state, setState] = useState<BuildCoreProjectCustomFieldsResponse>(() =>
    buildDefaultResponse(true)
  );
  const [isLoading, setIsLoading] = useState(
    () => env.isSaasMode && !usesClientSideOrganizationCustomization()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    if (usesClientSideOrganizationCustomization()) {
      setState(getMockProjectCustomFieldsResponse(true));
      setLoadError(null);
      setIsLoading(false);
      hasLoadedOnceRef.current = true;
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setLoadError('Sign in required.');
      setIsLoading(false);
      hasLoadedOnceRef.current = false;
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    if (!hasLoadedOnceRef.current) {
      setIsLoading(true);
    }
    setLoadError(null);

    try {
      const next = await runSessionCached(`project-custom-fields:${token}`, () =>
        fetchBuildCoreProjectCustomFieldsBff(token)
      );
      if (loadGenerationRef.current !== generation) return;
      setState(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load custom fields.');
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
        hasLoadedOnceRef.current = true;
      }
    }
  }, [getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onDemoReset = () => {
      setState(getMockProjectCustomFieldsResponse(true));
      setLoadError(null);
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, []);

  const createDefinition = useCallback(
    async (
      label: string,
      scope: ProjectCustomFieldScope
    ): Promise<ProjectCustomFieldDefinition | null> => {
      if (!state.canManage) return null;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          const created = createMockProjectCustomFieldDefinition(label, scope);
          const next = getMockProjectCustomFieldsResponse(true);
          setState(next);
          return created;
        } catch {
          return null;
        } finally {
          setIsSaving(false);
        }
      }

      const token = getAccessToken();
      if (!token) {
        setIsSaving(false);
        return null;
      }

      try {
        const saved = await createBuildCoreProjectCustomFieldBff(token, {
          label,
          scope,
          fieldType: 'text',
        });
        setState(saved);
        return saved.created ?? null;
      } catch {
        setState(previous);
        return null;
      } finally {
        setIsSaving(false);
      }
    },
    [getAccessToken, state]
  );

  const renameDefinition = useCallback(
    async (
      scope: ProjectCustomFieldScope,
      fieldKey: string,
      label: string
    ): Promise<boolean> => {
      if (!state.canManage) return false;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          updateMockProjectCustomFieldDefinition(scope, fieldKey, { label });
          setState(getMockProjectCustomFieldsResponse(true));
          return true;
        } catch {
          return false;
        } finally {
          setIsSaving(false);
        }
      }

      const token = getAccessToken();
      if (!token) {
        setIsSaving(false);
        return false;
      }

      try {
        const saved = await patchBuildCoreProjectCustomFieldBff(token, scope, fieldKey, { label });
        setState(saved);
        return true;
      } catch {
        setState(previous);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [getAccessToken, state]
  );

  const archiveDefinition = useCallback(
    async (scope: ProjectCustomFieldScope, fieldKey: string): Promise<boolean> => {
      if (!state.canManage) return false;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          updateMockProjectCustomFieldDefinition(scope, fieldKey, { isArchived: true });
          setState(getMockProjectCustomFieldsResponse(true));
          return true;
        } catch {
          return false;
        } finally {
          setIsSaving(false);
        }
      }

      const token = getAccessToken();
      if (!token) {
        setIsSaving(false);
        return false;
      }

      try {
        const saved = await patchBuildCoreProjectCustomFieldBff(token, scope, fieldKey, {
          isArchived: true,
        });
        setState(saved);
        return true;
      } catch {
        setState(previous);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [getAccessToken, state]
  );

  const activeDefinitionsForScope = useCallback(
    (scope: ProjectCustomFieldScope) =>
      listActiveProjectCustomFieldDefinitionsForScope(state.definitions, scope),
    [state.definitions]
  );

  const value = useMemo(
    (): BuildCoreProjectCustomFieldsContextValue => ({
      definitions: state.definitions,
      canManageDefinitions: state.canManage,
      isLoading,
      isSaving,
      loadError,
      refetch: load,
      activeDefinitionsForScope,
      createDefinition,
      renameDefinition,
      archiveDefinition,
    }),
    [
      activeDefinitionsForScope,
      archiveDefinition,
      createDefinition,
      isLoading,
      isSaving,
      load,
      loadError,
      renameDefinition,
      state.canManage,
      state.definitions,
    ]
  );

  return (
    <BuildCoreProjectCustomFieldsContext.Provider value={value}>
      {children}
    </BuildCoreProjectCustomFieldsContext.Provider>
  );
}

export function useBuildCoreProjectCustomFields(): BuildCoreProjectCustomFieldsContextValue {
  const value = useContext(BuildCoreProjectCustomFieldsContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreProjectCustomFields must be used within BuildCoreProjectCustomFieldsProvider'
    );
  }
  return value;
}

export function useBuildCoreProjectCustomFieldsForScope(
  scope: ProjectCustomFieldScope
): Omit<BuildCoreProjectCustomFieldsContextValue, 'activeDefinitionsForScope'> & {
  readonly activeDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly scope: ProjectCustomFieldScope;
} {
  const context = useBuildCoreProjectCustomFields();
  const activeDefinitions = useMemo(
    () => context.activeDefinitionsForScope(scope),
    [context, scope]
  );
  return {
    definitions: context.definitions,
    activeDefinitions,
    scope,
    canManageDefinitions: context.canManageDefinitions,
    isLoading: context.isLoading,
    isSaving: context.isSaving,
    loadError: context.loadError,
    refetch: context.refetch,
    createDefinition: context.createDefinition,
    renameDefinition: context.renameDefinition,
    archiveDefinition: context.archiveDefinition,
  };
}
