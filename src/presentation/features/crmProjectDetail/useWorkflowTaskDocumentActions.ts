'use client';

import { useCallback, useRef, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import {
  BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES,
  validateWorkflowTaskDocumentUpload,
} from '@/domain/crm/documentUpload';
import { uploadWorkflowTaskDocument } from '@/application/use-cases/crm/uploadWorkflowTaskDocument';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { createWorkflowTaskDocumentDownload } from '@/application/use-cases/crm/createWorkflowTaskDocumentDownload';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';

export type WorkflowTaskDocumentChangeHandlers = {
  onDocumentUploaded: (document: CrmDocumentMetadata) => void | Promise<void>;
  onDocumentDeleted: (documentId: string) => void | Promise<void>;
};

export function useWorkflowTaskDocumentActions(input: {
  projectSlug: string;
  workflowTaskId: string;
  onError: (message: string) => void;
} & WorkflowTaskDocumentChangeHandlers): {
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
        const result = await uploadWorkflowTaskDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
          fileName: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
          body: buffer,
        });
        await input.onDocumentUploaded(result.document);
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
    [coreDegraded, input, mapError, wf.coreServicesUnavailable]
  );

  const deleteDocument = useCallback(
    async (documentId: string) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
      try {
        await deleteWorkflowTaskDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
          documentId,
        });
        await input.onDocumentDeleted(documentId);
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
