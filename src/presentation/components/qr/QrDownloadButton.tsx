'use client';

import type { ReactElement } from 'react';
import { useCallback, useRef } from 'react';
import { QRCodeCanvas } from 'qrcode.react';
import { downloadCanvasPng } from '@/presentation/features/qr/downloadQrCodePng';
import styles from '@/presentation/components/qr/QrCode.module.css';

export type QrDownloadButtonProps = {
  readonly value: string;
  readonly fileName: string;
  readonly label: string;
  readonly disabled?: boolean;
  readonly downloadSize?: number;
};

export function QrDownloadButton({
  value,
  fileName,
  label,
  disabled = false,
  downloadSize = 1024,
}: QrDownloadButtonProps): ReactElement {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const handleDownload = useCallback(() => {
    const canvas = canvasRef.current;
    if (canvas == null) return;
    downloadCanvasPng(canvas, fileName);
  }, [fileName]);

  return (
    <>
      <button type="button" className={styles.qrActionBtn} disabled={disabled} onClick={handleDownload}>
        {label}
      </button>
      <div className={styles.qrCodeDownloadHost} aria-hidden>
        <QRCodeCanvas
          ref={canvasRef}
          value={value}
          size={downloadSize}
          level="M"
          includeMargin
        />
      </div>
    </>
  );
}
