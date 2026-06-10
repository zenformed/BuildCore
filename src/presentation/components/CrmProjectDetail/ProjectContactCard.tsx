'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatRelativeUpdatedAt,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import styles from './ProjectDetail.module.css';

export type ProjectContactCardProps = {
  project: CrmProjectDetail;
};

export function ProjectContactCard({ project }: ProjectContactCardProps): ReactElement {
  const { summary, notes } = project;
  const { isMemberRole } = useProjectDetailShell();
  const displayEmail = formatContactEmailDisplay(summary.contact.email, { maskForMember: isMemberRole });

  return (
    <section className={styles.card} aria-labelledby="project-contact-heading">
      <h3 id="project-contact-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.contact}
      </h3>
      <p className={styles.customerName}>{summary.client.name}</p>
      <dl className={styles.dl}>
        <div className={styles.dlRow}>
          <dt>{content.projectDetail.fields.contact}</dt>
          <dd>{summary.contact.name}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{content.projectDetail.fields.email}</dt>
          <dd>{displayEmail || '—'}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{content.projectDetail.fields.phone}</dt>
          <dd>{formatPhoneDisplay(summary.contact.phone) || '—'}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{content.projectDetail.fields.assigned}</dt>
          <dd>{summary.assignedTo?.displayName ?? content.projectDetail.unassigned}</dd>
        </div>
        <div className={styles.dlRow}>
          <dt>{content.projectDetail.fields.updated}</dt>
          <dd>{formatRelativeUpdatedAt(summary.lastUpdatedAt)}</dd>
        </div>
      </dl>
      {notes ? <p className={styles.notesBlock}>{notes}</p> : null}
    </section>
  );
}
