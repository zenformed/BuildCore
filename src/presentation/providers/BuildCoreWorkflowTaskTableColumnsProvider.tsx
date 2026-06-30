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
import type { WorkflowTaskCustomFieldDefinition } from '@/domain/buildcore/workflowTaskCustomFields';
import {
  buildWorkflowTaskTableCustomColumnSlotViews,
  resolveWorkflowTaskTableCustomColumnCount,
  type WorkflowTaskTableColumnPosition,
  type WorkflowTaskTableColumnSlots,
  type WorkflowTaskTableCustomColumnSlotView,
} from '@/domain/buildcore/workflowTaskTableColumns';
import {
  fetchBuildCoreWorkflowTaskTableColumnsBff,
  patchBuildCoreWorkflowTaskTableColumnBff,
} from '@/infrastructure/coreApi/buildCoreWorkflowTaskTableColumnsBff';
import type { BuildCoreWorkflowTaskTableColumnsResponse } from '@/infrastructure/crm/server/buildCoreWorkflowTaskTableColumnService';
import {
  getMockActiveWorkflowTaskCustomFieldDefinitions,
} from '@/infrastructure/crm/mock/mockWorkflowTaskCustomFieldsStore';
import {
  getMockWorkflowTaskTableColumnsResponse,
  setMockWorkflowTaskTableColumn,
} from '@/infrastructure/crm/mock/mockWorkflowTaskTableColumnsStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { env } from '@/infrastructure/config/env';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type BuildCoreWorkflowTaskTableColumnsContextValue = {
  readonly slots: WorkflowTaskTableColumnSlots;
  readonly slotViews: readonly WorkflowTaskTableCustomColumnSlotView[];
  readonly customColumnCount: 0 | 1 | 2;
  readonly canManageColumns: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly gridClassName: string;
  readonly getDefinitionForFieldKey: (fieldKey: string) => WorkflowTaskCustomFieldDefinition | null;
  readonly refetch: () => Promise<void>;
  readonly setTableColumn: (
    position: WorkflowTaskTableColumnPosition,
    fieldKey: string | null
  ) => Promise<boolean>;
};

const BuildCoreWorkflowTaskTableColumnsContext =
  createContext<BuildCoreWorkflowTaskTableColumnsContextValue | null>(null);

function gridClassForCustomColumnCount(count: 0 | 1 | 2): string {
  if (count === 2) return styles.workflowGridOpsCustom2;
  if (count === 1) return styles.workflowGridOpsCustom1;
  return styles.workflowGridOps;
}

function buildDefaultResponse(canManage = true): BuildCoreWorkflowTaskTableColumnsResponse {
  if (!env.isSaasMode || runtimeModes.useMockAuth()) {
    return getMockWorkflowTaskTableColumnsResponse(canManage);
  }
  return { slots: { slot1: null, slot2: null }, canManage };
}

export function BuildCoreWorkflowTaskTableColumnsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { definitions: workflowDefinitions, activeDefinitions } =
    useBuildCoreWorkflowTaskCustomFieldsForScope('workflow_task');
  const [state, setState] = useState<BuildCoreWorkflowTaskTableColumnsResponse>(() => {
    if (runtimeModes.isDemoRuntime()) {
      return buildDefaultResponse(false);
    }
    return buildDefaultResponse(true);
  });
  const [isLoading, setIsLoading] = useState(
    () => env.isSaasMode && !runtimeModes.useMockAuth() && !runtimeModes.isDemoRuntime()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    if (runtimeModes.isDemoRuntime()) {
      setState(buildDefaultResponse(false));
      setLoadError(null);
      setIsLoading(false);
      hasLoadedOnceRef.current = true;
      return;
    }

    if (!env.isSaasMode || runtimeModes.useMockAuth()) {
      setState(getMockWorkflowTaskTableColumnsResponse(true));
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
      const next = await runSessionCached(`workflow-task-table-columns:${token}`, () =>
        fetchBuildCoreWorkflowTaskTableColumnsBff(token)
      );
      if (loadGenerationRef.current !== generation) return;
      setState(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load table columns.');
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

  const setTableColumn = useCallback(
    async (
      position: WorkflowTaskTableColumnPosition,
      fieldKey: string | null
    ): Promise<boolean> => {
      if (!state.canManage || runtimeModes.isDemoRuntime()) return false;

      setIsSaving(true);
      const previous = state;

      if (!env.isSaasMode || runtimeModes.useMockAuth()) {
        try {
          const activeKeys = new Set(
            getMockActiveWorkflowTaskCustomFieldDefinitions('workflow_task').map((def) => def.fieldKey)
          );
          const slots = setMockWorkflowTaskTableColumn(position, fieldKey, activeKeys);
          setState({ ...getMockWorkflowTaskTableColumnsResponse(true), slots });
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
        const saved = await patchBuildCoreWorkflowTaskTableColumnBff(token, { position, fieldKey });
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

  const definitionByKey = useMemo(() => {
    const map = new Map<string, WorkflowTaskCustomFieldDefinition>();
    for (const definition of workflowDefinitions) {
      map.set(definition.fieldKey, definition);
    }
    return map;
  }, [workflowDefinitions]);

  const getDefinitionForFieldKey = useCallback(
    (fieldKey: string) => definitionByKey.get(fieldKey) ?? null,
    [definitionByKey]
  );

  const effectiveSlots = useMemo((): WorkflowTaskTableColumnSlots => {
    const activeKeys = new Set(activeDefinitions.map((def) => def.fieldKey));
    return {
      slot1: state.slots.slot1 != null && activeKeys.has(state.slots.slot1) ? state.slots.slot1 : null,
      slot2: state.slots.slot2 != null && activeKeys.has(state.slots.slot2) ? state.slots.slot2 : null,
    };
  }, [activeDefinitions, state.slots]);

  const customColumnCount = resolveWorkflowTaskTableCustomColumnCount(
    effectiveSlots,
    state.canManage
  );
  const slotViews = buildWorkflowTaskTableCustomColumnSlotViews(effectiveSlots, state.canManage);
  const gridClassName = gridClassForCustomColumnCount(customColumnCount);

  const value = useMemo(
    (): BuildCoreWorkflowTaskTableColumnsContextValue => ({
      slots: effectiveSlots,
      slotViews,
      customColumnCount,
      canManageColumns: state.canManage,
      isLoading,
      isSaving,
      loadError,
      gridClassName,
      getDefinitionForFieldKey,
      refetch: load,
      setTableColumn,
    }),
    [
      customColumnCount,
      effectiveSlots,
      getDefinitionForFieldKey,
      gridClassName,
      isLoading,
      isSaving,
      load,
      loadError,
      setTableColumn,
      slotViews,
      state.canManage,
    ]
  );

  return (
    <BuildCoreWorkflowTaskTableColumnsContext.Provider value={value}>
      {children}
    </BuildCoreWorkflowTaskTableColumnsContext.Provider>
  );
}

export function useBuildCoreWorkflowTaskTableColumns(): BuildCoreWorkflowTaskTableColumnsContextValue {
  const value = useContext(BuildCoreWorkflowTaskTableColumnsContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreWorkflowTaskTableColumns must be used within BuildCoreWorkflowTaskTableColumnsProvider'
    );
  }
  return value;
}
