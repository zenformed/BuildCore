'use client';

import type { ReactElement } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import styles from './QrCode.module.css';

export type QrCodeCardProps = {
  readonly value: string;
  readonly ariaLabel: string;
  readonly displaySize?: number;
};

export function QrCodeCard({
  value,
  ariaLabel,
  displaySize = 220,
}: QrCodeCardProps): ReactElement {
  return (
    <div className={styles.qrCodeCard}>
      <div className={styles.qrCodeDisplay}>
        <QRCodeSVG
          value={value}
          size={displaySize}
          level="M"
          includeMargin
          role="img"
          aria-label={ariaLabel}
          className={styles.qrCodeSvg}
        />
      </div>
    </div>
  );
}
