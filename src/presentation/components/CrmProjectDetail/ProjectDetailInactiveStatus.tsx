'use client';

import type { ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { getCrmInactiveReasonLabel, isCrmProjectInactive } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectInactiveInlineLabel } from '@/presentation/components/CrmProjects/CrmProjectInactiveBadge';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import crmProjectStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import styles from './ProjectDetail.module.css';

export type ProjectDetailInactiveStatusProps = {
  readonly project: CrmProjectSummary;
  readonly variant?: 'inline' | 'banner';
};

export function ProjectDetailInactiveStatus({
  project,
  variant = 'inline',
}: ProjectDetailInactiveStatusProps): ReactElement | null {
  if (!isCrmProjectInactive(project)) {
    return null;
  }

  if (variant === 'banner') {
    const inactiveCopy = content.projectDetail.subprojects.markInactive;
    const reasonLabel =
      project.inactiveReason != null
        ? getCrmInactiveReasonLabel(project.inactiveReason, project.inactiveReasonCustom)
        : null;

    return (
      <div className={styles.detailInactiveBanner} role="status" aria-live="polite">
        <span className={`${shared.stagePill} ${crmProjectStyles.inactiveBadge} ${styles.detailInactiveBannerPill}`}>
          {inactiveCopy.badge}
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
