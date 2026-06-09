'use client';

import { useEffect, useMemo, useState } from 'react';
import type { CrmProjectDetail, CrmProjectSummary } from '@/domain/crm';
import {
  computePaymentFinancialsFromTasks,
  computePaymentFinancialsWithChildren,
  getPaymentTasksForProject,
  type CrmProjectPaymentTasksIndex,
  type ProjectPaymentFinancials,
} from '@/domain/crm/projectPaymentValue';
import {
  loadCrmProjectPaymentTasksIndex,
  loadCrmProjectPaymentTasksIndexSync,
} from '@/application/use-cases/crm/loadCrmProjectPaymentTasksIndex';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { crmRepositories } from '@/shared/di/container';

export type UseProjectDetailPaymentFinancialsInput = {
  readonly project: CrmProjectDetail;
  readonly childSummaries: readonly CrmProjectSummary[] | null;
};

export function useProjectDetailPaymentFinancials({
  project,
  childSummaries,
}: UseProjectDetailPaymentFinancialsInput): ProjectPaymentFinancials {
  const isApiSource = getCrmDataSource() === 'api';
  const [paymentTasksIndex, setPaymentTasksIndex] = useState<CrmProjectPaymentTasksIndex | null>(
    () => (isApiSource ? null : loadCrmProjectPaymentTasksIndexSync(crmRepositories))
  );

  useEffect(() => {
    if (!isApiSource) {
      setPaymentTasksIndex(loadCrmProjectPaymentTasksIndexSync(crmRepositories));
      return;
    }
    let cancelled = false;
    void loadCrmProjectPaymentTasksIndex(crmRepositories).then((index) => {
      if (!cancelled) setPaymentTasksIndex(index);
    });
    return () => {
      cancelled = true;
    };
  }, [isApiSource, project.summary.id, project.workflowTasks]);

  return useMemo(() => {
    const index = paymentTasksIndex ?? new Map<string, never>();
    const ownTasks = project.workflowTasks.map((task) => ({
      amountCents: task.amountCents,
      status: task.status,
      paidAt: task.paidAt ?? null,
    }));
    const isParentOverview =
      project.summary.parentProjectId == null && childSummaries != null;

    if (isParentOverview) {
      const childTasksList = childSummaries.map((child) =>
        getPaymentTasksForProject(index, child.id)
      );
      return computePaymentFinancialsWithChildren(ownTasks, childTasksList);
    }

    return computePaymentFinancialsFromTasks(ownTasks);
  }, [childSummaries, paymentTasksIndex, project]);
}
