export {
  DEFAULT_PIPELINE_STAGES,
  completedStagesBefore,
  completedStagesThrough,
  getPipelineStage,
  type PipelineStage,
  type PipelineStageSlug,
} from './pipelineStage';
export {
  PAYMENT_WORKFLOW_STAGE_SLUG,
  PAYMENTS_WORKFLOW_COLLAPSE_KEY,
  applyPaymentBalanceToProjectDetail,
  computeProjectBalanceCents,
  isPaymentWorkflowTask,
  projectHasPaymentMilestones,
  type WorkflowStageCollapseKey,
} from './paymentWorkflow';
export type { CrmTeamMemberRef } from './teamMember';
export type { CrmContact } from './contact';
export type { CrmClient } from './client';
export type { CrmWorkflowTask, WorkflowTaskStatus } from './workflowTask';
export type { CrmDocumentKind, CrmDocumentMetadata } from './document';
export {
  BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES,
  BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS,
  STORAGE_LIMIT_EXCEEDED_CODE,
  validateWorkflowTaskDocumentUpload,
} from './documentUpload';
export type {
  DeleteWorkflowTaskDocumentInput,
  ListWorkflowTaskDocumentsInput,
  UploadWorkflowTaskDocumentInput,
  WorkflowTaskDocumentDownload,
} from './documentMutations';
export type { CrmAccountabilityAction } from './accountability';
export type { CrmMilestone, CrmMilestonePaymentSummary, CrmMilestoneStatus } from './milestonePayment';
export {
  toProjectSummary,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmProjectSummary,
  type CrmStageProgress,
  CRM_TRADE_TYPES,
  type CrmTradeType,
} from './project';
export type { CreateCrmProjectInput, CreateCrmProjectResult } from './createProject';
export type { UpdateCrmProjectInput } from './updateProject';
export type {
  CreateCrmWorkflowTaskInput,
  UpdateCrmWorkflowTaskInput,
} from './workflowTaskMutations';
