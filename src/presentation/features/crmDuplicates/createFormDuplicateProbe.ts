import { extractUsPhoneDigits, US_PHONE_DIGIT_COUNT } from '@/domain/crm/phoneFormat';
import type { ProjectCustomFieldDefinition } from '@/domain/buildcore/projectCustomFields';
import type { CreateCrmProjectFormState } from '@/presentation/features/crmCreate/createCrmProjectFormModel';
import type { CrmDuplicateCandidatesRequest } from '@/infrastructure/crm/api/crmDuplicateCandidatesApi';

export type BuildCreateFormDuplicateProbeInput = {
  readonly form: CreateCrmProjectFormState;
  readonly recordType: 'project' | 'subproject';
  readonly customFieldDraft: Readonly<Record<string, string>>;
  readonly customFieldDefinitions: readonly ProjectCustomFieldDefinition[];
  readonly excludeRecordId?: string | null;
};

/** True when the form has enough identity signal to justify a duplicate API call. */
export function createFormHasEnoughIdentityForDuplicateCheck(
  form: CreateCrmProjectFormState,
  customFieldDraft: Readonly<Record<string, string>>
): boolean {
  if (form.emails.some((email) => email.trim().includes('@'))) return true;
  if (form.phones.some((phone) => extractUsPhoneDigits(phone).length === US_PHONE_DIGIT_COUNT)) {
    return true;
  }
  const projectName = form.name.trim();
  if (projectName.includes(' ') && projectName.length >= 3) return true;
  const contactName = form.contactName.trim();
  if (contactName.includes(' ') && contactName.length >= 3) return true;
  if (form.addressLine1.trim() && form.city.trim()) return true;
  for (const value of Object.values(customFieldDraft)) {
    if (value.trim().length >= 3) return true;
  }
  return false;
}

export function buildCreateFormDuplicateProbe(
  input: BuildCreateFormDuplicateProbeInput
): CrmDuplicateCandidatesRequest {
  const { form } = input;
  const customFields = input.customFieldDefinitions
    .map((definition) => {
      const valueText = input.customFieldDraft[definition.fieldKey]?.trim() ?? '';
      if (!valueText) return null;
      return {
        definitionId: definition.id,
        valueId: null,
        fieldKey: definition.fieldKey,
        label: definition.label,
        valueText,
      };
    })
    .filter((field): field is NonNullable<typeof field> => field != null);

  return {
    recordType: input.recordType,
    projectName: form.name.trim() || null,
    contactName: form.contactName.trim() || null,
    emails: form.emails.map((email) => email.trim()).filter(Boolean),
    phones: form.phones.map((phone) => phone.trim()).filter(Boolean),
    address: {
      addressLine1: form.addressLine1.trim() || null,
      addressLine2: form.addressLine2.trim() || null,
      city: form.city.trim() || null,
      state: form.state.trim() || null,
      postalCode: form.postalCode.trim() || null,
    },
    customFields,
    excludeRecordId: input.excludeRecordId ?? null,
  };
}

/** Stable key for debounced identity changes (avoids re-check on unrelated fields). */
export function createFormDuplicateIdentityKey(
  form: CreateCrmProjectFormState,
  customFieldDraft: Readonly<Record<string, string>>,
  excludeRecordId: string | null | undefined,
  recordType: 'project' | 'subproject',
  customFieldDefinitionKeys: readonly string[]
): string {
  return JSON.stringify({
    recordType,
    name: form.name.trim(),
    contactName: form.contactName.trim(),
    emails: form.emails.map((v) => v.trim()).filter(Boolean),
    phones: form.phones.map((v) => v.trim()).filter(Boolean),
    addressLine1: form.addressLine1.trim(),
    addressLine2: form.addressLine2.trim(),
    city: form.city.trim(),
    state: form.state.trim(),
    postalCode: form.postalCode.trim(),
    customFields: customFieldDraft,
    customFieldDefinitionKeys,
    excludeRecordId: excludeRecordId ?? null,
  });
}
