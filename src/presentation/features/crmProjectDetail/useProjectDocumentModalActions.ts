'use client';

import { useCallback } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { createBudgetEntryDocumentDownload } from '@/application/use-cases/crm/createBudgetEntryDocumentDownload';
import { createWorkflowTaskDocumentDownload } from '@/application/use-cases/crm/createWorkflowTaskDocumentDownload';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';
import { crmRepositories } from '@/shared/di/container';

export function useProjectDocumentModalActions(input: {
  projectSlug: string;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}): {
  downloadDocument: (doc: CrmDocumentMetadata) => Promise<void>;
  deleteDocument: (doc: CrmDocumentMetadata) => Promise<void>;
} {
  const wf = content.projectDetail.workflow;
  const coreDegraded = useCorePlatformDegraded();

  const mapError = useCallback(
    (err: unknown): string => mapCrmDocumentActionError(err, wf),
    [wf]
  );

  const downloadDocument = useCallback(
    async (doc: CrmDocumentMetadata) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
      if (!doc.workflowTaskId && !doc.budgetEntryId) {
        input.onError('Document is not linked to a task or budget item.');
        return;
      }
      try {
        const download = doc.budgetEntryId
          ? await createBudgetEntryDocumentDownload(crmRepositories, {
              projectSlug: input.projectSlug,
              budgetEntryId: doc.budgetEntryId,
              documentId: doc.id,
            })
          : await createWorkflowTaskDocumentDownload(crmRepositories, {
              projectSlug: input.projectSlug,
              workflowTaskId: doc.workflowTaskId!,
              documentId: doc.id,
            });
        const anchor = document.createElement('a');
        anchor.href = download.url;
        anchor.download = download.fileName;
        anchor.rel = 'noopener';
        anchor.click();
        if (download.url.startsWith('blob:')) {
          URL.revokeObjectURL(download.url);
        }
      } catch (err) {
        input.onError(mapError(err));
      }
    },
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
  );

  const deleteDocument = useCallback(
    async (doc: CrmDocumentMetadata) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
      if (!doc.workflowTaskId && !doc.budgetEntryId) {
        input.onError('Document is not linked to a task or budget item.');
        return;
      }
      try {
        if (doc.budgetEntryId) {
          await deleteBudgetEntryDocument(crmRepositories, {
            projectSlug: input.projectSlug,
            budgetEntryId: doc.budgetEntryId,
            documentId: doc.id,
          });
        } else {
          await deleteWorkflowTaskDocument(crmRepositories, {
            projectSlug: input.projectSlug,
            workflowTaskId: doc.workflowTaskId!,
            documentId: doc.id,
          });
        }
        await input.onChanged();
      } catch (err) {
        input.onError(mapError(err));
      }
    },
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
  );

  return { downloadDocument, deleteDocument };
}
