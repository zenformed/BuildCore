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
  buildPaymentTableCustomColumnSlotViews,
  resolvePaymentTableCustomColumnCount,
  type PaymentTableColumnPosition,
  type PaymentTableColumnSlots,
  type PaymentTableCustomColumnSlotView,
} from '@/domain/buildcore/paymentTableColumns';
import {
  fetchBuildCorePaymentTableColumnsBff,
  patchBuildCorePaymentTableColumnBff,
} from '@/infrastructure/coreApi/buildCorePaymentTableColumnsBff';
import type { BuildCorePaymentTableColumnsResponse } from '@/infrastructure/crm/server/buildCorePaymentTableColumnService';
import { getMockActiveWorkflowTaskCustomFieldDefinitions } from '@/infrastructure/crm/mock/mockWorkflowTaskCustomFieldsStore';
import {
  getMockPaymentTableColumnsResponse,
  setMockPaymentTableColumn,
} from '@/infrastructure/crm/mock/mockPaymentTableColumnsStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { env } from '@/infrastructure/config/env';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { useBuildCoreWorkflowTaskCustomFieldsForScope } from '@/presentation/providers/BuildCoreWorkflowTaskCustomFieldsProvider';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

export type BuildCorePaymentTableColumnsContextValue = {
  readonly slots: PaymentTableColumnSlots;
  readonly slotViews: readonly PaymentTableCustomColumnSlotView[];
  readonly customColumnCount: 0 | 1 | 2;
  readonly canManageColumns: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly shellClassName: string;
  readonly getDefinitionForFieldKey: (fieldKey: string) => WorkflowTaskCustomFieldDefinition | null;
  readonly refetch: () => Promise<void>;
  readonly setTableColumn: (
    position: PaymentTableColumnPosition,
    fieldKey: string | null
  ) => Promise<boolean>;
};

const BuildCorePaymentTableColumnsContext =
  createContext<BuildCorePaymentTableColumnsContextValue | null>(null);

function shellClassForCustomColumnCount(count: 0 | 1 | 2): string {
  if (count === 2) return styles.paymentsTableGridShellCustom2;
  if (count === 1) return styles.paymentsTableGridShellCustom1;
  return '';
}

function buildDefaultResponse(canManage = true): BuildCorePaymentTableColumnsResponse {
  if (!env.isSaasMode || runtimeModes.useMockAuth()) {
    return getMockPaymentTableColumnsResponse(canManage);
  }
  return { slots: { slot1: null, slot2: null }, canManage };
}

export function BuildCorePaymentTableColumnsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const { definitions: paymentDefinitions, activeDefinitions } =
    useBuildCoreWorkflowTaskCustomFieldsForScope('payment');
  const [state, setState] = useState<BuildCorePaymentTableColumnsResponse>(() => {
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
      setState(getMockPaymentTableColumnsResponse(true));
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
      const next = await runSessionCached(`payment-table-columns:${token}`, () =>
        fetchBuildCorePaymentTableColumnsBff(token)
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
    async (position: PaymentTableColumnPosition, fieldKey: string | null): Promise<boolean> => {
      if (!state.canManage || runtimeModes.isDemoRuntime()) return false;

      setIsSaving(true);
      const previous = state;

      if (!env.isSaasMode || runtimeModes.useMockAuth()) {
        try {
          const activeKeys = new Set(
            getMockActiveWorkflowTaskCustomFieldDefinitions('payment').map((def) => def.fieldKey)
          );
          const slots = setMockPaymentTableColumn(position, fieldKey, activeKeys);
          setState({ ...getMockPaymentTableColumnsResponse(true), slots });
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
        const saved = await patchBuildCorePaymentTableColumnBff(token, { position, fieldKey });
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
    for (const definition of paymentDefinitions) {
      map.set(definition.fieldKey, definition);
    }
    return map;
  }, [paymentDefinitions]);

  const getDefinitionForFieldKey = useCallback(
    (fieldKey: string) => definitionByKey.get(fieldKey) ?? null,
    [definitionByKey]
  );

  const effectiveSlots = useMemo((): PaymentTableColumnSlots => {
    const activeKeys = new Set(activeDefinitions.map((def) => def.fieldKey));
    return {
      slot1: state.slots.slot1 != null && activeKeys.has(state.slots.slot1) ? state.slots.slot1 : null,
      slot2: state.slots.slot2 != null && activeKeys.has(state.slots.slot2) ? state.slots.slot2 : null,
    };
  }, [activeDefinitions, state.slots]);

  const customColumnCount = resolvePaymentTableCustomColumnCount(effectiveSlots, state.canManage);
  const slotViews = buildPaymentTableCustomColumnSlotViews(effectiveSlots, state.canManage);
  const shellClassName = shellClassForCustomColumnCount(customColumnCount);

  const value = useMemo(
    (): BuildCorePaymentTableColumnsContextValue => ({
      slots: effectiveSlots,
      slotViews,
      customColumnCount,
      canManageColumns: state.canManage,
      isLoading,
      isSaving,
      loadError,
      shellClassName,
      getDefinitionForFieldKey,
      refetch: load,
      setTableColumn,
    }),
    [
      customColumnCount,
      effectiveSlots,
      getDefinitionForFieldKey,
      isLoading,
      isSaving,
      load,
      loadError,
      setTableColumn,
      shellClassName,
      slotViews,
      state.canManage,
    ]
  );

  return (
    <BuildCorePaymentTableColumnsContext.Provider value={value}>
      {children}
    </BuildCorePaymentTableColumnsContext.Provider>
  );
}

export function useBuildCorePaymentTableColumns(): BuildCorePaymentTableColumnsContextValue {
  const value = useContext(BuildCorePaymentTableColumnsContext);
  if (value == null) {
    throw new Error(
      'useBuildCorePaymentTableColumns must be used within BuildCorePaymentTableColumnsProvider'
    );
  }
  return value;
}
