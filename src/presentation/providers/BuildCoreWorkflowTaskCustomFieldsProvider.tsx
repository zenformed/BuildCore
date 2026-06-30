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
  WorkflowTaskCustomFieldDefinition,
  WorkflowTaskCustomFieldScope,
} from '@/domain/buildcore/workflowTaskCustomFields';
import { listActiveWorkflowTaskCustomFieldDefinitionsForScope } from '@/domain/buildcore/workflowTaskCustomFields';
import {
  createBuildCoreWorkflowTaskCustomFieldBff,
  fetchBuildCoreWorkflowTaskCustomFieldsBff,
  patchBuildCoreWorkflowTaskCustomFieldBff,
} from '@/infrastructure/coreApi/buildCoreWorkflowTaskCustomFieldsBff';
import type { BuildCoreWorkflowTaskCustomFieldsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskCustomFieldService';
import {
  createMockWorkflowTaskCustomFieldDefinition,
  getMockWorkflowTaskCustomFieldsResponse,
  updateMockWorkflowTaskCustomFieldDefinition,
} from '@/infrastructure/crm/mock/mockWorkflowTaskCustomFieldsStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { env } from '@/infrastructure/config/env';
import { usesClientSideOrganizationCustomization } from '@/infrastructure/runtime/usesClientSideOrganizationCustomization';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreWorkflowTaskCustomFieldsContextValue = {
  readonly definitions: readonly WorkflowTaskCustomFieldDefinition[];
  readonly canManageDefinitions: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
  readonly activeDefinitionsForScope: (
    scope: WorkflowTaskCustomFieldScope
  ) => readonly WorkflowTaskCustomFieldDefinition[];
  readonly createDefinition: (
    label: string,
    scope: WorkflowTaskCustomFieldScope
  ) => Promise<WorkflowTaskCustomFieldDefinition | null>;
  readonly renameDefinition: (
    scope: WorkflowTaskCustomFieldScope,
    fieldKey: string,
    label: string
  ) => Promise<boolean>;
  readonly archiveDefinition: (
    scope: WorkflowTaskCustomFieldScope,
    fieldKey: string
  ) => Promise<boolean>;
};

const BuildCoreWorkflowTaskCustomFieldsContext =
  createContext<BuildCoreWorkflowTaskCustomFieldsContextValue | null>(null);

function buildDefaultResponse(canManage = true): BuildCoreWorkflowTaskCustomFieldsResponse {
  if (usesClientSideOrganizationCustomization()) {
    return getMockWorkflowTaskCustomFieldsResponse(canManage);
  }
  return { definitions: [], canManage };
}

export function BuildCoreWorkflowTaskCustomFieldsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [state, setState] = useState<BuildCoreWorkflowTaskCustomFieldsResponse>(() =>
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
      setState(getMockWorkflowTaskCustomFieldsResponse(true));
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
      const next = await runSessionCached(`workflow-task-custom-fields:${token}`, () =>
        fetchBuildCoreWorkflowTaskCustomFieldsBff(token)
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
      setState(getMockWorkflowTaskCustomFieldsResponse(true));
      setLoadError(null);
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, []);

  const createDefinition = useCallback(
    async (
      label: string,
      scope: WorkflowTaskCustomFieldScope
    ): Promise<WorkflowTaskCustomFieldDefinition | null> => {
      if (!state.canManage) return null;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          const created = createMockWorkflowTaskCustomFieldDefinition(label, scope);
          const next = getMockWorkflowTaskCustomFieldsResponse(true);
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
        const saved = await createBuildCoreWorkflowTaskCustomFieldBff(token, {
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
      scope: WorkflowTaskCustomFieldScope,
      fieldKey: string,
      label: string
    ): Promise<boolean> => {
      if (!state.canManage) return false;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          updateMockWorkflowTaskCustomFieldDefinition(scope, fieldKey, { label });
          setState(getMockWorkflowTaskCustomFieldsResponse(true));
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
        const saved = await patchBuildCoreWorkflowTaskCustomFieldBff(token, scope, fieldKey, { label });
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
    async (scope: WorkflowTaskCustomFieldScope, fieldKey: string): Promise<boolean> => {
      if (!state.canManage) return false;

      setIsSaving(true);
      const previous = state;

      if (usesClientSideOrganizationCustomization()) {
        try {
          updateMockWorkflowTaskCustomFieldDefinition(scope, fieldKey, { isArchived: true });
          setState(getMockWorkflowTaskCustomFieldsResponse(true));
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
        const saved = await patchBuildCoreWorkflowTaskCustomFieldBff(token, scope, fieldKey, {
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
    (scope: WorkflowTaskCustomFieldScope) =>
      listActiveWorkflowTaskCustomFieldDefinitionsForScope(state.definitions, scope),
    [state.definitions]
  );

  const value = useMemo(
    (): BuildCoreWorkflowTaskCustomFieldsContextValue => ({
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
    <BuildCoreWorkflowTaskCustomFieldsContext.Provider value={value}>
      {children}
    </BuildCoreWorkflowTaskCustomFieldsContext.Provider>
  );
}

export function useBuildCoreWorkflowTaskCustomFields(): BuildCoreWorkflowTaskCustomFieldsContextValue {
  const value = useContext(BuildCoreWorkflowTaskCustomFieldsContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreWorkflowTaskCustomFields must be used within BuildCoreWorkflowTaskCustomFieldsProvider'
    );
  }
  return value;
}

export function useBuildCoreWorkflowTaskCustomFieldsForScope(
  scope: WorkflowTaskCustomFieldScope
): Omit<BuildCoreWorkflowTaskCustomFieldsContextValue, 'activeDefinitionsForScope'> & {
  readonly activeDefinitions: readonly WorkflowTaskCustomFieldDefinition[];
  readonly scope: WorkflowTaskCustomFieldScope;
} {
  const context = useBuildCoreWorkflowTaskCustomFields();
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
