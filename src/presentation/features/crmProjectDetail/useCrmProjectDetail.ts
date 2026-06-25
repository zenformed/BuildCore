'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  getCrmProjectDetailBySlug,
  getCrmProjectDetailBySlugSync,
  getCrmProjectSummaryBySlug,
  getCrmProjectSummaryBySlugSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { DEMO_RESET_EVENT } from '@/presentation/providers/DemoModeProvider';
import { crmRepositories } from '@/shared/di/container';

export type CrmProjectDetailState =
  | { status: 'loading' }
  | { status: 'not_found'; slug: string }
  | { status: 'ready'; project: CrmProjectDetail; parentProject?: CrmProjectSummary | null };

export type UseCrmProjectDetailOptions = {
  /** When set, validates the loaded project belongs to this parent route slug. */
  readonly parentSlug?: string;
};

function resolveMockDetailState(
  slug: string,
  parentSlug?: string
): CrmProjectDetailState {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { status: 'not_found', slug };
  }
  const project = getCrmProjectDetailBySlugSync(crmRepositories, trimmed);
  if (project == null) {
    return { status: 'not_found', slug: trimmed };
  }

  if (parentSlug) {
    const parentSummary = getCrmProjectSummaryBySlugSync(crmRepositories, parentSlug.trim());
    if (parentSummary == null || project.summary.parentProjectId !== parentSummary.id) {
      return { status: 'not_found', slug: trimmed };
    }
    return { status: 'ready', project, parentProject: parentSummary };
  }

  return { status: 'ready', project, parentProject: null };
}

export function useCrmProjectDetail(
  slug: string,
  options?: UseCrmProjectDetailOptions
): {
  state: CrmProjectDetailState;
  refetch: () => Promise<void>;
  isApiSource: boolean;
} {
  const parentSlug = options?.parentSlug?.trim() || undefined;
  const isApiSource = getCrmDataSource() === 'api';

  const [state, setState] = useState<CrmProjectDetailState>(() =>
    isApiSource ? { status: 'loading' } : resolveMockDetailState(slug, parentSlug)
  );

  const load = useCallback(async ({ silent = false }: { silent?: boolean } = {}) => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setState({ status: 'not_found', slug });
      return;
    }
    if (!isApiSource) {
      setState(resolveMockDetailState(trimmed, parentSlug));
      return;
    }
    if (!silent) {
      setState({ status: 'loading' });
    }

    if (parentSlug) {
      const [project, parentSummary] = await Promise.all([
        getCrmProjectDetailBySlug(crmRepositories, trimmed),
        getCrmProjectSummaryBySlug(crmRepositories, parentSlug),
      ]);
      if (project == null) {
        setState({ status: 'not_found', slug: trimmed });
        return;
      }
      if (parentSummary == null || project.summary.parentProjectId !== parentSummary.id) {
        setState({ status: 'not_found', slug: trimmed });
        return;
      }
      setState({ status: 'ready', project, parentProject: parentSummary });
      return;
    }

    const project = await getCrmProjectDetailBySlug(crmRepositories, trimmed);
    if (project == null) {
      setState({ status: 'not_found', slug: trimmed });
      return;
    }

    setState({ status: 'ready', project, parentProject: null });
  }, [isApiSource, parentSlug, slug]);

  useEffect(() => {
    void load({ silent: false });
  }, [load]);

  useEffect(() => {
    const onDemoReset = () => {
      void load({ silent: true });
    };
    window.addEventListener(DEMO_RESET_EVENT, onDemoReset);
    return () => window.removeEventListener(DEMO_RESET_EVENT, onDemoReset);
  }, [load]);

  const refetch = useCallback(async () => {
    await load({ silent: true });
  }, [load]);

  return { state, refetch, isApiSource };
}
