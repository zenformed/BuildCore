'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS } from '@/domain/crm/buildCoreUploadPolicy';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  performCrmDirectUploads,
  type CrmDirectUploadFileProgress,
} from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { CrmDirectUploadQueue } from './CrmDirectUploadQueue';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import styles from './DocumentPanelUploadButton.module.css';

export type DocumentPanelUploadButtonProps = {
  readonly projectSlug: string;
  readonly onRefresh: () => Promise<void>;
  readonly onError?: (message: string) => void;
};

export function DocumentPanelUploadButton({
  projectSlug,
  onRefresh,
  onError,
}: DocumentPanelUploadButtonProps): ReactElement {
  const wf = content.projectDetail.workflow;
  const { guardProjectEdit } = useProjectDetailShell();
  const [uploading, setUploading] = useState(false);
  const [uploadQueue, setUploadQueue] = useState<CrmDirectUploadFileProgress[]>([]);
  const failedFilesRef = useRef<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const runUpload = async (files: readonly File[]): Promise<void> => {
    if (files.length === 0) return;
    setUploading(true);
    setUploadQueue([]);
    failedFilesRef.current = [];
    try {
      const result = await performCrmDirectUploads({
        files,
        uploadScope: {
          scope: 'project_media',
          projectSlug,
        },
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
        await onRefresh();
      }
      if (result.failed.length > 0 && result.succeeded.length === 0) {
        onError?.(result.failed[0]?.message ?? wf.documentUploadFailed);
      } else if (result.skipped.length > 0 && result.succeeded.length === 0) {
        onError?.(result.skipped[0]?.message ?? wf.documentUploadFailed);
      }
    } catch (err) {
      onError?.(err instanceof Error ? err.message : wf.documentUploadFailed);
    } finally {
      setUploading(false);
    }
  };

  const handleUploadSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const selected = event.target.files;
    const files = selected == null || selected.length === 0 ? [] : Array.from(selected);
    event.target.value = '';
    if (files.length === 0) return;
    await runUpload(files);
  };

  return (
    <span className={styles.uploadControl}>
      <DetailPanelHeaderButton
        variant="add"
        title={uploading ? wf.taskSubmitting : wf.documentsUpload}
        aria-label={wf.documentsUpload}
        disabled={uploading}
        onClick={() => {
          guardProjectEdit(() => {
            fileInputRef.current?.click();
          });
        }}
      />
      <input
        ref={fileInputRef}
        type="file"
        accept={BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS.join(',')}
        multiple
        hidden
        onChange={(event) => void handleUploadSelected(event)}
      />
      <span className={styles.queueAnchor}>
        <CrmDirectUploadQueue
          items={uploadQueue}
          running={uploading}
          onRetryFailed={() => {
            void runUpload(failedFilesRef.current);
          }}
          onDismiss={() => {
            setUploadQueue([]);
            failedFilesRef.current = [];
          }}
        />
      </span>
    </span>
  );
}
