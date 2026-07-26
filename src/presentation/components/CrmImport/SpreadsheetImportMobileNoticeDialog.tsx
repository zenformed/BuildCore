'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog';
import styles from './SpreadsheetImportMobileNoticeDialog.module.css';

export type SpreadsheetImportMobileNoticeDialogProps = {
  readonly isOpen: boolean;
  readonly onClose: () => void;
};

/** Mobile gate: keep Import visible, explain that the wizard needs a larger screen. */
export function SpreadsheetImportMobileNoticeDialog({
  isOpen,
  onClose,
}: SpreadsheetImportMobileNoticeDialogProps): ReactElement {
  const copy = content.crm.spreadsheetImport.mobileNotice;

  return (
    <CenterConfirmDialog
      isOpen={isOpen}
      title={copy.title}
      closeAriaLabel={copy.closeAriaLabel}
      cancelLabel={copy.gotIt}
      hideCancel
      confirmLabel={copy.gotIt}
      onConfirm={onClose}
      onClose={onClose}
      body={
        <div className={styles.body}>
          <p className={styles.paragraph}>{copy.bodyReview}</p>
          <p className={styles.paragraph}>{copy.bodyContinue}</p>
        </div>
      }
    />
  );
}
