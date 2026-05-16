export type CrmMilestoneStatus = 'pending' | 'due' | 'paid' | 'waived';

export type CrmMilestone = {
  readonly id: string;
  readonly label: string;
  readonly amountCents: number;
  readonly dueAt: string | null;
  readonly completedAt: string | null;
  readonly status: CrmMilestoneStatus;
};

export type CrmMilestonePaymentSummary = {
  readonly contractValueCents: number;
  readonly invoicedCents: number;
  readonly paidCents: number;
  readonly balanceCents: number;
  readonly milestones: readonly CrmMilestone[];
};
