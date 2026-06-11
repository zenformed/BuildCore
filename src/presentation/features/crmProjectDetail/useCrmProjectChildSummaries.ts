'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCrmProjectSummarySearchHaystack } from '@/domain/crm';
import { sortCrmProjectsForList } from '@/domain/crm/projectPriorityToggle';
import {
  listCrmProjectChildSummaries,
  listCrmProjectChildSummariesSync,
} from '@/application/use-cases/crm/listCrmProjectChildSummaries';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';

export function filterSubprojects(
  rows: readonly CrmProjectSummary[],
  searchQuery: string
): CrmProjectSummary[] {
  const query = searchQuery.trim().toLowerCase();
  const filtered = !query
    ? [...rows]
    : rows.filter((project) => buildCrmProjectSummarySearchHaystack(project).includes(query));
  return sortCrmProjectsForList(filtered);
}

function mergeProjectSummaryIntoList(
  current: readonly CrmProjectSummary[] | null,
  summary: CrmProjectSummary
): readonly CrmProjectSummary[] {
  if (current == null) {
    return sortCrmProjectsForList([summary]);
  }
  const existingIndex = current.findIndex((project) => project.id === summary.id);
  if (existingIndex >= 0) {
    return sortCrmProjectsForList(
      current.map((project) => (project.id === summary.id ? summary : project))
    );
  }
  return sortCrmProjectsForList([...current, summary]);
}

export function useCrmProjectChildSummaries(
  parentProject: CrmProjectSummary | null | undefined,
  searchQuery: string
): {
  rows: CrmProjectSummary[];
  isLoading: boolean;
  refetch: () => Promise<void>;
  appendProjectSummary: (summary: CrmProjectSummary) => void;
  patchProjectSummary: (summary: CrmProjectSummary) => void;
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
    return deferNonCriticalWork(() => {
      void loadSummaries();
    });
  }, [isApiSource, loadSummaries, parentProjectId, parentSlug]);

  const rows = useMemo(
    () => filterSubprojects(summaries ?? [], searchQuery),
    [summaries, searchQuery]
  );

  const appendProjectSummary = useCallback((summary: CrmProjectSummary) => {
    setSummaries((current) => mergeProjectSummaryIntoList(current, summary));
  }, []);

  const patchProjectSummary = useCallback((summary: CrmProjectSummary) => {
    setSummaries((current) => mergeProjectSummaryIntoList(current, summary));
  }, []);

  return {
    rows,
    isLoading: parentProjectId != null && summaries == null,
    refetch: loadSummaries,
    appendProjectSummary,
    patchProjectSummary,
  };
}
