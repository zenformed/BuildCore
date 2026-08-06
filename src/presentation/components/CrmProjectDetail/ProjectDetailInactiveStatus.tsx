'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { getCrmLossReasonLabel, isCrmProjectInactive } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectInactiveIcon, CrmProjectInactiveInlineLabel } from '@/presentation/components/CrmProjects/CrmProjectInactiveBadge';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import crmProjectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import styles from './ProjectDetail.module.css';

export type ProjectDetailInactiveStatusProps = {
  readonly project: CrmProjectSummary;
  readonly variant?: 'inline' | 'banner' | 'mobileBanner';
};

function closedStatusReasonLabel(project: CrmProjectSummary): string | null {
  if (project.status === 'lost' && project.lossReason != null) {
    return getCrmLossReasonLabel(project.lossReason, project.lossReasonOther);
  }
  return null;
}

export function ProjectDetailInactiveStatus({
  project,
  variant = 'inline',
}: ProjectDetailInactiveStatusProps): ReactElement | null {
  if (!isCrmProjectInactive(project)) {
    return null;
  }

  if (variant === 'mobileBanner') {
    const inactiveCopy = content.projectDetail.subprojects.markInactive;
    const reasonLabel = closedStatusReasonLabel(project);
    const badge =
      project.status === 'cancelled' ? 'Cancelled' : inactiveCopy.badge;
    const bannerText = reasonLabel
      ? `${badge.toUpperCase()}: ${reasonLabel}`
      : badge.toUpperCase();

    return (
      <div className={styles.detailInactiveMobileBanner} role="status" aria-live="polite">
        <CrmProjectInactiveIcon ariaLabel={badge} />
        <span className={styles.detailInactiveMobileBannerText}>{bannerText}</span>
      </div>
    );
  }

  if (variant === 'banner') {
    const inactiveCopy = content.projectDetail.subprojects.markInactive;
    const reasonLabel = closedStatusReasonLabel(project);
    const badge =
      project.status === 'cancelled' ? 'Cancelled' : inactiveCopy.badge;

    return (
      <div className={styles.detailInactiveBanner} role="status" aria-live="polite">
        <span className={`${shared.stagePill} ${crmProjectStyles.inactiveBadge} ${styles.detailInactiveBannerPill}`}>
          {badge}
        </span>
        {reasonLabel ? (
          <span className={styles.detailInactiveBannerReason}>
            {inactiveCopy.reasonLabel}: {reasonLabel}
          </span>
        ) : null}
      </div>
    );
  }

  return <CrmProjectInactiveInlineLabel project={project} />;
}
