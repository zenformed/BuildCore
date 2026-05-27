import type { CreateCrmProjectInput, CrmPriority, CrmTradeType, PipelineStageSlug } from '@/domain/crm';
import { normalizeAssigneeMemberIdForSave } from '@/presentation/features/crmAssignment/buildAssigneeOptions';

export type CreateCrmProjectFormState = {
  name: string;
  tradeType: CrmTradeType;
  contactName: string;
  email: string;
  phone: string;
  priority: CrmPriority;
  currentStageSlug: PipelineStageSlug;
  notes: string;
  dealValueUsd: string;
  balanceUsd: string;
  assignedMemberId: string;
};

export const defaultCreateCrmProjectFormState = (): CreateCrmProjectFormState => ({
  name: '',
  tradeType: 'hvac',
  contactName: '',
  email: '',
  phone: '',
  priority: 'normal',
  currentStageSlug: 'new-lead',
  notes: '',
  dealValueUsd: '',
  balanceUsd: '',
  assignedMemberId: '',
});

export function parseUsdInputToCents(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return 0;
  const normalized = trimmed.replace(/[^0-9.]/g, '');
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

export function validateCreateCrmProjectForm(
  form: CreateCrmProjectFormState
): { ok: true; input: CreateCrmProjectInput } | { ok: false; message: string } {
  const name = form.name.trim();
  if (!name) {
    return { ok: false, message: 'Project / customer name is required.' };
  }

  const contactName = form.contactName.trim();
  if (!contactName) {
    return { ok: false, message: 'Contact name is required.' };
  }

  const dealValueCents = parseUsdInputToCents(form.dealValueUsd);
  if (dealValueCents == null) {
    return { ok: false, message: 'Enter a valid deal value.' };
  }

  const balanceUsd = form.balanceUsd.trim();
  const balanceRemainingCents = balanceUsd ? parseUsdInputToCents(balanceUsd) : 0;
  if (balanceRemainingCents == null) {
    return { ok: false, message: 'Enter a valid balance.' };
  }

  return {
    ok: true,
    input: {
      name,
      tradeType: form.tradeType,
      contactName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      priority: form.priority,
      currentStageSlug: form.currentStageSlug,
      notes: form.notes.trim() || null,
      dealValueCents,
      balanceRemainingCents,
      assignedMemberId: normalizeAssigneeMemberIdForSave(form.assignedMemberId),
    },
  };
}
