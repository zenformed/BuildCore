import type { PipelineStageSlug } from './pipelineStage';
import type { WorkflowTaskStatus } from './workflowTask';

export type CreateCrmWorkflowTaskInput = {
  readonly projectId: string;
  /** Used by API client routing; optional on server create. */
  readonly projectSlug?: string;
  readonly title: string;
  readonly stageSlug: PipelineStageSlug;
  readonly status: WorkflowTaskStatus;
  readonly documentsRequired: boolean;
  readonly dueAt: string | null;
  readonly notes: string | null;
  readonly assignedMemberId: string | null;
  readonly amountCents?: number | null;
  readonly invoicedAt?: string | null;
  readonly paidAt?: string | null;
};

export type UpdateCrmWorkflowTaskInput = {
  readonly taskId: string;
  readonly title?: string;
  readonly stageSlug?: PipelineStageSlug;
  readonly status?: WorkflowTaskStatus;
  readonly documentsRequired?: boolean;
  readonly dueAt?: string | null;
  readonly notes?: string | null;
  readonly assignedMemberId?: string | null;
  readonly amountCents?: number | null;
  readonly invoicedAt?: string | null;
  readonly paidAt?: string | null;
};
