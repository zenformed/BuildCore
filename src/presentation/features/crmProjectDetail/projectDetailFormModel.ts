import { projectHasPaymentMilestones, type CrmProjectDetail, type UpdateCrmProjectInput } from '@/domain/crm';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  parseUsdInputToCents,
  validateCreateCrmProjectForm,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';

export function projectDetailToFormState(project: CrmProjectDetail): CreateCrmProjectFormState {
  const { summary, notes } = project;
  return {
    name: summary.name,
    tradeType: summary.tradeType,
    contactName: summary.contact.name,
    email: summary.contact.email,
    phone: summary.contact.phone,
    priority: summary.priority,
    currentStageSlug: summary.currentStageSlug,
    waitingOn: summary.waitingOn ?? '',
    notes: notes ?? '',
    dealValueUsd: (summary.dealValueCents / 100).toFixed(2),
    balanceUsd: (summary.balanceRemainingCents / 100).toFixed(2),
    assignedMemberId: summary.assignedTo?.id ?? '',
  };
}

export function validateProjectDetailForm(
  form: CreateCrmProjectFormState,
  project: CrmProjectDetail
): { ok: true; input: UpdateCrmProjectInput } | { ok: false; message: string } {
  const validated = validateCreateCrmProjectForm(form);
  if (!validated.ok) return validated;

  if (projectHasPaymentMilestones(project)) {
    return {
      ok: true,
      input: {
        ...validated.input,
        balanceRemainingCents: project.summary.balanceRemainingCents,
      },
    };
  }

  return { ok: true, input: validated.input };
}

export { parseUsdInputToCents };
