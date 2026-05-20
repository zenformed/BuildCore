'use client';

import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { CrmBudgetEntry, CrmDocumentMetadata, CrmProjectDetail } from '@/domain/crm';
import { listCrmBudgetEntriesByProject } from '@/application/use-cases/crm/listCrmBudgetEntriesByProject';
import { crmRepositories } from '@/shared/di/container';
import {
  appendBudgetEntryDocument,
  applyBudgetEntriesToProject,
  patchBudgetEntryInProject,
  removeBudgetEntryDocument,
  removeBudgetEntryFromProject,
} from './budgetSectionState';

export function useBudgetSection(
  project: CrmProjectDetail,
  setProject: Dispatch<SetStateAction<CrmProjectDetail>>
): {
  refreshBudgetSection: () => Promise<void>;
  onBudgetEntryPatched: (entry: CrmBudgetEntry) => void;
  onBudgetEntryCreated: (entry: CrmBudgetEntry) => void;
  onBudgetEntryDeleted: (entryId: string) => void;
  onBudgetEntryDocumentUploaded: (document: CrmDocumentMetadata) => void;
  onBudgetEntryDocumentDeleted: (documentId: string) => void;
} {
  const refreshBudgetSection = useCallback(async () => {
    const entries = await listCrmBudgetEntriesByProject(crmRepositories, {
      projectId: project.summary.id,
      projectSlug: project.summary.slug,
    });
    setProject((prev) => applyBudgetEntriesToProject(prev, entries));
  }, [project.summary.id, project.summary.slug, setProject]);

  const onBudgetEntryPatched = useCallback(
    (entry: CrmBudgetEntry) => {
      setProject((prev) => patchBudgetEntryInProject(prev, entry));
    },
    [setProject]
  );

  const onBudgetEntryCreated = useCallback(
    (entry: CrmBudgetEntry) => {
      setProject((prev) => patchBudgetEntryInProject(prev, entry));
    },
    [setProject]
  );

  const onBudgetEntryDeleted = useCallback(
    (entryId: string) => {
      setProject((prev) => removeBudgetEntryFromProject(prev, entryId));
    },
    [setProject]
  );

  const onBudgetEntryDocumentUploaded = useCallback(
    (document: CrmDocumentMetadata) => {
      setProject((prev) => appendBudgetEntryDocument(prev, document));
    },
    [setProject]
  );

  const onBudgetEntryDocumentDeleted = useCallback(
    (documentId: string) => {
      setProject((prev) => removeBudgetEntryDocument(prev, documentId));
    },
    [setProject]
  );

  return {
    refreshBudgetSection,
    onBudgetEntryPatched,
    onBudgetEntryCreated,
    onBudgetEntryDeleted,
    onBudgetEntryDocumentUploaded,
    onBudgetEntryDocumentDeleted,
  };
}
