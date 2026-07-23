'use client';

import { useCallback, useRef, useState } from 'react';
import type { CrmDocumentMetadata } from '@/domain/crm';
import { deleteBudgetEntryDocument } from '@/application/use-cases/crm/deleteBudgetEntryDocument';
import { listBudgetEntryDocuments } from '@/application/use-cases/crm/listBudgetEntryDocuments';
import { downloadCrmProjectDocument } from '@/presentation/features/crmProjectDetail/downloadCrmProjectDocument';
import { notifyCrmProjectDocumentDownloadResult } from '@/presentation/features/crmProjectDetail/crmProjectDocumentDownloadFeedback';
import { crmRepositories } from '@/shared/di/container';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { mapCrmDocumentActionError } from '@/presentation/features/crmProjectDetail/crmDocumentActionErrors';
import { useCorePlatformDegraded } from '@/presentation/hooks/useCorePlatformDegraded';
import {
  performCrmDirectUploads,
  type CrmDirectUploadFileProgress,
} from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import type { UploadCaptureSource } from '@/presentation/features/crmDirectUpload/resolveUploadCaptureLocation';
import { useReportCrmDirectUploadStatus } from '@/presentation/components/CrmProjectDetail/CrmDirectUploadStatus';
export type BudgetEntryDocumentChangeHandlers = {
  onDocumentUploaded: (document: CrmDocumentMetadata) => void | Promise<void>;
  onDocumentDeleted: (documentId: string) => void | Promise<void>;
};

export function useBudgetEntryDocumentActions(
  input: {
    projectSlug: string;
    budgetEntryId: string;
    onError: (message: string) => void;
    onDemoDownloadBlocked: (message: string) => void;
  } & BudgetEntryDocumentChangeHandlers
): {
  uploading: boolean;
  uploadQueue: readonly CrmDirectUploadFileProgress[];
  fileInputRef: React.RefObject<HTMLInputElement>;
  cameraFileInputRef: React.RefObject<HTMLInputElement>;
  openFilePicker: () => void;
  openCameraPicker: () => void;
  uploadFiles: (files: readonly File[], captureSource?: UploadCaptureSource) => Promise<void>;
  uploadFile: (file: File, captureSource?: UploadCaptureSource) => Promise<void>;
  handleFileSelected: (
    e: React.ChangeEvent<HTMLInputElement>,
    captureSource?: UploadCaptureSource
  ) => Promise<void>;
  retryFailedUploads: () => Promise<void>;
  dismissUploadQueue: () => void;
  downloadDocument: (documentId: string, fileName: string) => Promise<void>;
  deleteDocument: (documentId: string) => Promise<void>;
} {
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<CrmDirectUploadFileProgress[]>([]);
  const failedFilesRef = useRef<File[]>([]);
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

  const dismissUploadQueue = useCallback(() => {
    setUploadQueue([]);
    failedFilesRef.current = [];
  }, []);

  const uploadFiles = useCallback(
    async (files: readonly File[], captureSource: UploadCaptureSource = 'files') => {
      if (files.length === 0) return;
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }

      setUploading(true);
      setUploadQueue([]);
      failedFilesRef.current = [];

      try {
        const result = await performCrmDirectUploads({
          files,
          uploadScope: {
            scope: 'budget_entry',
            projectSlug: input.projectSlug,
            budgetEntryId: input.budgetEntryId,
          },
          options: { captureSource },
          onFileProgress: (progress) => {
            setUploadQueue((current) => {
              const index = current.findIndex((item) => item.clientFileId === progress.clientFileId);
              if (index < 0) return [...current, progress];
              const next = [...current];
              next[index] = progress;
              return next;
            });
          },
        });

        failedFilesRef.current = result.failed
          .map((entry) => entry.file)
          .filter((file): file is File => file != null);

        if (result.succeeded.length > 0) {
          const documents = await listBudgetEntryDocuments(crmRepositories, {
            projectSlug: input.projectSlug,
            budgetEntryId: input.budgetEntryId,
          });
          for (const succeeded of result.succeeded) {
            const document = documents.find((doc) => doc.id === succeeded.documentId);
            if (document == null) {
              input.onError(wf.documentUploadFailed);
              continue;
            }
            await input.onDocumentUploaded(document);
          }
        }

        if (result.failed.length > 0 && result.succeeded.length === 0) {
          input.onError(result.failed[0]?.message ?? wf.documentUploadFailed);
        } else if (result.skipped.length > 0 && result.succeeded.length === 0) {
          input.onError(result.skipped[0]?.message ?? wf.documentUploadFailed);
        }
      } catch (err) {
        input.onError(err instanceof Error ? err.message : mapError(err));
      } finally {
        setUploading(false);
      }
    },
    [coreDegraded, input, mapError, wf.coreServicesUnavailable, wf.documentUploadFailed]
  );

  const uploadFile = useCallback(
    async (file: File, captureSource: UploadCaptureSource = 'files') => {
      await uploadFiles([file], captureSource);
    },
    [uploadFiles]
  );

  const retryFailedUploads = useCallback(async () => {
    const files = failedFilesRef.current;
    if (files.length === 0) return;
    await uploadFiles(files, 'files');
  }, [uploadFiles]);

  useReportCrmDirectUploadStatus({
    items: uploadQueue,
    running: uploading,
    onRetryFailed: () => {
      void retryFailedUploads();
    },
    onDismiss: dismissUploadQueue,
  });

  const handleFileSelected = useCallback(
    async (
      e: React.ChangeEvent<HTMLInputElement>,
      captureSource: UploadCaptureSource = 'files'
    ) => {
      const selected = e.target.files;
      const files =
        selected == null || selected.length === 0
          ? []
          : captureSource === 'camera'
            ? [selected[0]]
            : Array.from(selected);
      e.target.value = '';
      if (files.length === 0) return;
      await uploadFiles(files, captureSource);
    },
    [uploadFiles]
  );

  const downloadDocument = useCallback(
    async (documentId: string, fileName: string) => {
      if (coreDegraded) {
        input.onError(wf.coreServicesUnavailable);
        return;
      }
      try {
        const result = await downloadCrmProjectDocument(crmRepositories, {
          kind: 'budget_entry',
          projectSlug: input.projectSlug,
          budgetEntryId: input.budgetEntryId,
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
        await deleteBudgetEntryDocument(crmRepositories, {
          projectSlug: input.projectSlug,
          budgetEntryId: input.budgetEntryId,
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
    uploadQueue,
    fileInputRef,
    cameraFileInputRef,
    openFilePicker,
    openCameraPicker,
    uploadFiles,
    uploadFile,
    handleFileSelected,
    retryFailedUploads,
    dismissUploadQueue,
    downloadDocument,
    deleteDocument,
  };
}
