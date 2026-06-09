import {
  isPaymentWorkflowTask,
  isUnpaidPaymentTask,
  type PaymentBalanceTask,
} from './paymentWorkflow';

export type ProjectPaymentFinancials = {
  readonly valueCents: number;
  readonly balanceDueCents: number;
};

/** Sum of payment milestone amounts; $0 when there are no payment milestones. */
export function computeProjectValueFromPayments(
  tasks: readonly PaymentBalanceTask[]
): number {
  const paymentTasks = tasks.filter(isPaymentWorkflowTask);
  if (paymentTasks.length === 0) return 0;
  return paymentTasks.reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

/** Sum of unpaid payment milestone amounts; $0 when there are no payment milestones. */
export function computeBalanceDueFromPayments(
  tasks: readonly PaymentBalanceTask[]
): number {
  const paymentTasks = tasks.filter(isPaymentWorkflowTask);
  if (paymentTasks.length === 0) return 0;
  return paymentTasks
    .filter(isUnpaidPaymentTask)
    .reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

export function computeProjectValueWithChildren(
  parentTasks: readonly PaymentBalanceTask[],
  childTasksList: readonly (readonly PaymentBalanceTask[])[]
): number {
  let total = computeProjectValueFromPayments(parentTasks);
  for (const childTasks of childTasksList) {
    total += computeProjectValueFromPayments(childTasks);
  }
  return total;
}

export function computeBalanceDueWithChildren(
  parentTasks: readonly PaymentBalanceTask[],
  childTasksList: readonly (readonly PaymentBalanceTask[])[]
): number {
  let total = computeBalanceDueFromPayments(parentTasks);
  for (const childTasks of childTasksList) {
    total += computeBalanceDueFromPayments(childTasks);
  }
  return total;
}

export type CrmProjectPaymentTasksIndex = ReadonlyMap<string, readonly PaymentBalanceTask[]>;

export function getPaymentTasksForProject(
  index: CrmProjectPaymentTasksIndex,
  projectId: string
): readonly PaymentBalanceTask[] {
  return index.get(projectId) ?? [];
}
