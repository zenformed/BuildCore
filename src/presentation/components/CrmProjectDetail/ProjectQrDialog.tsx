'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { QrCodeDialog } from '@/presentation/components/qr/QrCodeDialog';
import { useProjectQrCode } from '@/presentation/features/qr/useProjectQrCode';

export type ProjectQrDialogProps = {
  readonly open: boolean;
  readonly project: CrmProjectSummary;
  readonly onClose: () => void;
};

export function ProjectQrDialog({ open, project, onClose }: ProjectQrDialogProps): ReactElement {
  const copy = content.projectDetail.qrCode;
  const { leadUrl, copyLink, copyFeedback, downloadFileName, qrAriaLabel } = useProjectQrCode(project);

  return (
    <QrCodeDialog
      open={open}
      title={copy.title}
      closeAriaLabel={copy.closeAriaLabel}
      qrValue={leadUrl}
      qrAriaLabel={qrAriaLabel}
      subtitle={project.name}
      metaRows={[]}
      helperText={copy.helperText}
      downloadLabel={copy.downloadPng}
      downloadFileName={downloadFileName}
      copyLinkLabel={copy.copyLink}
      copyLinkSuccessLabel={copy.copyLinkSuccess}
      copyLinkErrorLabel={copy.copyLinkError}
      copyFeedback={copyFeedback}
      onClose={onClose}
      onCopyLink={() => {
        void copyLink();
      }}
    />
  );
}
