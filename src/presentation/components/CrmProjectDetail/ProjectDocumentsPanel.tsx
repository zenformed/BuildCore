'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  documentCompletionLabel,
  filterDocumentPanelItems,
  type DocumentPanelFilter,
} from '@/presentation/features/crmProjectDetail/documentPanelModel';
import {
  formatDocumentKind,
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { DocumentTypeIcon } from './DocumentTypeIcon';
import styles from './ProjectDetail.module.css';

const FILTERS: readonly { id: DocumentPanelFilter; label: string }[] = [
  { id: 'all', label: content.projectDetail.documents.filters.all },
  { id: 'pendingReview', label: content.projectDetail.documents.filters.pendingReview },
  { id: 'uploaded', label: content.projectDetail.documents.filters.uploaded },
  { id: 'missing', label: content.projectDetail.documents.filters.missing },
] as const;

export type ProjectDocumentsPanelProps = {
  project: CrmProjectDetail;
};

export function ProjectDocumentsPanel({ project }: ProjectDocumentsPanelProps): ReactElement {
  const docsContent = content.projectDetail.documents;
  const [filter, setFilter] = useState<DocumentPanelFilter>('all');

  const items = useMemo(
    () => filterDocumentPanelItems(project.documents, project.workflowTasks, filter),
    [filter, project.documents, project.workflowTasks]
  );

  return (
    <section className={styles.documentsPanel} aria-labelledby="project-documents-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="project-documents-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.documents}
        </h3>
      </div>
      <p className={styles.cardHelper}>{docsContent.uploadHint}</p>
      <div className={styles.docFilterRow} role="tablist" aria-label={docsContent.filterAriaLabel}>
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={filter === tab.id}
            className={filter === tab.id ? styles.docFilterTab_active : styles.docFilterTab}
            onClick={() => setFilter(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      {items.length === 0 ? (
        <div className={styles.docEmptyState}>
          <p className={styles.subtitle}>{docsContent.empty}</p>
          <ul className={styles.docPlaceholderList}>
            {docsContent.placeholders.map((label) => (
              <li key={label} className={styles.docPlaceholderItem}>
                <span className={styles.docTypeIcon}>PDF</span>
                <span>
                  <span className={styles.docItemName}>{label}</span>
                  <span className={styles.docItemMeta}>{docsContent.placeholderMeta}</span>
                </span>
                <span className={styles.docCompletionMissing}>0/1</span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className={styles.docList}>
          {items.map((item) => {
            if (item.kind === 'missing') {
              return (
                <li key={`missing-${item.task.id}`} className={styles.docListItem}>
                  <span className={styles.docTypeIcon}>—</span>
                  <div className={styles.docItemBody}>
                    <span className={styles.docItemName}>{item.task.title}</span>
                    <span className={styles.docItemMeta}>
                      {docsContent.missingForTask} · {formatStageLabel(item.task.stageSlug)}
                    </span>
                  </div>
                  <span className={styles.docCompletionMissing}>0/1</span>
                </li>
              );
            }

            const doc = item.document;
            const completion = documentCompletionLabel(doc);
            const isComplete = doc.reviewedAt != null;

            return (
              <li key={doc.id} className={styles.docListItem}>
                <DocumentTypeIcon kind={doc.kind} />
                <div className={styles.docItemBody}>
                  <span className={styles.docItemName} title={doc.name}>
                    {doc.name}
                  </span>
                  <span className={styles.docItemMeta}>
                    {formatDocumentKind(doc.kind)} ·{' '}
                    {doc.stageSlug ? formatStageLabel(doc.stageSlug) : docsContent.noStage}
                    {doc.uploadedAt ? ` · ${formatShortDate(doc.uploadedAt)}` : null}
                    {` · ${formatFileSize(doc.sizeBytes)}`}
                  </span>
                </div>
                <span className={isComplete ? styles.docCompletionDone : styles.docCompletionMissing}>
                  {completion}
                </span>
                <span className={styles.docItemStatus}>
                  {doc.reviewedAt ? (
                    <span className={shared.docStatusReviewed}>{docsContent.statusReviewed}</span>
                  ) : (
                    <span className={shared.docStatusPending}>{docsContent.statusPending}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      )}
      <p className={styles.panelFooterLink}>{docsContent.viewAll}</p>
    </section>
  );
}
