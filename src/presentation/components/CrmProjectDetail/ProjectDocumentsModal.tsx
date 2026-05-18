'use client';

import type { ReactElement } from 'react';
import { useEffect } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ProjectDocumentsPanelContent } from './ProjectDocumentsPanelContent';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsModalProps = {
  open: boolean;
  project: CrmProjectDetail;
  onClose: () => void;
};

export function ProjectDocumentsModal({
  open,
  project,
  onClose,
}: ProjectDocumentsModalProps): ReactElement | null {
  const docsContent = content.projectDetail.documents;

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={styles.detailListModalOverlay} onClick={onClose} role="presentation">
      <div
        className={styles.detailListModal}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="project-documents-modal-title"
      >
        <div className={styles.detailListModalHeader}>
          <h2 id="project-documents-modal-title" className={styles.detailListModalTitle}>
            {content.projectDetail.sections.documents}
          </h2>
          <button type="button" className={styles.detailListModalClose} onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className={styles.detailListModalBody}>
          <ProjectDocumentsPanelContent project={project} />
        </div>
      </div>
    </div>
  );
}
