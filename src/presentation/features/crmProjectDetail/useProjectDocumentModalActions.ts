'use client';

import { useCallback } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { deleteProjectMediaDocument } from '@/application/use-cases/crm/deleteProjectMediaDocument';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { notifyCrmProjectDocumentDownloadResult } from '@/presentation/features/crmProjectDetail/crmProjectDocumentDownloadFeedback';
import {
  crmProjectDocumentDownloadTargetFromMetadata,
  downloadCrmProjectDocument,
} from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';
import { crmRepositories } from '@/shared/di/container';

export function useProjectDocumentModalActions(input: {
  projectSlug: string;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
  onDemoDownloadBlocked: (message: string) => void;
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
      try {
        const result = await downloadCrmProjectDocument(
          crmRepositories,
          crmProjectDocumentDownloadTargetFromMetadata(input.projectSlug, doc)
        );
        if (result === 'demo_blocked') {
          notifyCrmProjectDocumentDownloadResult(result, {
            onDemoDownloadBlocked: input.onDemoDownloadBlocked,
            onError: input.onError,
          });
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
      try {
        if (doc.budgetEntryId) {
          await deleteBudgetEntryDocument(crmRepositories, {
            projectSlug: input.projectSlug,
            budgetEntryId: doc.budgetEntryId,
            documentId: doc.id,
          });
        } else if (doc.workflowTaskId) {
          await deleteWorkflowTaskDocument(crmRepositories, {
            projectSlug: input.projectSlug,
            workflowTaskId: doc.workflowTaskId,
            documentId: doc.id,
          });
        } else {
          await deleteProjectMediaDocument(crmRepositories, {
            projectSlug: input.projectSlug,
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
