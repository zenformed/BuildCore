'use client';

import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import {
  getCrmProjectDetailBySlug,
  getCrmProjectDetailBySlugSync,
} from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export type CrmProjectDetailState =
  | { status: 'loading' }
  | { status: 'not_found'; slug: string }
  | { status: 'ready'; project: CrmProjectDetail };

function resolveMockDetailState(slug: string): CrmProjectDetailState {
  const trimmed = slug.trim();
  if (!trimmed) {
    return { status: 'not_found', slug };
  }
  const project = getCrmProjectDetailBySlugSync(crmRepositories, trimmed);
  if (project == null) {
    return { status: 'not_found', slug: trimmed };
  }
  return { status: 'ready', project };
}

export function useCrmProjectDetail(slug: string): {
  state: CrmProjectDetailState;
  refetch: () => Promise<void>;
  isApiSource: boolean;
} {
  const isApiSource = getCrmDataSource() === 'api';

  const [state, setState] = useState<CrmProjectDetailState>(() =>
    isApiSource ? { status: 'loading' } : resolveMockDetailState(slug)
  );

  const load = useCallback(async () => {
    const trimmed = slug.trim();
    if (!trimmed) {
      setState({ status: 'not_found', slug });
      return;
    }
    if (!isApiSource) {
      setState(resolveMockDetailState(trimmed));
      return;
    }
    setState({ status: 'loading' });
    const project = await getCrmProjectDetailBySlug(crmRepositories, trimmed);
    if (project == null) {
      setState({ status: 'not_found', slug: trimmed });
      return;
    }
    setState({ status: 'ready', project });
  }, [isApiSource, slug]);

  useEffect(() => {
    void load();
  }, [load]);

  return { state, refetch: load, isApiSource };
}
