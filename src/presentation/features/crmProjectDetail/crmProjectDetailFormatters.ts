import {
  getPipelineStage,
  isPaymentWorkflowTask,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmWorkflowTask,
  type PipelineStage,
  type PipelineStageSlug,
  type WorkflowTaskStatus,
} from '@/domain/crm';
import {
  isWorkflowTaskStatus,
  WORKFLOW_TASK_STATUS_LABELS,
} from '@/domain/crm/workflowTaskStatuses';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { formatBuildCoreDisplayDate } from '@/platform/formatting/buildCoreDisplayDate';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatShortDate(iso: string | null): string {
  return formatBuildCoreDisplayDate(iso);
}

const WORKFLOW_TASK_NOTES_PREVIEW_MAX = 120;
const WORKFLOW_TASK_COMPACT_TITLE_MAX = 100;

/** Single-line workflow task title for compact stage cards. */
export function formatWorkflowTaskCompactTitle(title: string): string {
  const trimmed = title.trim();
  if (trimmed.length <= WORKFLOW_TASK_COMPACT_TITLE_MAX) return trimmed;
  return `${trimmed.slice(0, WORKFLOW_TASK_COMPACT_TITLE_MAX)}…`;
}

/** Single-line workflow task note preview for table cells. */
export function formatWorkflowTaskNotesPreview(notes: string | null | undefined): string {
  if (notes == null) return '—';
  const trimmed = notes.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '—';
  if (trimmed.length <= WORKFLOW_TASK_NOTES_PREVIEW_MAX) return trimmed;
  return `${trimmed.slice(0, WORKFLOW_TASK_NOTES_PREVIEW_MAX - 1)}…`;
}

/** Full workflow task notes for mobile cards (multi-line, no truncation). */
export function formatWorkflowTaskNotesDisplay(notes: string | null | undefined): string {
  if (notes == null) return '—';
  const trimmed = notes.trim();
  if (!trimmed) return '—';
  return trimmed;
}

export function formatWorkflowTaskDocumentCountLabel(count: number): string {
  if (count === 1) return '1 Document';
  return `${count} Documents`;
}

export function formatDocumentKind(kind: string): string {
  return kind
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatWorkflowStatus(status: string): string {
  if (isWorkflowTaskStatus(status)) {
    return WORKFLOW_TASK_STATUS_LABELS[status as WorkflowTaskStatus];
  }
  return status.replace(/_/g, ' ');
}

export function formatMilestoneStatus(status: string): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/** Abbreviated stage label for very tight UI (not used on the detail pipeline timeline). */
export function shortStageLabel(label: string): string {
  if (label.length <= 14) return label;
  const first = label.split(' ')[0];
  return first ?? label;
}

/** Workflow-task UI label for a pipeline stage slug (`payments` → Payments). */
export function formatWorkflowStageLabel(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): string {
  if (slug === PAYMENT_WORKFLOW_STAGE_SLUG) {
    return content.projectDetail.workflow.paymentsGroupLabel;
  }
  return getPipelineStage(slug, stages).label;
}

/** Workflow-task UI label for a task row (payment milestones → Payments). */
export function formatWorkflowTaskStageLabel(
  task: Pick<CrmWorkflowTask, 'stageSlug' | 'amountCents'>,
  stages?: readonly PipelineStage[] | null
): string {
  if (isPaymentWorkflowTask(task)) {
    return content.projectDetail.workflow.paymentsGroupLabel;
  }
  return formatWorkflowStageLabel(task.stageSlug, stages);
}
