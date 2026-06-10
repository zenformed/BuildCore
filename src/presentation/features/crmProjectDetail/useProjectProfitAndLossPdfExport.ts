'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBranding } from '@/presentation/hooks/useBranding';
import { exportProjectProfitAndLossPdf } from '@/reports';

export type UseProjectProfitAndLossPdfExportResult = {
  readonly exporting: boolean;
  readonly exportPdf: () => Promise<void>;
};

export function useProjectProfitAndLossPdfExport(
  project: CrmProjectDetail,
  onError: (message: string) => void
): UseProjectProfitAndLossPdfExportResult {
  const { shopName } = useBranding();
  const { childSummaries } = useProjectDetailShell();
  const { paymentTasksIndex, budgetEntriesIndex } = useCrmPaymentTasksIndexContext();
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportProjectProfitAndLossPdf(
        project,
        { organizationName: shopName },
        {
          childSummaries: childSummaries?.allRows ?? null,
          paymentTasksIndex,
          budgetEntriesIndex,
        }
      );
    } catch {
      onError(content.projectDetail.projectReport.exportError);
    } finally {
      setExporting(false);
    }
  }, [budgetEntriesIndex, childSummaries, exporting, onError, paymentTasksIndex, project, shopName]);

  return { exporting, exportPdf };
}
