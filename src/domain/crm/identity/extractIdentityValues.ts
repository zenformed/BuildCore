import { classifyCustomFieldIdentityRole } from './customFieldIdentityHeuristics';
import {
  CRM_IDENTITY_SOURCE_PRIORITY,
  type CrmIdentityRecordSnapshot,
  type CrmIdentitySourceKind,
  type CrmIdentityValueDraft,
  type CrmIdentityValueType,
} from './identityTypes';
import {
  normalizeIdentityAddress,
  normalizeIdentityEmail,
  normalizeIdentityName,
  normalizeIdentityPhone,
  normalizeIdentityTextValue,
} from './normalizeIdentityValue';

function draftKey(valueType: CrmIdentityValueType, normalizedValue: string): string {
  return `${valueType}:${normalizedValue}`;
}

function makeDraft(input: {
  readonly valueType: CrmIdentityValueType;
  readonly normalizedValue: string;
  readonly sourceKind: CrmIdentitySourceKind;
  readonly sourceFieldKey?: string | null;
  readonly sourceFieldLabel?: string | null;
  readonly sourceValueId?: string | null;
}): CrmIdentityValueDraft {
  return {
    valueType: input.valueType,
    normalizedValue: input.normalizedValue,
    sourceKind: input.sourceKind,
    sourceFieldKey: input.sourceFieldKey ?? null,
    sourceFieldLabel: input.sourceFieldLabel ?? null,
    sourceValueId: input.sourceValueId ?? null,
    sourcePriority: CRM_IDENTITY_SOURCE_PRIORITY[input.sourceKind],
  };
}

/**
 * Collapse drafts that share (valueType, normalizedValue), keeping the highest-priority source.
 * Same email in legacy mirror + array → one row with a single canonical source.
 */
export function collapseIdentityValueDrafts(
  drafts: readonly CrmIdentityValueDraft[]
): CrmIdentityValueDraft[] {
  const byKey = new Map<string, CrmIdentityValueDraft>();
  for (const draft of drafts) {
    const key = draftKey(draft.valueType, draft.normalizedValue);
    const existing = byKey.get(key);
    if (existing == null || draft.sourcePriority > existing.sourcePriority) {
      byKey.set(key, draft);
    }
  }
  return [...byKey.values()].sort((a, b) => {
    if (a.valueType !== b.valueType) return a.valueType.localeCompare(b.valueType);
    return a.normalizedValue.localeCompare(b.normalizedValue);
  });
}

function pushName(
  out: CrmIdentityValueDraft[],
  raw: string | null | undefined,
  source: {
    readonly sourceKind: CrmIdentitySourceKind;
    readonly sourceFieldKey?: string | null;
    readonly sourceFieldLabel?: string | null;
    readonly sourceValueId?: string | null;
    readonly allowWeakSingleToken?: boolean;
  }
): void {
  if (raw == null) return;
  const normalized = normalizeIdentityName(raw, {
    allowWeakSingleToken: source.allowWeakSingleToken,
  });
  if (normalized == null) return;
  out.push(
    makeDraft({
      valueType: 'name',
      normalizedValue: normalized,
      sourceKind: source.sourceKind,
      sourceFieldKey: source.sourceFieldKey,
      sourceFieldLabel: source.sourceFieldLabel,
      sourceValueId: source.sourceValueId,
    })
  );
}

/**
 * Shared identity extraction. Callers must not invent parallel field-label matching.
 */
