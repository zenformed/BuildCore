'use client';

import { useCallback, useRef, useState } from 'react';
import { validateWorkflowTaskDocumentUpload } from '@/domain/crm/documentUpload';
import { uploadBudgetEntryDocument } from '@/application/use-cases/crm/uploadBudgetEntryDocument';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { createBudgetEntryDocumentDownload } from '@/application/use-cases/crm/createBudgetEntryDocumentDownload';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';

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
  const coreDegraded = useCorePlatformDegraded();

  const mapError = useCallback(
    (err: unknown): string => mapCrmDocumentActionError(err, wf),
    [wf]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
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
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
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
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
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
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
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
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
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
