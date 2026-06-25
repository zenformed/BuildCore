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
import { DEFAULT_PIPELINE_STAGES, type PipelineStage } from '@/domain/crm/pipelineStage';
import {
  defaultOrgPipelineStageRecords,
  resolvePipelineStageScopeForProject,
  type OrgPipelineStageRecord,
  type PipelineStageScope,
} from '@/domain/buildcore/orgPipelineStages';
import { fetchBuildCorePipelineStagesBothScopesBff } from '@/infrastructure/coreApi/buildCorePipelineStagesBff';
import type {
  BuildCorePipelineStagesBothScopesResponse,
  BuildCorePipelineStagesResponse,
} from '@/infrastructure/crm/server/pipelineStageService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { env } from '@/infrastructure/config/env';
import { getDemoPipelineStagesBothScopes } from '@/infrastructure/demo/demoPipelineStagesStore';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { useOptionalDemoMode } from '@/presentation/providers/DemoModeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

type ScopedPipelineStagesState = {
  readonly project: BuildCorePipelineStagesResponse;
  readonly subproject: BuildCorePipelineStagesResponse;
  readonly canManage: boolean;
};

type BuildCorePipelineStagesContextValue = {
  readonly getStages: (scope: PipelineStageScope) => readonly OrgPipelineStageRecord[];
  readonly getCatalog: (scope: PipelineStageScope) => readonly PipelineStage[];
  readonly catalogForProject: (input: { readonly parentProjectId: string | null }) => readonly PipelineStage[];
  readonly canManage: boolean;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
  readonly applyServerResponse: (
    scope: PipelineStageScope,
    response: BuildCorePipelineStagesResponse
  ) => void;
};

const BuildCorePipelineStagesContext = createContext<BuildCorePipelineStagesContextValue | null>(
  null
);

function buildDefaultScopedState(): ScopedPipelineStagesState {
  return {
    project: {
      scope: 'project',
      stages: defaultOrgPipelineStageRecords('mock-org', 'project'),
      catalog: DEFAULT_PIPELINE_STAGES,
      canManage: true,
    },
    subproject: {
      scope: 'subproject',
      stages: defaultOrgPipelineStageRecords('mock-org', 'subproject'),
      catalog: DEFAULT_PIPELINE_STAGES,
      canManage: true,
    },
    canManage: true,
  };
}

const DEFAULT_STATE = buildDefaultScopedState();

function buildDemoScopedState(): ScopedPipelineStagesState {
  const both = getDemoPipelineStagesBothScopes();
  return {
    project: both.project,
    subproject: both.subproject,
    canManage: both.canManage,
  };
}

function mergeScopedResponse(
  current: ScopedPipelineStagesState,
  scope: PipelineStageScope,
  response: BuildCorePipelineStagesResponse
): ScopedPipelineStagesState {
  return {
    ...current,
    [scope]: response,
    canManage: response.canManage,
  };
}

export function BuildCorePipelineStagesProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const demoMode = useOptionalDemoMode();
  const [state, setState] = useState<ScopedPipelineStagesState | null>(() => {
    if (runtimeModes.isDemoRuntime()) {
      return buildDemoScopedState();
    }
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      return DEFAULT_STATE;
    }
    return null;
  });
  const [isLoading, setIsLoading] = useState(
    () => env.isSaasMode && !runtimeModes.useMockAuth() && !runtimeModes.isDemoRuntime()
  );
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const applyServerResponse = useCallback(
    (scope: PipelineStageScope, response: BuildCorePipelineStagesResponse) => {
      setState((current) => {
        const base =
          current ??
          (runtimeModes.isDemoRuntime() ? buildDemoScopedState() : DEFAULT_STATE);
        return mergeScopedResponse(base, scope, response);
      });
      setLoadError(null);
    },
    []
  );

  const refetch = useCallback(async () => {
    if (runtimeModes.isDemoRuntime()) {
      setState(buildDemoScopedState());
      setIsLoading(false);
      setLoadError(null);
      return;
    }
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      setState(DEFAULT_STATE);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setState(DEFAULT_STATE);
      setIsLoading(false);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setIsLoading(true);
    setLoadError(null);

    try {
      const next: BuildCorePipelineStagesBothScopesResponse =
        await fetchBuildCorePipelineStagesBothScopesBff(token);
      if (loadGenerationRef.current !== generation) return;
      setState({
        project: next.project,
        subproject: next.subproject,
        canManage: next.canManage,
      });
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load workflow stages.');
      setState(DEFAULT_STATE);
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
      }
    }
  }, [getAccessToken]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  useEffect(() => {
    if (!runtimeModes.isDemoRuntime()) return;
    const onDemoReset = () => {
      setState(buildDemoScopedState());
      setLoadError(null);
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, []);

  useEffect(() => {
    if (demoMode == null) return;
    setState(buildDemoScopedState());
    setLoadError(null);
  }, [demoMode, demoMode?.resetVersion]);

  const resolvedState = state ?? (runtimeModes.isDemoRuntime() ? buildDemoScopedState() : DEFAULT_STATE);

  const value = useMemo<BuildCorePipelineStagesContextValue>(
    () => ({
      getStages: (scope) => resolvedState[scope].stages,
      getCatalog: (scope) => resolvedState[scope].catalog,
      catalogForProject: (input) =>
        resolvedState[resolvePipelineStageScopeForProject(input)].catalog,
      canManage: resolvedState.canManage,
      isLoading,
      loadError,
      refetch,
      applyServerResponse,
    }),
    [applyServerResponse, isLoading, loadError, refetch, resolvedState]
  );

  return (
    <BuildCorePipelineStagesContext.Provider value={value}>
      {children}
    </BuildCorePipelineStagesContext.Provider>
  );
}

export function useBuildCorePipelineStages(): BuildCorePipelineStagesContextValue {
  const context = useContext(BuildCorePipelineStagesContext);
  if (context == null) {
    throw new Error('useBuildCorePipelineStages must be used within BuildCorePipelineStagesProvider');
  }
  return context;
}
