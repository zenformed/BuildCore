'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatStageLabel } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { formatShortDate } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { TeamMemberAvatar } from './TeamMemberAvatar';
import styles from './ProjectDetail.module.css';

export type AccountabilityPanelProps = {
  project: CrmProjectDetail;
};

export function AccountabilityPanel({ project }: AccountabilityPanelProps): ReactElement {
  const entries = [...project.accountabilityLog].sort(
    (a, b) => new Date(b.at).getTime() - new Date(a.at).getTime()
  );

  return (
    <section className={styles.card} aria-labelledby="accountability-heading">
      <h3 id="accountability-heading" className={styles.cardTitle}>
        {content.projectDetail.sections.accountability}
      </h3>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{content.projectDetail.accountability.empty}</p>
      ) : (
        <ul className={styles.accountabilityList}>
          {entries.map((entry) => (
            <li key={entry.id} className={styles.accountabilityItem}>
              <TeamMemberAvatar member={entry.actor} />
              <div>
                <div>{entry.action}</div>
                <div className={styles.accountabilityMeta}>
                  {entry.actor.displayName} · {formatShortDate(entry.at)}
                  {entry.stageSlug ? ` · ${formatStageLabel(entry.stageSlug)}` : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
