'use client';

import type { ReactElement } from 'react';
import type { CrmDocumentKind } from '@/domain/crm';
import styles from './ProjectDetail.module.css';

const KIND_ICON: Record<CrmDocumentKind, string> = {
  estimate: 'PDF',
  contract: 'DOC',
  photo: 'IMG',
  invoice: 'XLS',
  permit: 'PDF',
  inspection_report: 'PDF',
  other: 'FILE',
};

export type DocumentTypeIconProps = {
  kind: CrmDocumentKind;
};

export function DocumentTypeIcon({ kind }: DocumentTypeIconProps): ReactElement {
  return (
    <span className={styles.docTypeIcon} aria-hidden>
      {KIND_ICON[kind]}
    </span>
  );
}
