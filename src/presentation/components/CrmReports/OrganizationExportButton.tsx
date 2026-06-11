'use client';

import type { ReactElement } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { UseOrganizationExportResult } from '@/presentation/features/crmReports/useOrganizationExport';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';

export type OrganizationExportButtonProps = {
  readonly exportState: UseOrganizationExportResult;
};

export function OrganizationExportButton({
  exportState,
}: OrganizationExportButtonProps): ReactElement | null {
  const { canExport, isExporting, exportOrganization } = exportState;
  const copy = content.reports.organizationExport;

  if (!canExport) return null;

  return (
    <button
      type="button"
      className={projectStyles.stageChip}
      aria-label={copy.buttonLabel}
      disabled={isExporting}
      onClick={() => {
        void exportOrganization();
      }}
    >
      <span className={projectStyles.detailPanelHeaderBtnIcon_download} aria-hidden />
      {isExporting ? copy.exporting : copy.buttonLabel}
    </button>
  );
}
