'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  getCrmProjectDetailBySlug,
  getCrmProjectDetailBySlugSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
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
    const parent = getCrmProjectDetailBySlugSync(crmRepositories, parentSlug.trim());
    if (parent == null || project.summary.parentProjectId !== parent.summary.id) {
      return { status: 'not_found', slug: trimmed };
    }
    return { status: 'ready', project, parentProject: parent.summary };
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
    const project = await getCrmProjectDetailBySlug(crmRepositories, trimmed);
    if (project == null) {
      setState({ status: 'not_found', slug: trimmed });
      return;
    }

    if (parentSlug) {
      const parent = await getCrmProjectDetailBySlug(crmRepositories, parentSlug);
      if (parent == null || project.summary.parentProjectId !== parent.summary.id) {
        setState({ status: 'not_found', slug: trimmed });
        return;
      }
      setState({ status: 'ready', project, parentProject: parent.summary });
      return;
    }

    setState({ status: 'ready', project, parentProject: null });
  }, [isApiSource, parentSlug, slug]);

  useEffect(() => {
    void load({ silent: false });
  }, [load]);

  const refetch = useCallback(async () => {
    await load({ silent: true });
  }, [load]);

  return { state, refetch, isApiSource };
}
