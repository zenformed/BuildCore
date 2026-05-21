import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';

export type WorkflowTaskStatus = 'pending' | 'in_progress' | 'blocked' | 'done' | 'skipped';

export type CrmWorkflowTask = {
  readonly id: string;
  readonly stageSlug: PipelineStageSlug;
  readonly title: string;
  readonly status: WorkflowTaskStatus;
  readonly documentsRequired: boolean;
  readonly notes: string | null;
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly dueAt: string | null;
  readonly completedAt: string | null;
  readonly completedBy: CrmTeamMemberRef | null;
  readonly sortOrder: number;
  /** Non-null when this row is a payment milestone (see paymentWorkflow.ts). */
  readonly amountCents: number | null;
  /** Payment milestone: when amount was invoiced (reporting). */
  readonly invoicedAt: string | null;
  /** Payment milestone: when amount was collected/paid (reporting). */
  readonly paidAt: string | null;
};
