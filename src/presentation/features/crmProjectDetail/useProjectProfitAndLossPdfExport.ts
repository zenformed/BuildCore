'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
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
  const [exporting, setExporting] = useState(false);

  const exportPdf = useCallback(async () => {
    if (exporting) return;
    setExporting(true);
    try {
      await exportProjectProfitAndLossPdf(project, { organizationName: shopName });
    } catch {
      onError(content.projectDetail.budget.pl.exportError);
    } finally {
      setExporting(false);
    }
  }, [exporting, onError, project, shopName]);

  return { exporting, exportPdf };
}
