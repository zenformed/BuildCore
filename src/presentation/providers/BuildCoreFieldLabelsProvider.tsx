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
  buildDefaultBuildCoreFieldLabels,
  isRegisteredBuildCoreFieldKey,
  normalizeBuildCoreFieldLabelDisplay,
  validateBuildCoreFieldLabelValue,
} from '@/domain/buildcore/fieldLabels';
import {
  fetchBuildCoreFieldLabelsBff,
  patchBuildCoreFieldLabelBff,
} from '@/infrastructure/coreApi/buildCoreFieldLabelsBff';
import type { BuildCoreFieldLabelsResponse } from '@/infrastructure/crm/server/buildCoreFieldLabelService';
import {
  getMockFieldLabelsResponse,
  setMockFieldLabel,
} from '@/infrastructure/crm/mock/mockFieldLabelsStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { env } from '@/infrastructure/config/env';
import { usesClientSideOrganizationCustomization } from '@/infrastructure/runtime/usesClientSideOrganizationCustomization';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreFieldLabelsContextValue = {
  readonly getFieldLabel: (fieldKey: string) => string;
  readonly updateFieldLabel: (fieldKey: string, label: string) => Promise<boolean>;
  readonly canEditFieldLabels: boolean;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
};

const BuildCoreFieldLabelsContext = createContext<BuildCoreFieldLabelsContextValue | null>(null);

function buildDefaultResponse(canEdit = true): BuildCoreFieldLabelsResponse {
  if (usesClientSideOrganizationCustomization()) {
    return getMockFieldLabelsResponse(canEdit);
  }
  return {
    labels: {},
    defaults: buildDefaultBuildCoreFieldLabels(),
    canEdit,
  };
}

export function BuildCoreFieldLabelsProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [state, setState] = useState<BuildCoreFieldLabelsResponse>(() => buildDefaultResponse(true));
  const [isLoading, setIsLoading] = useState(
    () => env.isSaasMode && !usesClientSideOrganizationCustomization()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const load = useCallback(async () => {
    if (usesClientSideOrganizationCustomization()) {
      setState(getMockFieldLabelsResponse(true));
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
      const next = await runSessionCached(`field-labels:${token}`, () =>
        fetchBuildCoreFieldLabelsBff(token)
      );
      if (loadGenerationRef.current !== generation) return;
      setState(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load field labels.');
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
      setState(getMockFieldLabelsResponse(true));
      setLoadError(null);
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, []);

  const getFieldLabel = useCallback(
    (fieldKey: string): string => {
      if (!isRegisteredBuildCoreFieldKey(fieldKey)) return fieldKey;
      const label = state.labels[fieldKey] ?? state.defaults[fieldKey] ?? fieldKey;
      return normalizeBuildCoreFieldLabelDisplay(label);
    },
    [state.defaults, state.labels]
  );

  const updateFieldLabel = useCallback(
    async (fieldKey: string, label: string): Promise<boolean> => {
      if (!state.canEdit) return false;
      if (!isRegisteredBuildCoreFieldKey(fieldKey)) return false;

      const validated = validateBuildCoreFieldLabelValue(label);
      if (!validated.ok) return false;

      const previous = state;
      setState({
        ...state,
        labels: { ...state.labels, [fieldKey]: validated.value },
      });
      setIsSaving(true);

      if (usesClientSideOrganizationCustomization()) {
        setMockFieldLabel(fieldKey, validated.value);
        setIsSaving(false);
        return true;
      }

      const token = getAccessToken();
      if (!token) {
        setState(previous);
        setIsSaving(false);
        return false;
      }

      try {
        const saved = await patchBuildCoreFieldLabelBff(token, fieldKey, validated.value);
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

  const value = useMemo(
    (): BuildCoreFieldLabelsContextValue => ({
      getFieldLabel,
      updateFieldLabel,
      canEditFieldLabels: state.canEdit,
      isLoading,
      isSaving,
      loadError,
      refetch: load,
    }),
    [
      getFieldLabel,
      isLoading,
      isSaving,
      load,
      loadError,
      state.canEdit,
      updateFieldLabel,
    ]
  );

  return (
    <BuildCoreFieldLabelsContext.Provider value={value}>
      {children}
    </BuildCoreFieldLabelsContext.Provider>
  );
}

export function useBuildCoreFieldLabels(): BuildCoreFieldLabelsContextValue {
  const value = useContext(BuildCoreFieldLabelsContext);
  if (value == null) {
    throw new Error('useBuildCoreFieldLabels must be used within BuildCoreFieldLabelsProvider');
  }
  return value;
}

export {
  WORKFLOW_TASK_ACTIONS_FIELD_KEY,
  WORKFLOW_TASK_ASSIGNED_FIELD_KEY,
  WORKFLOW_TASK_DOCUMENTS_FIELD_KEY,
  WORKFLOW_TASK_DUE_FIELD_KEY,
  WORKFLOW_TASK_NOTES_FIELD_KEY,
  WORKFLOW_TASK_STATUS_FIELD_KEY,
  WORKFLOW_TASK_TASK_FIELD_KEY,
} from '@/domain/buildcore/fieldLabels';