export function extractIdentityValues(
  snapshot: CrmIdentityRecordSnapshot
): readonly CrmIdentityValueDraft[] {
  const drafts: CrmIdentityValueDraft[] = [];

  for (const email of snapshot.emails) {
    const normalized = normalizeIdentityEmail(email);
    if (normalized == null) continue;
    drafts.push(
      makeDraft({
        valueType: 'email',
        normalizedValue: normalized,
        sourceKind: 'contact_email',
        sourceFieldKey: 'contact_emails',
        sourceFieldLabel: 'Email',
      })
    );
  }

  for (const phone of snapshot.phones) {
    const normalized = normalizeIdentityPhone(phone);
    if (normalized == null) continue;
    drafts.push(
      makeDraft({
        valueType: 'phone',
        normalizedValue: normalized,
        sourceKind: 'contact_phone',
        sourceFieldKey: 'contact_phones',
        sourceFieldLabel: 'Phone',
      })
    );
  }

  pushName(drafts, snapshot.contactName, {
    sourceKind: 'contact_name',
    sourceFieldKey: 'contact_name',
    sourceFieldLabel: 'Contact name',
  });

  pushName(drafts, snapshot.projectName, {
    sourceKind: 'project_name',
    sourceFieldKey: 'name',
    sourceFieldLabel: 'Project name',
  });

  const nameParts = snapshot.nameParts;
  if (nameParts != null) {
    if (nameParts.fullName != null && nameParts.fullName.trim() !== '') {
      pushName(drafts, nameParts.fullName, {
        sourceKind: 'name_parts',
        sourceFieldKey: 'full_name',
        sourceFieldLabel: 'Full name',
      });
    }
    const first = nameParts.firstName?.trim() ?? '';
    const last = nameParts.lastName?.trim() ?? '';
    if (first && last) {
      pushName(drafts, `${first} ${last}`, {
        sourceKind: 'name_parts',
        sourceFieldKey: 'first_name+last_name',
        sourceFieldLabel: 'First + last name',
      });
    }
    // Do not index lone first/last tokens from nameParts — weak alone.
  }

  const addressNormalized = normalizeIdentityAddress(snapshot.address);
  if (addressNormalized != null) {
    drafts.push(
      makeDraft({
        valueType: 'address',
        normalizedValue: addressNormalized,
        sourceKind: 'project_address',
        sourceFieldKey: 'address',
        sourceFieldLabel: 'Address',
      })
    );
  }

  let firstNameRaw: string | null = null;
  let firstNameMeta: {
    readonly fieldKey: string;
    readonly label: string;
    readonly valueId: string | null;
  } | null = null;
  let lastNameRaw: string | null = null;
  let lastNameMeta: {
    readonly fieldKey: string;
    readonly label: string;
    readonly valueId: string | null;
  } | null = null;

  for (const field of snapshot.customFields) {
    const raw = field.valueText?.trim() ?? '';
    if (!raw) continue;

    const role = classifyCustomFieldIdentityRole({
      fieldKey: field.fieldKey,
      label: field.label,
    });
    if (role === 'exclude') continue;

    const source = {
      sourceKind: 'custom_field' as const,
      sourceFieldKey: field.fieldKey,
      sourceFieldLabel: field.label,
      sourceValueId: field.valueId,
    };

    switch (role) {
      case 'person_full_name': {
        pushName(drafts, raw, source);
        break;
      }
      case 'person_first_name': {
        if (firstNameRaw == null) {
          firstNameRaw = raw;
          firstNameMeta = {
            fieldKey: field.fieldKey,
            label: field.label,
            valueId: field.valueId,
          };
        }
        break;
      }
      case 'person_last_name': {
        if (lastNameRaw == null) {
          lastNameRaw = raw;
          lastNameMeta = {
            fieldKey: field.fieldKey,
            label: field.label,
            valueId: field.valueId,
          };
        }
        break;
      }
      case 'email': {
        const normalized = normalizeIdentityEmail(raw);
        if (normalized != null) {
          drafts.push(
            makeDraft({
              valueType: 'email',
              normalizedValue: normalized,
              ...source,
            })
          );
        }
        break;
      }
      case 'phone': {
        const normalized = normalizeIdentityPhone(raw);
        if (normalized != null) {
          drafts.push(
            makeDraft({
              valueType: 'phone',
              normalizedValue: normalized,
              ...source,
            })
          );
        }
        break;
      }
      case 'address': {
        const normalized = normalizeIdentityTextValue(raw);
        if (normalized != null) {
          drafts.push(
            makeDraft({
              valueType: 'address',
              normalizedValue: normalized,
              ...source,
            })
          );
        }
        break;
      }
      case 'identity_text': {
        // Value-shape overrides for mislabeled fields
        const asEmail = normalizeIdentityEmail(raw);
        if (asEmail != null) {
          drafts.push(
            makeDraft({
              valueType: 'email',
              normalizedValue: asEmail,
              ...source,
            })
          );
          break;
        }
        const asPhone = normalizeIdentityPhone(raw);
        if (asPhone != null) {
          drafts.push(
            makeDraft({
              valueType: 'phone',
              normalizedValue: asPhone,
              ...source,
            })
          );
          break;
        }
        const asText = normalizeIdentityTextValue(raw);
        if (asText != null) {
          drafts.push(
            makeDraft({
              valueType: 'identity_text',
              normalizedValue: asText,
              ...source,
            })
          );
        }
        break;
      }
      default: {
        const _exhaustive: never = role;
        void _exhaustive;
      }
    }
  }

  if (firstNameRaw != null && lastNameRaw != null) {
    pushName(drafts, `${firstNameRaw} ${lastNameRaw}`, {
      sourceKind: 'custom_field',
      sourceFieldKey:
        firstNameMeta && lastNameMeta
          ? `${firstNameMeta.fieldKey}+${lastNameMeta.fieldKey}`
          : 'first_name+last_name',
      sourceFieldLabel:
        firstNameMeta && lastNameMeta
          ? `${firstNameMeta.label} + ${lastNameMeta.label}`
          : 'First + last name',
      sourceValueId: firstNameMeta?.valueId ?? lastNameMeta?.valueId ?? null,
    });
  }
  // Intentionally do not index lone first/last custom-field tokens.

  return collapseIdentityValueDrafts(drafts);
}
