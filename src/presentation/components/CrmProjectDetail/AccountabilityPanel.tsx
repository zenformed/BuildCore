'use client';

import type { ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { useAccountabilityPreviewLimit } from '@/presentation/features/crmProjectDetail/useAccountabilityPreviewLimit';
import { AccountabilityLogTable, sortAccountabilityEntries } from './AccountabilityLogTable';
import styles from './ProjectDetail.module.css';

export type AccountabilityPanelProps = {
  project: CrmProjectDetail;
};

export function AccountabilityPanel({ project }: AccountabilityPanelProps): ReactElement {
  const router = useRouter();
  const acc = content.projectDetail.accountability;
  const previewLimit = useAccountabilityPreviewLimit();
  const entries = sortAccountabilityEntries(project.accountabilityLog);
  const hasMore = entries.length > previewLimit;
  const previewEntries = hasMore ? entries.slice(0, previewLimit) : entries;
  const showViewAllLink = entries.length > 0;

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
      {showViewAllLink ? (
        <div className={styles.accountabilityPanelFooter}>
          <button
            type="button"
            className={styles.panelFooterLink}
            onClick={() => router.push(nav.routes.projectAccountability(project.summary.slug))}
          >
            {acc.viewAll}
          </button>
        </div>
      ) : null}
    </section>
  );
}
