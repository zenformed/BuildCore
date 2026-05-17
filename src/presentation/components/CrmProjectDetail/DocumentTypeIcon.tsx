'use client';

import type { ReactElement } from 'react';
import type { CrmDocumentKind } from '@/domain/crm';
import styles from './ProjectDetail.module.css';

const KIND_LABEL: Record<CrmDocumentKind, string> = {
  estimate: 'PDF',
  contract: 'DOC',
  photo: 'IMG',
  invoice: 'XLS',
  permit: 'PDF',
  inspection_report: 'RPT',
  other: 'FILE',
};

export type DocumentTypeIconProps = {
  kind: CrmDocumentKind;
};

export function DocumentTypeIcon({ kind }: DocumentTypeIconProps): ReactElement {
  const variantClass = styles[`docTypeIcon_${kind}`] ?? styles.docTypeIcon_other;
  return (
    <span className={`${styles.docTypeIcon} ${variantClass}`} aria-hidden>
      {KIND_LABEL[kind]}
    </span>
  );
}
