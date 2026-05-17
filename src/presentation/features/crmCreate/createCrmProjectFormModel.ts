import type { CreateCrmProjectInput } from '@/domain/crm';
import type { CrmPriority } from '@/domain/crm';
import type { PipelineStageSlug } from '@/domain/crm';

export type CreateCrmProjectFormState = {
  name: string;
  contactName: string;
  email: string;
  phone: string;
  priority: CrmPriority;
  currentStageSlug: PipelineStageSlug;
  waitingOn: string;
  notes: string;
  dealValueUsd: string;
  balanceUsd: string;
  assignedMemberId: string;
};

export const defaultCreateCrmProjectFormState = (): CreateCrmProjectFormState => ({
  name: '',
  contactName: '',
  email: '',
  phone: '',
  priority: 'normal',
  currentStageSlug: 'new-lead',
  waitingOn: '',
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

  const balanceRemainingCents = parseUsdInputToCents(form.balanceUsd);
  if (balanceRemainingCents == null) {
    return { ok: false, message: 'Enter a valid balance.' };
  }

  return {
    ok: true,
    input: {
      name,
      contactName,
      email: form.email.trim(),
      phone: form.phone.trim(),
      priority: form.priority,
      currentStageSlug: form.currentStageSlug,
      waitingOn: form.waitingOn.trim() || null,
      notes: form.notes.trim() || null,
      dealValueCents,
      balanceRemainingCents,
      assignedMemberId: form.assignedMemberId.trim() || null,
    },
  };
}
