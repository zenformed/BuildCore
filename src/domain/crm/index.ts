export {
  DEFAULT_PIPELINE_STAGES,
  completedStagesBefore,
  completedStagesThrough,
  findPipelineStage,
  getFirstPipelineStageSlug,
  getPipelineStage,
  isKnownPipelineStageSlug,
  pipelineStageSlugSet,
  resolvePipelineStageCatalog,
  type PipelineStage,
  type PipelineStageSlug,
} from './pipelineStage';
export { resolvePaymentTimingFields } from './paymentTiming';
export {
  PAYMENT_WORKFLOW_STAGE_SLUG,
  PAYMENTS_WORKFLOW_COLLAPSE_KEY,
  applyPaymentBalanceToProjectDetail,
  computeProjectBalanceCents,
  hasPaymentPaidAt,
  isPaymentWorkflowTask,
  isUnpaidPaymentTask,
  projectHasPaymentMilestones,
  type PaymentBalanceTask,
  type WorkflowStageCollapseKey,
} from './paymentWorkflow';
export {
  computeBalanceDueFromPayments,
  computeBalanceDueWithChildren,
  computeCollectedFromPayments,
  computeCollectedWithChildren,
  computePaymentFinancialsFromTasks,
  computePaymentFinancialsWithChildren,
  computeProjectValueFromPayments,
  computeProjectValueWithChildren,
  getPaymentTasksForProject,
  type CrmProjectPaymentTasksIndex,
  type ProjectPaymentFinancials,
} from './projectPaymentValue';
export {
  buildWorkflowTaskStatusIndexFromRows,
  deserializeWorkflowTaskStatusIndex,
  getWorkflowTaskStatusesForProject,
  projectHasAnyWorkflowTaskStatus,
  serializeWorkflowTaskStatusIndex,
  type CrmProjectWorkflowTaskStatusIndex,
} from './projectWorkflowTaskStatusIndex';
export {
  deserializeWorkflowProgressInput,
  deserializeWorkflowProgressInputIndex,
  getWorkflowProgressInputForProject,
  serializeWorkflowProgressInputIndex,
  workflowProgressInputToManualStageCompletions,
  workflowProgressInputToWorkflowTasks,
  type CrmProjectWorkflowProgressInput,
  type CrmProjectWorkflowProgressInputIndex,
  type CrmProjectWorkflowProgressTask,
  type SerializedCrmProjectWorkflowProgressInput,
} from './projectWorkflowProgressInput';
export {
  collectRollupBudgetSummary,
  getBudgetEntriesForProject,
  type CrmProjectBudgetEntriesIndex,
} from './projectBudgetRollup';
export type { CrmTeamMemberRef } from './teamMember';
export type { CrmContact } from './contact';
export type { CrmClient } from './client';
export type { CrmWorkflowTask, WorkflowTaskStatus } from './workflowTask';
export {
  isWorkflowTaskStatus,
  WORKFLOW_TASK_STATUSES,
  WORKFLOW_TASK_STATUS_LABELS,
} from './workflowTaskStatuses';
export type { CrmDocumentKind, CrmDocumentMetadata } from './document';
export {
  BUILDCORE_MAX_DOCUMENT_UPLOAD_BYTES,
  BUILDCORE_DOCUMENT_ALLOWED_EXTENSIONS,
  STORAGE_LIMIT_EXCEEDED_CODE,
  validateWorkflowTaskDocumentUpload,
} from './documentUpload';
export {
  BUILDCORE_UPLOAD_ALLOWED_EXTENSIONS,
  BUILDCORE_UPLOAD_MAX_DOCUMENT_BYTES,
  BUILDCORE_UPLOAD_MAX_IMAGE_BYTES,
  BUILDCORE_UPLOAD_MAX_VIDEO_BYTES,
  validateBuildCoreUpload,
} from './buildCoreUploadPolicy';
export type {
  DeleteWorkflowTaskDocumentInput,
  ListWorkflowTaskDocumentsInput,
  UploadWorkflowTaskDocumentInput,
  WorkflowTaskDocumentDownload,
} from './documentMutations';
export type { CrmAccountabilityAction } from './accountability';
export {
  buildProjectBudgetSummary,
  CRM_BUDGET_CATEGORIES,
  CRM_BUDGET_FILTER_CATEGORIES,
  isCrmBudgetCategory,
  type CrmBudgetCategory,
  type CrmBudgetCategoryCost,
  type CrmBudgetEntry,
  type CrmProjectBudgetSummary,
} from './budget';
export type {
  CreateCrmBudgetEntryInput,
  DeleteCrmBudgetEntryInput,
  UpdateCrmBudgetEntryInput,
} from './budgetMutations';
export type { CrmMilestone, CrmMilestonePaymentSummary, CrmMilestoneStatus } from './milestonePayment';
export {
  toProjectSummary,
  type CrmPriority,
  type CrmProjectDetail,
  type CrmProjectSummary,
  type CrmStageProgress,
  CRM_INDUSTRIES,
  INDUSTRY_LABELS,
  type CrmIndustry,
} from './project';
export {
  asCrmIndustry,
  getProjectIndustryDisplayLabel,
  isCrmIndustry,
  validateCrmIndustryFields,
} from './industry';
export { isCrmProjectComplete, CRM_PROJECT_COMPLETE_STAGE_SLUG, type SetCrmProjectCompletionInput } from './projectCompletion';
export type { BulkMarkInactiveCrmProjectsResult } from './bulkMarkInactiveProjects';
export type { BulkMarkActiveCrmProjectsResult } from './bulkMarkActiveProjects';
export {
  CRM_INACTIVE_REASON_OPTIONS,
  CRM_INACTIVE_REASON_VALUES,
  CRM_SUBPROJECT_STATUS_VALUES,
  deriveCrmSubprojectStatus,
  getCrmInactiveReasonLabel,
  isCrmInactiveReason,
  isCrmProjectInactive,
  isCrmSubprojectStatus,
  resolveCrmSubprojectListSortRank,
  validateMarkCrmProjectsInactiveInput,
  type CrmInactiveReason,
  type CrmInactiveReasonOption,
  type CrmSubprojectStatus,
  type MarkCrmProjectsInactiveInput,
  type MarkCrmProjectsActiveInput,
} from './subprojectStatus';
export {
  crmMyTaskAssignmentKindFromTask,
  filterCrmMyTasksByAssigneeScope,
  formatCrmMyTaskContextLine,
  groupCrmMyTasksByParentProject,
  isCrmMyTaskAssigneeFilterAvailable,
  memberAssigneeIdFromMyTask,
  parseCrmMyTaskAssigneeScope,
  type CrmMyTaskAssigneeFilterMeta,
  type CrmMyTaskAssigneeScope,
  type CrmMyTaskAssignment,
  type CrmMyTaskAssignmentKind,
  type CrmMyTaskParentGroup,
  type CrmMyTasksResponse,
} from './myTaskAssignment';
export {
  areAllWorkflowStagesComplete,
  isStageManuallyCompleted,
  isWorkflowStageComplete,
  listEmptyIncompleteWorkflowStages,
  resolveWorkflowStageCompletionState,
  type CrmProjectStageCompletion,
  type CrmProjectStageCompletionSource,
  type EmptyIncompleteWorkflowStage,
} from './projectStageCompletion';
export {
  isProjectPriorityActive,
  isProjectPriorityUrgent,
  toggleProjectPriority,
  getCrmProjectListSortRank,
  sortCrmProjectsForList,
} from './projectPriorityToggle';
export type { CreateCrmProjectInput, CreateCrmProjectResult } from './createProject';
export type { UpdateCrmProjectInput } from './updateProject';
export type { CrmProjectAddress } from './projectAddress';
export {
  buildCrmProjectMapsSearchUrl,
  crmProjectAddressSearchText,
  emptyCrmProjectAddress,
  formatCrmProjectAddressEnvelopeLines,
  formatCrmProjectAddressLine,
  type CrmProjectAddressEnvelopeLines,
} from './projectAddress';
export { buildCrmProjectSummarySearchHaystack } from './projectSummarySearch';
export { US_STATE_OPTIONS, type UsStateOption } from './usStates';
export type {
  CreateCrmWorkflowTaskInput,
  UpdateCrmWorkflowTaskInput,
} from './workflowTaskMutations';
export type {
  BuildCoreProjectTemplate,
  BuildCoreProjectTemplateBlueprints,
  BuildCoreProjectTemplatePaymentBlueprint,
  BuildCoreProjectTemplateWorkflowTaskBlueprint,
} from './projectTemplate';
export { snapshotProjectTemplateBlueprintsFromWorkflowTasks } from './projectTemplate';
export type { BuildCoreProjectTemplateScope } from './projectTemplateScope';
export {
  isBuildCoreProjectTemplateScope,
  resolveProjectTemplateScopeForProject,
  templateScopeMatchesProject,
} from './projectTemplateScope';
export {
  buildWorkflowTaskInputsFromBlueprints,
  buildWorkflowTaskInputsFromProjectTemplate,
  type BuildCoreProjectTemplateApplyInputs,
} from './applyProjectTemplate';
export type { CreateProjectTemplateDraft } from './projectTemplateDraft';
export {
  createProjectTemplateDraftFromTemplate,
  createProjectTemplateDraftSummary,
  emptyCreateProjectTemplateDraft,
  hasCreateProjectTemplateDraftContent,
} from './projectTemplateDraft';
