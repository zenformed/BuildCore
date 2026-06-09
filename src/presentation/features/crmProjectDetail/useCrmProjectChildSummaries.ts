'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { sortCrmProjectsForList } from '@/domain/crm/projectPriorityToggle';
import {
  listCrmProjectChildSummaries,
  listCrmProjectChildSummariesSync,
} from '@/application/use-cases/crm/listCrmProjectChildSummaries';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export function filterSubprojects(
  rows: readonly CrmProjectSummary[],
  searchQuery: string
): CrmProjectSummary[] {
  const query = searchQuery.trim().toLowerCase();
  const filtered = !query
    ? [...rows]
    : rows.filter((project) => {
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
  return sortCrmProjectsForList(filtered);
}

export function useCrmProjectChildSummaries(
  parentProject: CrmProjectSummary | null | undefined,
  searchQuery: string
): {
  rows: CrmProjectSummary[];
  isLoading: boolean;
  refetch: () => Promise<void>;
} {
  const isApiSource = getCrmDataSource() === 'api';
  const parentProjectId = parentProject?.id ?? null;
  const parentSlug = parentProject?.slug ?? null;
  const [summaries, setSummaries] = useState<readonly CrmProjectSummary[] | null>(() => {
    if (parentProjectId == null || parentSlug == null) return [];
    if (isApiSource) return null;
    return listCrmProjectChildSummariesSync(crmRepositories, {
      parentProjectId,
      parentSlug,
    });
  });

  const loadSummaries = useCallback(async (): Promise<void> => {
    if (parentProjectId == null || parentSlug == null) {
      setSummaries([]);
      return;
    }
    if (!isApiSource) {
      setSummaries(
        listCrmProjectChildSummariesSync(crmRepositories, {
          parentProjectId,
          parentSlug,
        })
      );
      return;
    }
    const data = await listCrmProjectChildSummaries(crmRepositories, {
      parentProjectId,
      parentSlug,
    });
    setSummaries(data);
  }, [isApiSource, parentProjectId, parentSlug]);

  useEffect(() => {
    if (!isApiSource || parentProjectId == null || parentSlug == null) return;
    void loadSummaries();
  }, [isApiSource, loadSummaries, parentProjectId, parentSlug]);

  const rows = useMemo(
    () => filterSubprojects(summaries ?? [], searchQuery),
    [summaries, searchQuery]
  );

  return {
    rows,
    isLoading: parentProjectId != null && summaries == null,
    refetch: loadSummaries,
  };
}
