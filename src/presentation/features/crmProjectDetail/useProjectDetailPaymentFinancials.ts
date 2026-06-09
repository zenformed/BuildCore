'use client';

import { useMemo } from 'react';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  computePaymentFinancialsFromTasks,
  computePaymentFinancialsWithChildren,
  getPaymentTasksForProject,
  type ProjectPaymentFinancials,
} from '@/domain/crm/projectPaymentValue';
import { useCrmPaymentTasksIndexContext } from '@/presentation/providers/CrmPaymentTasksIndexProvider';

export type UseProjectDetailPaymentFinancialsInput = {
  readonly project: CrmProjectDetail;
  readonly childSummaries: readonly CrmProjectSummary[] | null;
};

export function useProjectDetailPaymentFinancials({
  project,
  childSummaries,
}: UseProjectDetailPaymentFinancialsInput): ProjectPaymentFinancials {
  const { paymentTasksIndex } = useCrmPaymentTasksIndexContext();

  return useMemo(() => {
    const ownTasks = project.workflowTasks.map((task) => ({
      amountCents: task.amountCents,
      status: task.status,
      paidAt: task.paidAt ?? null,
    }));
    const isParentOverview =
      project.summary.parentProjectId == null && childSummaries != null;

    if (isParentOverview) {
      const childTasksList = childSummaries.map((child) =>
        getPaymentTasksForProject(paymentTasksIndex, child.id)
      );
      return computePaymentFinancialsWithChildren(ownTasks, childTasksList);
    }

    return computePaymentFinancialsFromTasks(ownTasks);
  }, [childSummaries, paymentTasksIndex, project]);
}
