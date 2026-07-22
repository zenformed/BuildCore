'use client';

import { useCallback, useRef, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { deleteWorkflowTaskDocument } from '@/application/use-cases/crm/deleteWorkflowTaskDocument';
import { listWorkflowTaskDocuments } from '@/application/use-cases/crm/listWorkflowTaskDocuments';
import { downloadCrmProjectDocument } from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';
import { notifyCrmProjectDocumentDownloadResult } from '@/presentation/features/crmProjectDetail/crmProjectDocumentDownloadFeedback';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';
import { performCrmDirectUpload } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';

export type WorkflowTaskDocumentChangeHandlers = {
  onDocumentUploaded: (document: CrmDocumentMetadata) => void | Promise<void>;
  onDocumentDeleted: (documentId: string) => void | Promise<void>;
};

export function useWorkflowTaskDocumentActions(input: {
  projectSlug: string;
  workflowTaskId: string;
  onError: (message: string) => void;
  onDemoDownloadBlocked: (message: string) => void;
} & WorkflowTaskDocumentChangeHandlers): {
  uploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraFileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  openCameraPicker: () => void;
  uploadFile: (file: File) => Promise<void>;
  handleFileSelected: (e: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  downloadDocument: (documentId: string, fileName: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
} {
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cameraFileInputRef = useRef<HTMLInputElement>(null);
  const wf = content.projectDetail.workflow;
  const coreDegraded = useCorePlatformDegraded();

  const mapError = useCallback(
    (err: unknown): string => mapCrmDocumentActionError(err, wf),
    [wf]
  );

  const openFilePicker = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const openCameraPicker = useCallback(() => {
    cameraFileInputRef.current?.click();
  }, []);

  const uploadFile = useCallback(
    async (file: File) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }

      setUploading(true);
      try {
        const prepared = await performCrmDirectUpload(file, {
          scope: 'workflow_task',
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
        });
        const documents = await listWorkflowTaskDocuments(crmRepositories, {
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
        });
        const document = documents.find((doc) => doc.id === prepared.documentId);
        if (document == null) {
          throw new Error(wf.documentUploadFailed);
        }
        await input.onDocumentUploaded(document);
      } catch (err) {
        input.onError(err instanceof Error ? err.message : mapError(err));
      } finally {
        setUploading(false);
      }
    },
    [coreDegraded, input, mapError, wf.coreServicesUnavailable, wf.documentUploadFailed]
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
    async (documentId: string, fileName: string) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
      try {
        const result = await downloadCrmProjectDocument(crmRepositories, {
          kind: 'workflow_task',
          projectSlug: input.projectSlug,
          workflowTaskId: input.workflowTaskId,
          documentId,
          fileName,
        });
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
    cameraFileInputRef,
    openFilePicker,
    openCameraPicker,
    uploadFile,
    handleFileSelected,
    downloadDocument,
    deleteDocument,
  };
}
