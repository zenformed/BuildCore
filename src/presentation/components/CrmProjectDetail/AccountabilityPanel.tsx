'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export type AccountabilityPanelProps = {
  project: CrmProjectDetail;
};

function formatDateTime(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);
}

export function AccountabilityPanel({ project }: AccountabilityPanelProps): ReactElement {
  const cols = content.projectDetail.accountability.columns;
  const entries = [...project.accountabilityLog].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <section className={styles.accountabilityPanel} aria-labelledby="accountability-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="accountability-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.accountability}
        </h3>
      </div>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{content.projectDetail.accountability.empty}</p>
      ) : (
        <div className={styles.accountabilityTableWrap}>
          <div className={`${styles.tableHeader} ${styles.accountabilityGrid}`} role="row">
            <span role="columnheader">{cols.dateTime}</span>
            <span role="columnheader">{cols.user}</span>
            <span role="columnheader">{cols.event}</span>
            <span role="columnheader">{cols.entity}</span>
            <span role="columnheader">{cols.details}</span>
          </div>
          {entries.map((entry) => (
            <div key={entry.id} className={`${styles.tableRow} ${styles.accountabilityGrid}`} role="row">
              <span className={styles.accountabilityDate}>{formatDateTime(entry.at)}</span>
              <span className={styles.accountabilityUser}>
                <TeamMemberAvatar member={entry.actor} />
                <span>{entry.actor.displayName}</span>
              </span>
              <span className={styles.accountabilityEvent}>{entry.action.split('—')[0]?.trim() ?? entry.action}</span>
              <span>{entry.stageSlug ? formatStageLabel(entry.stageSlug) : '—'}</span>
              <span className={styles.accountabilityDetails}>{entry.action}</span>
            </div>
          ))}
        </div>
      )}
      <p className={styles.panelFooterLink}>{content.projectDetail.accountability.viewAll}</p>
    </section>
  );
}
