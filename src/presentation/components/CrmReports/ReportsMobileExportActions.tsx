'use client';

import type { ReactElement } from 'react';
import type { UseCrmReportsPdfExportResult } from '@/presentation/features/crmReports/useCrmReportsPdfExport';
import type { UseOrganizationExportResult } from '@/presentation/features/crmReports/useOrganizationExport';
import { OrganizationExportButton } from './OrganizationExportButton';
import { ReportsPdfExportControls } from './ReportsPdfExportControls';
import styles from './CrmReports.module.css';

export type ReportsMobileExportActionsProps = {
  readonly organizationExport: UseOrganizationExportResult;
  readonly pdfExport: UseCrmReportsPdfExportResult;
};

export function ReportsMobileExportActions({
  organizationExport,
  pdfExport,
}: ReportsMobileExportActionsProps): ReactElement {
  return (
    <div className={styles.reportsMobileExportRow}>
      <OrganizationExportButton exportState={organizationExport} />
      <ReportsPdfExportControls exportState={pdfExport} />
    </div>
  );
}
