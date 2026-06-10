import type { CrmProjectSummary, CrmWorkflowTask } from '@/domain/crm';
import {
  getPaymentTasksForProject,
  type CrmProjectPaymentTasksIndex,
} from '@/domain/crm/projectPaymentValue';
import {
  hasPaymentPaidAt,
  isPaymentWorkflowTask,
  type PaymentBalanceTask,
} from '@/domain/crm/paymentWorkflow';
import { WORKFLOW_TASK_STATUS_LABELS } from '@/domain/crm/workflowTaskStatuses';
import { formatReportShortDate, formatReportText } from '../formatReportValues';
import type { ProjectFinancialReportPaymentRow } from '../types/projectFinancialReport';

const DEFAULT_PAYMENT_TITLE = 'Payment milestone';

function workflowTaskToPaymentRow(
  task: CrmWorkflowTask,
  projectLabel: string | null
): ProjectFinancialReportPaymentRow {
  const paid = hasPaymentPaidAt(task);
  return {
    title: formatReportText(task.title, DEFAULT_PAYMENT_TITLE),
    projectLabel,
    amountCents: task.amountCents ?? 0,
    statusLabel: WORKFLOW_TASK_STATUS_LABELS[task.status],
    paidAtLabel: formatReportShortDate(task.paidAt),
    paidIndicator: paid ? 'paid' : 'unpaid',
  };
}

function indexTaskToPaymentRow(
  task: PaymentBalanceTask,
  projectLabel: string
): ProjectFinancialReportPaymentRow {
  const paid = hasPaymentPaidAt(task);
  return {
    title: formatReportText(task.title, DEFAULT_PAYMENT_TITLE),
    projectLabel,
    amountCents: task.amountCents ?? 0,
    statusLabel: WORKFLOW_TASK_STATUS_LABELS[task.status],
    paidAtLabel: formatReportShortDate(task.paidAt ?? null),
    paidIndicator: paid ? 'paid' : 'unpaid',
  };
}

/** Payment rows for one project report; parent rollups append visible child milestones. */
export function collectProjectFinancialReportPayments(input: {
  readonly project: { readonly summary: CrmProjectSummary; readonly workflowTasks: readonly CrmWorkflowTask[] };
  readonly childSummaries: readonly CrmProjectSummary[] | null;
  readonly paymentTasksIndex: CrmProjectPaymentTasksIndex;
}): readonly ProjectFinancialReportPaymentRow[] {
  const isParentRollup =
    input.project.summary.parentProjectId == null && input.childSummaries != null;

  const parentRows = input.project.workflowTasks
    .filter(isPaymentWorkflowTask)
    .map((task) => workflowTaskToPaymentRow(task, null));

  if (!isParentRollup || input.childSummaries == null) {
    return parentRows;
  }

  const childRows: ProjectFinancialReportPaymentRow[] = [];
  const sortedChildren = [...input.childSummaries].sort((a, b) =>
    a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  );

  for (const child of sortedChildren) {
    const childTasks = getPaymentTasksForProject(input.paymentTasksIndex, child.id);
    for (const task of childTasks) {
      childRows.push(indexTaskToPaymentRow(task, child.name));
    }
  }

  return [...parentRows, ...childRows];
}
