'use client';

import { useEffect, useState } from 'react';
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

export function useCrmProjectDetail(slug: string): CrmProjectDetailState {
  const isApiSource = getCrmDataSource() === 'api';

  const [state, setState] = useState<CrmProjectDetailState>(() =>
    isApiSource ? { status: 'loading' } : resolveMockDetailState(slug)
  );

  useEffect(() => {
    if (!isApiSource) {
      setState(resolveMockDetailState(slug));
      return;
    }

    const trimmed = slug.trim();
    if (!trimmed) {
      setState({ status: 'not_found', slug });
      return;
    }

    let cancelled = false;
    setState({ status: 'loading' });

    void getCrmProjectDetailBySlug(crmRepositories, trimmed).then((project) => {
      if (cancelled) return;
      if (project == null) {
        setState({ status: 'not_found', slug: trimmed });
        return;
      }
      setState({ status: 'ready', project });
    });

    return () => {
      cancelled = true;
    };
  }, [isApiSource, slug]);

  return state;
}
