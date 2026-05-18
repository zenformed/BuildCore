import {
  getPipelineStage,
  isPaymentWorkflowTask,
  PAYMENT_WORKFLOW_STAGE_SLUG,
  type CrmWorkflowTask,
  type PipelineStageSlug,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatShortDate(iso: string | null): string {
  if (iso == null) return '—';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '—';
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(date);
}

export function formatDocumentKind(kind: string): string {
  return kind
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export function formatWorkflowStatus(status: string): string {
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

/** Workflow-task UI label for a pipeline stage slug (`paid` → Payments). */
export function formatWorkflowStageLabel(slug: PipelineStageSlug): string {
  if (slug === PAYMENT_WORKFLOW_STAGE_SLUG) {
    return content.projectDetail.workflow.paymentsGroupLabel;
  }
  return getPipelineStage(slug).label;
}

/** Workflow-task UI label for a task row (payment milestones → Payments). */
export function formatWorkflowTaskStageLabel(
  task: Pick<CrmWorkflowTask, 'stageSlug' | 'amountCents'>
): string {
  if (isPaymentWorkflowTask(task)) {
    return content.projectDetail.workflow.paymentsGroupLabel;
  }
  return formatWorkflowStageLabel(task.stageSlug);
}
