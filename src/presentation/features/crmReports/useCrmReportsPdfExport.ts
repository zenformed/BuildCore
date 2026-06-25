'use client';

import { useCallback, useMemo, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBranding } from '@/presentation/hooks/useBranding';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { listAvailableReportYears } from '@/reports/calculations/listAvailableReportYears';
import { exportCrmReportsPdf } from '@/reports/export/exportCrmReportsPdf';
import { exportCrmReportsSummaryPdf } from '@/reports/export/exportCrmReportsSummaryPdf';
import type { ReportPeriodId } from '@/reports/types/crmReportsDashboard';

export type ReportsPdfExportTarget =
  | { readonly kind: 'current' }
  | { readonly kind: 'year'; readonly year: number };

export type UseCrmReportsPdfExportResult = {
  readonly currentYear: number;
  readonly availableYears: readonly number[];
  readonly exportingTarget: ReportsPdfExportTarget | null;
  readonly exportCurrentReport: () => Promise<void>;
  readonly exportYear: (year: number) => Promise<void>;
  readonly canExport: boolean;
  readonly disabledInDemo: boolean;
  readonly disabledReason: string | null;
};

export function useCrmReportsPdfExport(
  projects: readonly CrmProjectDetail[] | null,
  period: ReportPeriodId
): UseCrmReportsPdfExportResult {
  const { shopName } = useBranding();
  const [exportingTarget, setExportingTarget] = useState<ReportsPdfExportTarget | null>(null);
  const currentYear = new Date().getFullYear();
  const disabledInDemo = isDemoRuntimeClient();
  const disabledReason = disabledInDemo ? content.demo.exportDisabledMessage : null;

  const availableYears = useMemo(() => {
    if (projects == null || projects.length === 0) return [currentYear] as const;
    return listAvailableReportYears(projects);
  }, [currentYear, projects]);

  const exportCurrentReport = useCallback(async () => {
    if (disabledInDemo || exportingTarget != null || projects == null || projects.length === 0) return;
    setExportingTarget({ kind: 'current' });
    try {
      await exportCrmReportsSummaryPdf(projects, {
        organizationName: shopName,
        periodId: period,
        periodLabel: content.reports.periods[period],
      });
    } catch {
      window.alert(content.reports.downloadPdfError);
    } finally {
      setExportingTarget(null);
    }
  }, [disabledInDemo, exportingTarget, period, projects, shopName]);

  const exportYear = useCallback(
    async (year: number) => {
      if (disabledInDemo || exportingTarget != null || projects == null || projects.length === 0) return;
      setExportingTarget({ kind: 'year', year });
      try {
        await exportCrmReportsPdf(projects, {
          organizationName: shopName,
          type: 'full_year',
          year,
        });
      } catch {
        window.alert(content.reports.downloadPdfError);
      } finally {
        setExportingTarget(null);
      }
    },
    [disabledInDemo, exportingTarget, projects, shopName]
  );

  return {
    currentYear,
    availableYears,
    exportingTarget,
    exportCurrentReport,
    exportYear,
    canExport: !disabledInDemo && projects != null && projects.length > 0,
    disabledInDemo,
    disabledReason,
  };
}
