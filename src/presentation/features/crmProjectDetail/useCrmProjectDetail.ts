'use client';

import { useMemo } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { getMockCrmProjectDetailBySlug } from '@/platform/mock/crm';

export type CrmProjectDetailState =
  | { status: 'loading' }
  | { status: 'not_found'; slug: string }
  | { status: 'ready'; project: CrmProjectDetail };

export function useCrmProjectDetail(slug: string): CrmProjectDetailState {
  return useMemo((): CrmProjectDetailState => {
    const trimmed = slug.trim();
    if (!trimmed) {
      return { status: 'not_found', slug };
    }
    const project = getMockCrmProjectDetailBySlug(trimmed);
    if (project == null) {
      return { status: 'not_found', slug: trimmed };
    }
    return { status: 'ready', project };
  }, [slug]);
}
