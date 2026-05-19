'use client';

import { useCallback } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { STORAGE_LIMIT_EXCEEDED_CODE } from '@/domain/crm/documentUpload';
import { createWorkflowTaskDocumentDownload } from '@/application/use-cases/crm/createWorkflowTaskDocumentDownload';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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

  const mapError = useCallback(
    (err: unknown): string => {
      if (err instanceof CrmDocumentServiceError || err instanceof CrmApiError) {
        if ('code' in err && err.code === STORAGE_LIMIT_EXCEEDED_CODE) {
          return wf.storageLimitExceeded;
        }
        return err.message;
      }
      return err instanceof Error ? err.message : wf.documentUploadFailed;
    },
    [wf.documentUploadFailed, wf.storageLimitExceeded]
  );

  const downloadDocument = useCallback(
    async (doc: CrmDocumentMetadata) => {
      if (!doc.workflowTaskId) {
        input.onError('Document is not linked to a workflow task.');
        return;
      }
      try {
        const download = await createWorkflowTaskDocumentDownload(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: doc.workflowTaskId,
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
    [input, mapError]
  );

  const deleteDocument = useCallback(
    async (doc: CrmDocumentMetadata) => {
      if (!doc.workflowTaskId) {
        input.onError('Document is not linked to a workflow task.');
        return;
      }
      try {
        await deleteWorkflowTaskDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: doc.workflowTaskId,
          documentId: doc.id,
        });
        await input.onChanged();
      } catch (err) {
        input.onError(mapError(err));
      }
    },
    [input, mapError]
  );

  return { downloadDocument, deleteDocument };
}
