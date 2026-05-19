import type { CrmAccountabilityAction } from './accountability';
import type { CrmProjectBudgetSummary } from './budget';
import type { CrmClient } from './client';
import type { CrmContact } from './contact';
import type { CrmDocumentMetadata } from './document';
import type { CrmMilestonePaymentSummary } from './milestonePayment';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';
import type { CrmWorkflowTask } from './workflowTask';

export type CrmPriority = 'low' | 'normal' | 'high' | 'urgent';

export type CrmTradeType =
  | 'hvac'
  | 'roofing'
  | 'restoration'
  | 'inspections'
  | 'make-ready'
  | 'general-contractor';

export const CRM_TRADE_TYPES: readonly CrmTradeType[] = [
  'hvac',
  'roofing',
  'restoration',
  'inspections',
  'make-ready',
  'general-contractor',
] as const;

/** Row shape for the future all-projects pipeline table. */
export type CrmProjectSummary = {
  readonly id: string;
  readonly slug: string;
  readonly name: string;
  readonly tradeType: CrmTradeType;
  readonly contact: CrmContact;
  readonly client: CrmClient;
  readonly priority: CrmPriority;
  readonly currentStageSlug: PipelineStageSlug;
  readonly waitingOn: string | null;
  readonly notesPreview: string | null;
  readonly dealValueCents: number;
  readonly balanceRemainingCents: number;
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly lastUpdatedAt: string;
};

export type CrmStageProgress = {
  readonly currentStageSlug: PipelineStageSlug;
  readonly completedStageSlugs: readonly PipelineStageSlug[];
};

/** Full project hub for the future single-project page. */
export type CrmProjectDetail = {
  readonly summary: CrmProjectSummary;
  readonly notes: string | null;
  readonly stageProgress: CrmStageProgress;
  readonly workflowTasks: readonly CrmWorkflowTask[];
  readonly documents: readonly CrmDocumentMetadata[];
  readonly accountabilityLog: readonly CrmAccountabilityAction[];
  readonly milestonePayment: CrmMilestonePaymentSummary;
  readonly budget: CrmProjectBudgetSummary;
};

export function toProjectSummary(detail: CrmProjectDetail): CrmProjectSummary {
  return detail.summary;
}
