import type { CrmProjectSummary } from '@/domain/crm';
import {
  computePaymentFinancialsFromTasks,
  computePaymentFinancialsWithChildren,
  getPaymentTasksForProject,
  type CrmProjectPaymentTasksIndex,
  type ProjectPaymentFinancials,
} from '@/domain/crm/projectPaymentValue';

export function resolveDashboardRootRowFinancials(
  root: CrmProjectSummary,
  visibleChildren: readonly CrmProjectSummary[],
  paymentTasksIndex: CrmProjectPaymentTasksIndex
): ProjectPaymentFinancials {
  const parentTasks = getPaymentTasksForProject(paymentTasksIndex, root.id);
  const childTasksList = visibleChildren.map((child) =>
    getPaymentTasksForProject(paymentTasksIndex, child.id)
  );
  return computePaymentFinancialsWithChildren(parentTasks, childTasksList);
}

export function resolveDashboardChildRowFinancials(
  child: CrmProjectSummary,
  paymentTasksIndex: CrmProjectPaymentTasksIndex
): ProjectPaymentFinancials {
  const tasks = getPaymentTasksForProject(paymentTasksIndex, child.id);
  return computePaymentFinancialsFromTasks(tasks);
}
