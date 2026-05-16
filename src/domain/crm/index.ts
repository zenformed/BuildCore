export {
  DEFAULT_PIPELINE_STAGES,
  completedStagesBefore,
  getPipelineStage,
  type PipelineStage,
  type PipelineStageSlug,
} from './pipelineStage';
export type { CrmTeamMemberRef } from './teamMember';
export type { CrmContact } from './contact';
export type { CrmClient } from './client';
export type { CrmWorkflowTask, WorkflowTaskStatus } from './workflowTask';
export type { CrmDocumentKind, CrmDocumentMetadata } from './document';
export type { CrmAccountabilityAction } from './accountability';
export type { CrmMilestone, CrmMilestonePaymentSummary, CrmMilestoneStatus } from './milestonePayment';
export {
  toProjectSummary,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmProjectSummary,
  type CrmStageProgress,
  type CrmTradeType,
} from './project';
