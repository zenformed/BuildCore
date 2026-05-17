import type { CrmProjectDetail, UpdateCrmProjectInput } from '@/domain/crm';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import {
  parseUsdInputToCents,
  validateCreateCrmProjectForm,
} from '@/presentation/features/crmCreate/createCrmProjectFormModel';

export function projectDetailToFormState(project: CrmProjectDetail): CreateCrmProjectFormState {
  const { summary, notes } = project;
  return {
    name: summary.name,
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
  form: CreateCrmProjectFormState
): { ok: true; input: UpdateCrmProjectInput } | { ok: false; message: string } {
  const validated = validateCreateCrmProjectForm(form);
  if (!validated.ok) return validated;
  return { ok: true, input: validated.input };
}

export { parseUsdInputToCents };
