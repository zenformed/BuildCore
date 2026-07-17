'use client';

import type { ChangeEvent, ReactElement } from 'react';
import { useRef, useState } from 'react';
import { BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS } from '@/domain/crm/buildCoreUploadPolicy';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { performCrmDirectUpload } from '@/presentation/features/crmDirectUpload/performBuildCoreDirectUpload';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';

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
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUploadSelected = async (event: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    setUploading(true);
    try {
      await performCrmDirectUpload(file, {
        scope: 'project_media',
        projectSlug,
      });
      await onRefresh();
    } catch (err) {
      onError?.(err instanceof Error ? err.message : wf.documentUploadFailed);
    } finally {
      setUploading(false);
    }
  };

  return (
    <>
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
        hidden
        onChange={(event) => void handleUploadSelected(event)}
      />
    </>
  );
}
