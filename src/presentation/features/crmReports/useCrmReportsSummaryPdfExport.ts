'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBranding } from '@/presentation/hooks/useBranding';
import { exportCrmReportsSummaryPdf } from '@/reports/export/exportCrmReportsSummaryPdf';
import type { ReportPeriodId } from '@/reports/types/crmReportsDashboard';

export type UseCrmReportsSummaryPdfExportResult = {
  readonly exporting: boolean;
  readonly exportPdf: () => Promise<void>;
};

export function useCrmReportsSummaryPdfExport(
  projects: readonly CrmProjectDetail[] | null,
  period: ReportPeriodId
): UseCrmReportsSummaryPdfExportResult {
  const { shopName } = useBranding();
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    if (exporting || projects == null || projects.length === 0) return;
    setExporting(true);
    try {
      await exportCrmReportsSummaryPdf(projects, {
        organizationName: shopName,
        periodId: period,
        periodLabel: content.reports.periods[period],
      });
    } catch {
      window.alert(content.reports.downloadPdfError);
    } finally {
      setExporting(false);
    }
  }, [exporting, period, projects, shopName]);

  return { exporting, exportPdf };
}
