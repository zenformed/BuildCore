'use client';

import type { ReactElement } from 'react';
import { useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useAccountabilityPreviewLimit } from '@/presentation/features/crmProjectDetail/useAccountabilityPreviewLimit';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import { AccountabilityListModal } from './AccountabilityListModal';
import styles from './ProjectDetail.module.css';

export type AccountabilityPanelProps = {
  project: CrmProjectDetail;
};

export function AccountabilityPanel({ project }: AccountabilityPanelProps): ReactElement {
  const acc = content.projectDetail.accountability;
  const [allOpen, setAllOpen] = useState(false);
  const previewLimit = useAccountabilityPreviewLimit();
  const entries = sortAccountabilityEntries(project.accountabilityLog);
  const hasMore = entries.length > previewLimit;
  const previewEntries = hasMore ? entries.slice(0, previewLimit) : entries;

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
        <div className={styles.accountabilityPanelFooter}>
          <button
            type="button"
            className={styles.panelFooterLink}
            onClick={() => setAllOpen(true)}
          >
            {acc.viewAll}
          </button>
        </div>
      ) : null}
      <AccountabilityListModal open={allOpen} project={project} onClose={() => setAllOpen(false)} />
    </section>
  );
}
