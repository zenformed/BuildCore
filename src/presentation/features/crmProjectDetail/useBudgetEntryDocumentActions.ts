'use client';

import { useCallback, useRef, useState } from 'react';
import { validateWorkflowTaskDocumentUpload } from '@/domain/crm/documentUpload';
import { STORAGE_LIMIT_EXCEEDED_CODE } from '@/domain/crm/documentUpload';
import { uploadBudgetEntryDocument } from '@/application/use-cases/crm/uploadBudgetEntryDocument';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { createBudgetEntryDocumentDownload } from '@/application/use-cases/crm/createBudgetEntryDocumentDownload';
import { crmRepositories } from '@/shared/di/container';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export function useBudgetEntryDocumentActions(input: {
  projectSlug: string;
  budgetEntryId: string;
  onChanged: () => Promise<void>;
  onError: (message: string) => void;
}): {
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  uploadFile: (file: File) => Promise<void>;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  downloadDocument: (documentId: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
} {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const wf = content.projectDetail.workflow;

  const mapError = useCallback(
    (err: unknown): string => {
      if (err instanceof CrmDocumentServiceError) {
        if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) {
          return wf.storageLimitExceeded;
        }
        return err.message;
      }
      if (err instanceof CrmApiError) {
        if (err.code === STORAGE_LIMIT_EXCEEDED_CODE) {
          return wf.storageLimitExceeded;
        }
        return err.message;
      }
      return err instanceof Error ? err.message : wf.documentUploadFailed;
    },
    [wf.documentUploadFailed, wf.storageLimitExceeded]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      const validation = validateWorkflowTaskDocumentUpload({
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        sizeBytes: file.size,
      });
      if (!validation.ok) {
        input.onError(validation.message);
        return;
      }

      setUploading(true);
      try {
        const buffer = await file.arrayBuffer();
        await uploadBudgetEntryDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          budgetEntryId: input.budgetEntryId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          body: buffer,
        });
        await input.onChanged();
      } catch (err) {
        input.onError(mapError(err));
      } finally {
        setUploading(false);
      }
    },
    [input, mapError]
  );

  const handleFileSelected = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file) return;
      await uploadFile(file);
    },
    [uploadFile]
  );

  const downloadDocument = useCallback(
    async (documentId: string) => {
      try {
        const download = await createBudgetEntryDocumentDownload(crmRepositories, {
          projectSlug: input.projectSlug,
          budgetEntryId: input.budgetEntryId,
          documentId,
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
    async (documentId: string) => {
      try {
        await deleteBudgetEntryDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          budgetEntryId: input.budgetEntryId,
          documentId,
        });
        await input.onChanged();
      } catch (err) {
        input.onError(mapError(err));
      }
    },
    [input, mapError]
  );

  return {
    uploading,
    fileInputRef,
    openFilePicker,
    uploadFile,
    handleFileSelected,
    downloadDocument,
    deleteDocument,
  };
}
