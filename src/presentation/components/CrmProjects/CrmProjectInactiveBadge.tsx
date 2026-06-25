'use client';

import type { ReactElement } from 'react';
import { BsSlashCircle } from 'react-icons/bs';
import type { CrmProjectSummary } from '@/domain/crm';
import { getCrmInactiveReasonLabel } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectInactiveIconProps = {
  readonly ariaLabel: string;
};

export function CrmProjectInactiveIcon({ ariaLabel }: CrmProjectInactiveIconProps): ReactElement {
  return (
    <span className={shared.statusCircleIconSlot} aria-label={ariaLabel} title={ariaLabel} role="img">
      <BsSlashCircle className={shared.statusCircleIcon_inactive} size={16} aria-hidden />
    </span>
  );
}

export type CrmProjectInactiveInlineLabelProps = {
  readonly project: CrmProjectSummary;
};

export function CrmProjectInactiveInlineLabel({
  project,
}: CrmProjectInactiveInlineLabelProps): ReactElement | null {
  if (project.subprojectStatus !== 'inactive') return null;

  const tableCopy = content.crm.table;
  const reasonLabel =
    project.inactiveReason != null
      ? getCrmInactiveReasonLabel(project.inactiveReason, project.inactiveReasonCustom)
      : null;

  return (
    <span className={styles.inactiveInlineLabel}>
      <span className={`${shared.stagePill} ${styles.inactiveBadge}`}>{tableCopy.inactiveBadge}</span>
      {reasonLabel ? (
        <span className={styles.inactiveInlineReason} title={reasonLabel}>
          {reasonLabel}
        </span>
      ) : null}
    </span>
  );
}
