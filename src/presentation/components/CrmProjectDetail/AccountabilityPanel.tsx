'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  AccountabilityLogTable,
  ACCOUNTABILITY_PREVIEW_LIMIT,
  sortAccountabilityEntries,
} from './AccountabilityLogTable';
import { AccountabilityListModal } from './AccountabilityListModal';
import styles from './ProjectDetail.module.css';

export type AccountabilityPanelProps = {
  project: CrmProjectDetail;
};

export function AccountabilityPanel({ project }: AccountabilityPanelProps): ReactElement {
  const acc = content.projectDetail.accountability;
  const [allOpen, setAllOpen] = useState(false);
  const entries = sortAccountabilityEntries(project.accountabilityLog);
  const hasMore = entries.length > ACCOUNTABILITY_PREVIEW_LIMIT;
  const previewEntries = hasMore ? entries.slice(0, ACCOUNTABILITY_PREVIEW_LIMIT) : entries;

  return (
    <section className={styles.accountabilityPanel} aria-labelledby="accountability-heading">
      <div className={styles.cardTitleRow}>
        <h3 id="accountability-heading" className={styles.cardTitle}>
          {content.projectDetail.sections.accountability}
        </h3>
      </div>
      {entries.length === 0 ? (
        <p className={styles.subtitle}>{acc.empty}</p>
      ) : (
        <AccountabilityLogTable entries={previewEntries} />
      )}
      {hasMore ? (
        <button
          type="button"
          className={styles.panelFooterLink}
          onClick={() => setAllOpen(true)}
        >
          {acc.viewAll}
        </button>
      ) : null}
      <AccountabilityListModal open={allOpen} project={project} onClose={() => setAllOpen(false)} />
    </section>
  );
}
