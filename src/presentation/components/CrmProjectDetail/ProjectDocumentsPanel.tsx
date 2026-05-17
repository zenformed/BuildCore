'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import {
  formatDocumentKind,
  formatFileSize,
  formatShortDate,
} from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export type ProjectDocumentsPanelProps = {
  project: CrmProjectDetail;
};

export function ProjectDocumentsPanel({ project }: ProjectDocumentsPanelProps): ReactElement {
  const cols = content.projectDetail.documents.columns;
  const docs = project.documents;

  return (
    <section className={styles.card} aria-labelledby="project-documents-heading">
      <h3 id="project-documents-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.documents}
      </h3>
      <p className={styles.cardHelper}>{content.projectDetail.documents.uploadHint}</p>
      {docs.length === 0 ? (
        <p className={styles.subtitle}>{content.projectDetail.documents.empty}</p>
      ) : (
        <div className={styles.scrollContainer}>
          <div className={`${styles.tableHeader} ${styles.docGrid}`} role="row">
            <span role="columnheader">{cols.name}</span>
            <span role="columnheader">{cols.kind}</span>
            <span role="columnheader">{cols.stage}</span>
            <span role="columnheader">{cols.uploaded}</span>
            <span role="columnheader">{cols.status}</span>
          </div>
          {docs.map((doc) => (
            <div key={doc.id} className={`${styles.tableRow} ${styles.docGrid}`} role="row">
              <span className={styles.docName} title={doc.name}>
                {doc.name}
                <span className={styles.accountabilityMeta}> · {formatFileSize(doc.sizeBytes)}</span>
              </span>
              <span>{formatDocumentKind(doc.kind)}</span>
              <span>{doc.stageSlug ? formatStageLabel(doc.stageSlug) : '—'}</span>
              <span className={styles.uploadedCell}>
                {formatShortDate(doc.uploadedAt)}
                <TeamMemberAvatar member={doc.uploadedBy} />
              </span>
              <span>
                {doc.reviewedAt ? (
                  <span className={shared.docStatusReviewed}>{content.projectDetail.documents.statusReviewed}</span>
                ) : (
                  <span className={shared.docStatusPending}>{content.projectDetail.documents.statusPending}</span>
                )}
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
