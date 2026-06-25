'use client';

import type { ReactElement } from 'react';
import { CloseIcon } from '@/platform/icons/buildCoreDashboardShellIcons';
import { QrCodeCard } from '@/presentation/components/qr/QrCodeCard';
import { QrDownloadButton } from '@/presentation/components/qr/QrDownloadButton';
import type { QrCopyLinkFeedback } from '@/presentation/features/qr/useQrCodeLink';
import styles from '@/presentation/components/qr/QrCode.module.css';

export type QrCodeDialogMetaRow = {
  readonly label: string;
  readonly value: string;
  readonly variant?: 'default' | 'url';
};

export type QrCodeDialogProps = {
  readonly open: boolean;
  readonly title: string;
  readonly closeAriaLabel: string;
  readonly qrValue: string;
  readonly qrAriaLabel: string;
  readonly subtitle?: string;
  readonly metaRows: readonly QrCodeDialogMetaRow[];
  readonly helperText: string;
  readonly downloadLabel: string;
  readonly downloadFileName: string;
  readonly copyLinkLabel: string;
  readonly copyLinkSuccessLabel: string;
  readonly copyLinkErrorLabel: string;
  readonly copyFeedback: QrCopyLinkFeedback;
  readonly onClose: () => void;
  readonly onCopyLink: () => void;
};

export function QrCodeDialog({
  open,
  title,
  closeAriaLabel,
  qrValue,
  qrAriaLabel,
  subtitle,
  metaRows,
  helperText,
  downloadLabel,
  downloadFileName,
  copyLinkLabel,
  copyLinkSuccessLabel,
  copyLinkErrorLabel,
  copyFeedback,
  onClose,
  onCopyLink,
}: QrCodeDialogProps): ReactElement | null {
  if (!open) return null;

  return (
    <div className={styles.qrDialogOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.qrDialogPanel}
        role="dialog"
        aria-modal="true"
        aria-labelledby="qr-code-dialog-title"
        onClick={(event) => event.stopPropagation()}
      >
        <div className={styles.qrDialogHeader}>
          <h2 id="qr-code-dialog-title" className={styles.qrDialogTitle}>
            {title}
          </h2>
          <button
            type="button"
            className={styles.qrDialogCloseBtn}
            aria-label={closeAriaLabel}
            onClick={onClose}
          >
            <CloseIcon />
          </button>
        </div>

        <div className={styles.qrDialogBody}>
          <QrCodeCard value={qrValue} ariaLabel={qrAriaLabel} />

          {subtitle ? <p className={styles.qrDialogSubtitle}>{subtitle}</p> : null}

          {metaRows.length > 0 ? (
            <dl className={styles.qrDialogMeta}>
              {metaRows.map((row) => (
                <div key={row.label} className={styles.qrDialogMetaRow}>
                  <dt className={styles.qrDialogMetaLabel}>{row.label}</dt>
                  <dd
                    className={[
                      styles.qrDialogMetaValue,
                      row.variant === 'url' ? styles.qrDialogMetaValue_url : '',
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  >
                    {row.value}
                  </dd>
                </div>
              ))}
            </dl>
          ) : null}

          <p className={styles.qrDialogHelper}>{helperText}</p>

          {copyFeedback != null ? (
            <p
              className={[
                styles.qrDialogFeedback,
                copyFeedback === 'success' ? styles.qrDialogFeedback_success : styles.qrDialogFeedback_error,
              ]
                .filter(Boolean)
                .join(' ')}
              role="status"
            >
              {copyFeedback === 'success' ? copyLinkSuccessLabel : copyLinkErrorLabel}
            </p>
          ) : null}

          <div className={styles.qrDialogActions}>
            <QrDownloadButton
              value={qrValue}
              fileName={downloadFileName}
              label={downloadLabel}
            />
            <button type="button" className={styles.qrActionBtn} onClick={onCopyLink}>
              {copyLinkLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
