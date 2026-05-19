'use client';

import { useCallback, useRef, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import {
  BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import { STORAGE_LIMIT_EXCEEDED_CODE } from '@/domain/crm/documentUpload';
import { uploadWorkflowTaskDocument } from '@/application/use-cases/crm/uploadWorkflowTaskDocument';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { createWorkflowTaskDocumentDownload } from '@/application/use-cases/crm/createWorkflowTaskDocumentDownload';
import { crmRepositories } from '@/shared/di/container';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import { CrmDocumentServiceError } from '@/infrastructure/crm/errors';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export function useWorkflowTaskDocumentActions(input: {
  projectSlug: string;
  workflowTaskId: string;
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
        await uploadWorkflowTaskDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
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
        const download = await createWorkflowTaskDocumentDownload(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
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
        await deleteWorkflowTaskDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
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
