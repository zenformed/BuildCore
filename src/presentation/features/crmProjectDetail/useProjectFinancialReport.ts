'use client';

import { useMemo } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildProjectFinancialReportData } from '@/reports/builders/buildProjectFinancialReportData';
import type { ProjectFinancialReportData } from '@/reports/types/projectFinancialReport';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useBranding } from '@/presentation/hooks/useBranding';

export function useProjectFinancialReport(project: CrmProjectDetail): ProjectFinancialReportData {
  const { childSummaries } = useProjectDetailShell();
  const { paymentTasksIndex, budgetEntriesIndex } = useCrmPaymentTasksIndexContext();
  const { shopName } = useBranding();

  return useMemo(
    () =>
      buildProjectFinancialReportData({
        project,
        childSummaries: childSummaries?.allRows ?? null,
        paymentTasksIndex,
        budgetEntriesIndex,
        context: { organizationName: shopName },
      }),
    [budgetEntriesIndex, childSummaries, paymentTasksIndex, project, shopName]
  );
}
