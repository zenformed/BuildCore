import type { WorkflowTaskStatus } from './workflowTask';

/** Apply payment milestone invoiced/paid timestamps on create/update. */
export function resolvePaymentTimingFields(input: {
  readonly isPayment: boolean;
  readonly previousStatus: WorkflowTaskStatus;
  readonly nextStatus: WorkflowTaskStatus;
  readonly previousInvoicedAt: string | null;
  readonly previousPaidAt: string | null;
  /** Undefined = not sent in patch (auto rules may apply). */
  readonly invoicedAt?: string | null;
  readonly paidAt?: string | null;
  readonly now: string;
}): { readonly invoicedAt: string | null; readonly paidAt: string | null } {
  let invoicedAt = input.previousInvoicedAt;
  let paidAt = input.previousPaidAt;

  if (!input.isPayment) {
    return {
      invoicedAt: input.invoicedAt ?? invoicedAt,
      paidAt: input.paidAt ?? paidAt,
    };
  }

  if (input.invoicedAt !== undefined) {
    invoicedAt = input.invoicedAt;
  } else if (
    input.nextStatus === 'in_progress' &&
    input.previousStatus !== 'in_progress' &&
    !invoicedAt
  ) {
    invoicedAt = input.now;
  }

  if (input.paidAt !== undefined) {
    paidAt = input.paidAt;
  } else if (input.nextStatus !== 'done' && input.previousStatus === 'done') {
    paidAt = null;
  } else if (input.nextStatus === 'done' && !paidAt) {
    paidAt = input.now;
  }

  return { invoicedAt, paidAt };
}
