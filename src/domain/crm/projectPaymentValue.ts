import {
  hasPaymentPaidAt,
  isPaymentWorkflowTask,
  isUnpaidPaymentTask,
  type PaymentBalanceTask,
} from './paymentWorkflow';

export type ProjectPaymentFinancials = {
  readonly valueCents: number;
  readonly collectedCents: number;
  readonly balanceCents: number;
};

function paymentTasks(tasks: readonly PaymentBalanceTask[]): readonly PaymentBalanceTask[] {
  return tasks.filter(isPaymentWorkflowTask);
}

/** Sum of payment milestone amounts; $0 when there are no payment milestones. */
export function computeProjectValueFromPayments(
  tasks: readonly PaymentBalanceTask[]
): number {
  const milestones = paymentTasks(tasks);
  if (milestones.length === 0) return 0;
  return milestones.reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

/** Sum of payment milestone amounts with paid_at; $0 when there are no payment milestones. */
export function computeCollectedFromPayments(tasks: readonly PaymentBalanceTask[]): number {
  const milestones = paymentTasks(tasks);
  if (milestones.length === 0) return 0;
  return milestones
    .filter(hasPaymentPaidAt)
    .reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

/** Sum of unpaid payment milestone amounts; $0 when there are no payment milestones. */
export function computeBalanceDueFromPayments(
  tasks: readonly PaymentBalanceTask[]
): number {
  const milestones = paymentTasks(tasks);
  if (milestones.length === 0) return 0;
  return milestones
    .filter(isUnpaidPaymentTask)
    .reduce((sum, task) => sum + (task.amountCents ?? 0), 0);
}

/**
 * Value / collected / balance for one project's payment milestones.
 * Uses paid_at as the accounting source of truth (not workflow status).
 */
export function computePaymentFinancialsFromTasks(
  tasks: readonly PaymentBalanceTask[]
): ProjectPaymentFinancials {
  const valueCents = computeProjectValueFromPayments(tasks);
  const collectedCents = computeCollectedFromPayments(tasks);
  const balanceCents = computeBalanceDueFromPayments(tasks);
  return { valueCents, collectedCents, balanceCents };
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

export function computeCollectedWithChildren(
  parentTasks: readonly PaymentBalanceTask[],
  childTasksList: readonly (readonly PaymentBalanceTask[])[]
): number {
  let total = computeCollectedFromPayments(parentTasks);
  for (const childTasks of childTasksList) {
    total += computeCollectedFromPayments(childTasks);
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

/** Roll up value, collected, and balance across parent + visible child payment milestones. */
export function computePaymentFinancialsWithChildren(
  parentTasks: readonly PaymentBalanceTask[],
  childTasksList: readonly (readonly PaymentBalanceTask[])[]
): ProjectPaymentFinancials {
  const valueCents = computeProjectValueWithChildren(parentTasks, childTasksList);
  const collectedCents = computeCollectedWithChildren(parentTasks, childTasksList);
  const balanceCents = computeBalanceDueWithChildren(parentTasks, childTasksList);
  return { valueCents, collectedCents, balanceCents };
}

export type CrmProjectPaymentTasksIndex = ReadonlyMap<string, readonly PaymentBalanceTask[]>;

export function getPaymentTasksForProject(
  index: CrmProjectPaymentTasksIndex,
  projectId: string
): readonly PaymentBalanceTask[] {
  return index.get(projectId) ?? [];
}
