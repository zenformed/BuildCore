import { PAYMENT_WORKFLOW_STAGE_SLUG } from './paymentWorkflow';
import type { BuildCoreProjectTemplate } from './projectTemplate';
import type { CreateCrmWorkflowTaskInput } from './workflowTaskMutations';

const DEFAULT_TEMPLATE_TASK_STATUS = 'pending' as const;

export type BuildCoreProjectTemplateApplyInputs = {
  readonly workflowTaskInputs: readonly CreateCrmWorkflowTaskInput[];
  readonly paymentInputs: readonly CreateCrmWorkflowTaskInput[];
};

/**
 * Map blueprint-only template payloads to workflow task create inputs (all pending, no assignees).
 * Reusable for existing-project apply and future create-project flows.
 */
export function buildWorkflowTaskInputsFromProjectTemplate(
  template: Pick<BuildCoreProjectTemplate, 'workflowTasksPayload' | 'paymentsPayload'>,
  projectId: string,
  projectSlug?: string
): BuildCoreProjectTemplateApplyInputs {
  const base = { projectId, projectSlug };
  const workflowTaskInputs: CreateCrmWorkflowTaskInput[] = template.workflowTasksPayload.map(
    (item) => ({
      ...base,
      title: item.taskName,
      stageSlug: item.stageKey,
      status: DEFAULT_TEMPLATE_TASK_STATUS,
      documentsRequired: item.documentsRequired,
      dueAt: null,
      notes: null,
      assignedMemberId: null,
    })
  );

  const paymentInputs: CreateCrmWorkflowTaskInput[] = template.paymentsPayload.map((item) => ({
    ...base,
    title: item.title,
    stageSlug: PAYMENT_WORKFLOW_STAGE_SLUG,
    status: DEFAULT_TEMPLATE_TASK_STATUS,
    documentsRequired: item.documentsRequired,
    dueAt: null,
    notes: null,
    assignedMemberId: null,
    amountCents: Math.round(item.amount * 100),
  }));

  return { workflowTaskInputs, paymentInputs };
}
