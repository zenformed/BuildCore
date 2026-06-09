import {
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

/** Sum of paid payment milestone amounts; $0 when there are no payment milestones. */
export function computeCollectedFromPayments(tasks: readonly PaymentBalanceTask[]): number {
  const milestones = paymentTasks(tasks);
  if (milestones.length === 0) return 0;
  return milestones
    .filter((task) => !isUnpaidPaymentTask(task))
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

/** Value, collected, and balance for one project's payment milestones. */
export function computePaymentFinancialsFromTasks(
  tasks: readonly PaymentBalanceTask[]
): ProjectPaymentFinancials {
  const valueCents = computeProjectValueFromPayments(tasks);
  const balanceCents = computeBalanceDueFromPayments(tasks);
  const collectedCents = valueCents - balanceCents;
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

/** Roll up value, collected, and balance across parent + child payment milestones. */
export function computePaymentFinancialsWithChildren(
  parentTasks: readonly PaymentBalanceTask[],
  childTasksList: readonly (readonly PaymentBalanceTask[])[]
): ProjectPaymentFinancials {
  const valueCents = computeProjectValueWithChildren(parentTasks, childTasksList);
  const balanceCents = computeBalanceDueWithChildren(parentTasks, childTasksList);
  const collectedCents = valueCents - balanceCents;
  return { valueCents, collectedCents, balanceCents };
}

export type CrmProjectPaymentTasksIndex = ReadonlyMap<string, readonly PaymentBalanceTask[]>;

export function getPaymentTasksForProject(
  index: CrmProjectPaymentTasksIndex,
  projectId: string
): readonly PaymentBalanceTask[] {
  return index.get(projectId) ?? [];
}
