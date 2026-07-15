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
  isBuildCoreEntityTerminologyKey,
  resolveEntityTerminology,
  validateEntityTerminologyDisplayName,
  type BuildCoreEntityTerminologyKey,
  type ResolvedEntityTerminology,
} from '@/domain/buildcore/entityTerminology';
import {
  fetchBuildCoreEntityTerminologyBff,
  patchBuildCoreEntityTerminologyBff,
} from '@/infrastructure/coreApi/buildCoreEntityTerminologyBff';
import type { BuildCoreEntityTerminologyResponse } from '@/infrastructure/crm/server/buildCoreEntityTerminologyService';
import {
  getMockEntityTerminologyResponse,
  resetMockEntityTerminologyStore,
  setMockEntityTerminology,
} from '@/infrastructure/crm/mock/mockEntityTerminologyStore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import { env } from '@/infrastructure/config/env';
import { usesClientSideOrganizationCustomization } from '@/infrastructure/runtime/usesClientSideOrganizationCustomization';
import { bindBuildCoreDashboardContent } from '@/platform/content/buildCoreDashboardContent';
import { bindBuildCoreDashboardNavigation } from '@/platform/navigation/buildCoreDashboardNavigation';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';

export type BuildCoreEntityTerminologyContextValue = {
  readonly terms: ResolvedEntityTerminology;
  readonly canEditEntityTerminology: boolean;
  readonly updateEntityTerm: (
    entityKey: BuildCoreEntityTerminologyKey,
    displayName: string
  ) => Promise<boolean>;
  readonly isLoading: boolean;
  readonly isSaving: boolean;
  readonly loadError: string | null;
  readonly refetch: () => Promise<void>;
  /** Remount key so static content/nav proxies re-render after bind. */
  readonly terminologyRevision: string;
};

const BuildCoreEntityTerminologyContext =
  createContext<BuildCoreEntityTerminologyContextValue | null>(null);

function buildDefaultResponse(canEdit = true): BuildCoreEntityTerminologyResponse {
  if (usesClientSideOrganizationCustomization()) {
    return getMockEntityTerminologyResponse(canEdit);
  }
  return {
    terms: resolveEntityTerminology(),
    overrides: {},
    defaults: { project: 'Project', subproject: 'Subproject' },
    canEdit,
  };
}

function bindCatalogs(terms: ResolvedEntityTerminology): void {
  bindBuildCoreDashboardContent(terms);
  bindBuildCoreDashboardNavigation(terms);
}

export function BuildCoreEntityTerminologyProvider({
  children,
}: {
  readonly children: ReactNode;
}): ReactElement {
  const { getAccessToken } = useBuildCoreDashboardContext();
  const [state, setState] = useState<BuildCoreEntityTerminologyResponse>(() => {
    const initial = buildDefaultResponse(true);
    bindCatalogs(initial.terms);
    return initial;
  });
  const [isLoading, setIsLoading] = useState(
    () => env.isSaasMode && !usesClientSideOrganizationCustomization()
  );
  const [isSaving, setIsSaving] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const loadGenerationRef = useRef(0);
  const hasLoadedOnceRef = useRef(false);

  const applyResponse = useCallback((next: BuildCoreEntityTerminologyResponse) => {
    bindCatalogs(next.terms);
    setState(next);
  }, []);

  const load = useCallback(async () => {
    if (usesClientSideOrganizationCustomization()) {
      applyResponse(getMockEntityTerminologyResponse(true));
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
      const next = await runSessionCached(`entity-terminology:${token}`, () =>
        fetchBuildCoreEntityTerminologyBff(token)
      );
      if (loadGenerationRef.current !== generation) return;
      applyResponse(next);
    } catch (err) {
      if (loadGenerationRef.current !== generation) return;
      setLoadError(err instanceof Error ? err.message : 'Could not load entity terminology.');
    } finally {
      if (loadGenerationRef.current === generation) {
        setIsLoading(false);
        hasLoadedOnceRef.current = true;
      }
    }
  }, [applyResponse, getAccessToken]);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    const onDemoReset = () => {
      resetMockEntityTerminologyStore();
      applyResponse(getMockEntityTerminologyResponse(true));
      setLoadError(null);
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, [applyResponse]);

  const updateEntityTerm = useCallback(
    async (entityKey: BuildCoreEntityTerminologyKey, displayName: string): Promise<boolean> => {
      if (!state.canEdit) return false;
      if (!isBuildCoreEntityTerminologyKey(entityKey)) return false;

      const validated = validateEntityTerminologyDisplayName(displayName);
      if (!validated.ok) return false;

      const previous = state;
      const nextOverrides = { ...state.overrides, [entityKey]: validated.value };
      const optimistic: BuildCoreEntityTerminologyResponse = {
        ...state,
        overrides: nextOverrides,
        terms: resolveEntityTerminology(nextOverrides),
      };
      applyResponse(optimistic);
      setIsSaving(true);

      if (usesClientSideOrganizationCustomization()) {
        const ok = setMockEntityTerminology(entityKey, validated.value);
        if (!ok) {
          applyResponse(previous);
          setIsSaving(false);
          return false;
        }
        applyResponse(getMockEntityTerminologyResponse(true));
        setIsSaving(false);
        return true;
      }

      const token = getAccessToken();
      if (!token) {
        applyResponse(previous);
        setIsSaving(false);
        return false;
      }

      try {
        const saved = await patchBuildCoreEntityTerminologyBff(
          token,
          entityKey,
          validated.value
        );
        applyResponse(saved);
        return true;
      } catch {
        applyResponse(previous);
        return false;
      } finally {
        setIsSaving(false);
      }
    },
    [applyResponse, getAccessToken, state]
  );

  const terminologyRevision = `${state.terms.project}|${state.terms.subproject}`;

  const value = useMemo(
    (): BuildCoreEntityTerminologyContextValue => ({
      terms: state.terms,
      canEditEntityTerminology: state.canEdit,
      updateEntityTerm,
      isLoading,
      isSaving,
      loadError,
      refetch: load,
      terminologyRevision,
    }),
    [
      isLoading,
      isSaving,
      load,
      loadError,
      state.canEdit,
      state.terms,
      terminologyRevision,
      updateEntityTerm,
    ]
  );

  return (
    <BuildCoreEntityTerminologyContext.Provider value={value}>
      <div key={terminologyRevision} style={{ display: 'contents' }}>
        {children}
      </div>
    </BuildCoreEntityTerminologyContext.Provider>
  );
}

export function useBuildCoreEntityTerminology(): BuildCoreEntityTerminologyContextValue {
  const value = useContext(BuildCoreEntityTerminologyContext);
  if (value == null) {
    throw new Error(
      'useBuildCoreEntityTerminology must be used within BuildCoreEntityTerminologyProvider'
    );
  }
  return value;
}
