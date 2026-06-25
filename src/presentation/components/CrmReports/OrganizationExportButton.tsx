'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { UseOrganizationExportResult } from '@/presentation/features/crmReports/useOrganizationExport';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type OrganizationExportButtonProps = {
  readonly exportState: UseOrganizationExportResult;
};

export function OrganizationExportButton({
  exportState,
}: OrganizationExportButtonProps): ReactElement | null {
  const { canExport, disabledInDemo, isExporting, exportOrganization } = exportState;
  const copy = content.reports.organizationExport;

  if (!canExport && !disabledInDemo) return null;

  return (
    <button
      type="button"
      className={`${projectStyles.stageChip} ${styles.reportsMenuTrigger}`}
      aria-label={copy.buttonLabel}
      disabled={disabledInDemo || isExporting}
      onClick={() => {
        void exportOrganization();
      }}
    >
      <span className={projectStyles.detailPanelHeaderBtnIcon_download} aria-hidden />
      {isExporting ? copy.exporting : copy.buttonLabel}
    </button>
  );
}
