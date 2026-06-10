import type { CrmAccountabilityAction } from './accountability';
import type { CrmProjectBudgetSummary } from './budget';
import type { CrmClient } from './client';
import type { CrmContact } from './contact';
import type { CrmDocumentMetadata } from './document';
import type { CrmMilestonePaymentSummary } from './milestonePayment';
import type { CrmProjectAddress } from './projectAddress';
import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';
import type { CrmIndustry } from './industry';
import type { CrmWorkflowTask } from './workflowTask';

export type CrmPriority = 'low' | 'normal' | 'high' | 'urgent';

export type { CrmIndustry } from './industry';
export { CRM_INDUSTRIES, INDUSTRY_LABELS } from './industry';

/** Row shape for the future all-projects pipeline table. */
export type CrmProjectSummary = {
  readonly id: string;
  readonly slug: string;
  /** Null for root/parent projects; set when this project is a subproject. */
  readonly parentProjectId: string | null;
  readonly name: string;
  readonly industry: CrmIndustry;
  /** Set when industry is other; null otherwise. */
  readonly customIndustry: string | null;
  readonly contact: CrmContact;
  readonly client: CrmClient;
  readonly address: CrmProjectAddress;
  readonly priority: CrmPriority;
  readonly currentStageSlug: PipelineStageSlug;
  readonly notesPreview: string | null;
  readonly dealValueCents: number;
  readonly balanceRemainingCents: number;
  readonly assignedTo: CrmTeamMemberRef | null;
  readonly lastUpdatedAt: string;
  /** Set when marked complete; null = incomplete (default). */
  readonly completedAt: string | null;
  readonly completedBy: CrmTeamMemberRef | null;
  /** Supabase storage key for primary project photo; null when using initials placeholder. */
  readonly primaryPhotoPath: string | null;
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
