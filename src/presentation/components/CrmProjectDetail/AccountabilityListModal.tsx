'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  AccountabilityLogTable,
  sortAccountabilityEntries,
} from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export type AccountabilityListModalProps = {
  open: boolean;
  project: CrmProjectDetail;
  onClose: () => void;
};

export function AccountabilityListModal({
  open,
  project,
  onClose,
}: AccountabilityListModalProps): ReactElement | null {
  const acc = content.projectDetail.accountability;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const entries = sortAccountabilityEntries(project.accountabilityLog);

  return (
    <div className={styles.detailListModalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.detailListModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="accountability-all-title"
      >
        <div className={styles.detailListModalHeader}>
          <h2 id="accountability-all-title" className={styles.detailListModalTitle}>
            {acc.allEntriesTitle}
          </h2>
          <button type="button" className={styles.detailListModalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.detailListModalBody}>
          {entries.length === 0 ? (
            <p className={styles.subtitle}>{acc.empty}</p>
          ) : (
            <AccountabilityLogTable entries={entries} layout="modal" />
          )}
        </div>
      </div>
    </div>
  );
}
