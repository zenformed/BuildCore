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
import type { OrgPipelineStageRecord } from '@/domain/buildcore/orgPipelineStages';
import { fetchBuildCorePipelineStagesBff } from '@/infrastructure/coreApi/buildCorePipelineStagesBff';
import type { BuildCorePipelineStagesResponse } from '@/infrastructure/crm/server/pipelineStageService';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { env } from '@/infrastructure/config/env';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

type BuildCorePipelineStagesContextValue = {
  readonly stages: readonly OrgPipelineStageRecord[];
  readonly catalog: readonly PipelineStage[];
  readonly canManage: boolean;
  readonly isLoading: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
  readonly applyServerResponse: (response: BuildCorePipelineStagesResponse) => void;
};

const BuildCorePipelineStagesContext = createContext<BuildCorePipelineStagesContextValue | null>(
  null
);

const DEFAULT_RESPONSE: BuildCorePipelineStagesResponse = {
  stages: DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
    id: `mock-stage-${stage.slug}`,
    organizationId: 'mock-org',
    slug: stage.slug,
    label: stage.label,
    sortOrder: index + 1,
    isActive: true,
  })),
  catalog: DEFAULT_PIPELINE_STAGES,
  canManage: true,
};

export function BuildCorePipelineStagesProvider({
  children,
}: {
  children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [response, setResponse] = useState<BuildCorePipelineStagesResponse | null>(() =>
    !env.isSaasMode || runtimeModes.useMockAuth() ? DEFAULT_RESPONSE : null
  );
  const [isLoading, setIsLoading] = useState(() => env.isSaasMode && !runtimeModes.useMockAuth());
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);

  const applyServerResponse = useCallback((next: BuildCorePipelineStagesResponse) => {
    setResponse(next);
    setLoadError(null);
  }, []);

  const refetch = useCallback(async () => {
    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      setResponse(DEFAULT_RESPONSE);
      setIsLoading(false);
      setLoadError(null);
      return;
    }

    const token = getAccessToken();
    if (!token) {
      setResponse(DEFAULT_RESPONSE);
      setIsLoading(false);
      return;
    }

    const generation = loadGenerationRef.current + 1;
    loadGenerationRef.current = generation;
    setIsLoading(true);
    setLoadError(null);

    try {
      const next = await fetchBuildCorePipelineStagesBff(token);
      if (loadGenerationRef.current !== generation) return;
      setResponse(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load workflow stages.');
      setResponse(DEFAULT_RESPONSE);
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
      }
    }
  }, [getAccessToken]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  const value = useMemo<BuildCorePipelineStagesContextValue>(
    () => ({
      stages: response?.stages ?? DEFAULT_RESPONSE.stages,
      catalog: response?.catalog ?? DEFAULT_PIPELINE_STAGES,
      canManage: response?.canManage ?? false,
      isLoading,
      loadError,
      refetch,
      applyServerResponse,
    }),
    [applyServerResponse, isLoading, loadError, refetch, response]
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
