'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import {
  listCrmProjectChildSummaries,
  listCrmProjectChildSummariesSync,
} from '@/application/use-cases/crm/listCrmProjectChildSummaries';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

function filterSubprojects(
  rows: readonly CrmProjectSummary[],
  searchQuery: string
): CrmProjectSummary[] {
  const query = searchQuery.trim().toLowerCase();
  if (!query) return [...rows];
  return rows.filter((project) => {
    const haystack = [
      project.name,
      project.client.name,
      project.contact.name,
      project.contact.email,
      project.contact.phone,
      project.notesPreview ?? '',
      project.slug,
    ]
      .join(' ')
      .toLowerCase();
    return haystack.includes(query);
  });
}

export function useCrmProjectChildSummaries(
  parentProject: CrmProjectSummary | null | undefined,
  searchQuery: string
): {
  rows: CrmProjectSummary[];
  isLoading: boolean;
  refetch: () => void;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const parentProjectId = parentProject?.id ?? null;
  const parentSlug = parentProject?.slug ?? null;
  const [reloadKey, setReloadKey] = useState(0);
  const [summaries, setSummaries] = useState<readonly CrmProjectSummary[] | null>(() => {
    if (parentProjectId == null || parentSlug == null) return [];
    if (isApiSource) return null;
    return listCrmProjectChildSummariesSync(crmRepositories, {
      parentProjectId,
      parentSlug,
    });
  });

  const refetch = useCallback(() => {
    if (parentProjectId == null || parentSlug == null) return;
    if (isApiSource) {
      setReloadKey((key) => key + 1);
      return;
    }
    setSummaries(
      listCrmProjectChildSummariesSync(crmRepositories, {
        parentProjectId,
        parentSlug,
      })
    );
  }, [isApiSource, parentProjectId, parentSlug]);

  useEffect(() => {
    if (!isApiSource || parentProjectId == null || parentSlug == null) return;

    let cancelled = false;
    void listCrmProjectChildSummaries(crmRepositories, {
      parentProjectId,
      parentSlug,
    }).then((data) => {
      if (!cancelled) setSummaries(data);
    });
    return () => {
      cancelled = true;
    };
  }, [isApiSource, parentProjectId, parentSlug, reloadKey]);

  const rows = useMemo(
    () => filterSubprojects(summaries ?? [], searchQuery),
    [summaries, searchQuery]
  );

  return {
    rows,
    isLoading: parentProjectId != null && summaries == null,
    refetch,
  };
}
