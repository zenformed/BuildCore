/**
 * Merge-review resolution model for import rows marked as the same record.
 * UI + validation + live preview only — applying merges on the server is deferred.
 */

import { extractUsPhoneDigits, formatUsPhoneDisplay } from '@/domain/crm/phoneFormat';
import {
  MAX_CONTACT_EMAILS,
  MAX_CONTACT_PHONES,
  normalizeContactEmails,
  normalizeContactPhones,
} from '@/domain/crm/contactMultiValue';

export const IMPORT_MERGE_RECORD_ACTIONS = [
  'merge_into_existing',
  'keep_both',
  'replace_existing',
] as const;

export type ImportMergeRecordAction = (typeof IMPORT_MERGE_RECORD_ACTIONS)[number];

export const IMPORT_MERGE_SCALAR_ACTIONS = [
  'keep_existing',
  'use_imported',
] as const;
export type ImportMergeScalarAction = (typeof IMPORT_MERGE_SCALAR_ACTIONS)[number];

export const IMPORT_MERGE_CUSTOM_ACTIONS = [
  'keep_existing',
  'use_imported',
  'ignore_imported',
] as const;
export type ImportMergeCustomAction = (typeof IMPORT_MERGE_CUSTOM_ACTIONS)[number];

export const IMPORT_MERGE_NOTES_ACTIONS = [
  'append',
  'replace',
  'keep_existing',
] as const;
export type ImportMergeNotesAction = (typeof IMPORT_MERGE_NOTES_ACTIONS)[number];

export const IMPORT_MERGE_CUSTOM_FIELD_VISIBLE_LIMIT = 8;

export type ImportMergeContactOption = {
  readonly value: string;
  readonly normalizedKey: string;
  readonly fromExisting: boolean;
  readonly fromImported: boolean;
  readonly selected: boolean;
};

export type ImportMergeMultiValue = {
  readonly value: string;
  readonly isPrimary: boolean;
};

export type ImportMergeFieldIdentical = {
  readonly kind: 'identical';
  readonly fieldKey: string;
  readonly label: string;
  readonly value: string;
  readonly requiresDecision: false;
};

export type ImportMergeFieldScalar = {
  readonly kind: 'scalar';
  readonly fieldKey: string;
  readonly label: string;
  readonly existingValue: string;
  readonly importedValue: string;
  readonly action: ImportMergeScalarAction;
  readonly requiresDecision: false;
};

export type ImportMergeFieldContactCollection = {
  readonly kind: 'contact_collection';
  readonly fieldKey: 'phone' | 'email';
  readonly label: string;
  readonly options: readonly ImportMergeContactOption[];
  readonly primaryValue: string | null;
  readonly maxSelected: number;
  readonly requiresDecision: boolean;
};

export type ImportMergeFieldNotes = {
  readonly kind: 'notes';
  readonly fieldKey: 'notes';
  readonly label: string;
  readonly existingValue: string;
  readonly importedValue: string;
  readonly action: ImportMergeNotesAction;
  readonly requiresDecision: false;
};

export type ImportMergeFieldFiles = {
  readonly kind: 'files';
  readonly fieldKey: 'photos' | 'documents';
  readonly label: string;
  readonly existingCount: number;
  readonly importedCount: number;
  readonly requiresDecision: false;
};

export type ImportMergeFieldCustom = {
  readonly kind: 'custom';
  readonly fieldKey: string;
  readonly label: string;
  readonly existingValue: string;
  readonly importedValue: string;
  readonly action: ImportMergeCustomAction;
  readonly requiresDecision: false;
};

export type ImportMergeFieldState =
  | ImportMergeFieldIdentical
  | ImportMergeFieldScalar
  | ImportMergeFieldContactCollection
  | ImportMergeFieldNotes
  | ImportMergeFieldFiles
  | ImportMergeFieldCustom;

export type ImportMergeGroupDecision = {
  readonly incomingId: string;
  readonly matchedRecordId: string;
  readonly recordAction: ImportMergeRecordAction;
  readonly replaceConfirmed: boolean;
  readonly fields: readonly ImportMergeFieldState[];
  readonly showIdenticalFields: boolean;
  readonly showAllCustomFields: boolean;
};

export type ImportMergeDecisionMap = Readonly<Record<string, ImportMergeGroupDecision>>;

export type ImportMergeCustomFieldValue = {
  readonly fieldKey: string;
  readonly label: string;
  readonly valueText: string;
};

function normalizeTextKey(value: string): string {
  return value.trim().toLocaleLowerCase('en-US');
}

export function normalizeMergePhoneKey(value: string): string {
  const digits = extractUsPhoneDigits(value);
  if (digits.length === 10) return digits;
  return normalizeTextKey(value);
}

export function normalizeMergeEmailKey(value: string): string {
  return normalizeTextKey(value);
}

export function displayMergePhone(value: string): string {
  return formatUsPhoneDisplay(value) || value.trim();
}

export function displayMergeEmail(value: string): string {
  return value.trim();
}

function withRequiresDecision(
  field: ImportMergeFieldContactCollection
): ImportMergeFieldContactCollection {
  const selected = field.options.filter((option) => option.selected);
  const primaryOk =
    selected.length === 0 ||
    (field.primaryValue != null &&
      selected.some((option) => option.value === field.primaryValue));
  const withinLimit = selected.length <= field.maxSelected;
  return {
    ...field,
    requiresDecision: !primaryOk || !withinLimit,
  };
}

export function buildContactCollectionField(input: {
  readonly fieldKey: 'phone' | 'email';
  readonly label: string;
  readonly existingValues: readonly string[];
  readonly importedValues: readonly string[];
}): ImportMergeFieldIdentical | ImportMergeFieldContactCollection | null {
  const isPhone = input.fieldKey === 'phone';
  const maxSelected = isPhone ? MAX_CONTACT_PHONES : MAX_CONTACT_EMAILS;
  const normalizeKey = isPhone ? normalizeMergePhoneKey : normalizeMergeEmailKey;
  const display = isPhone ? displayMergePhone : displayMergeEmail;

  const existingNorm = isPhone
    ? normalizeContactPhones(input.existingValues)
    : normalizeContactEmails(input.existingValues);
  const importedNorm = isPhone
    ? normalizeContactPhones(input.importedValues)
    : normalizeContactEmails(input.importedValues);

  if (existingNorm.length === 0 && importedNorm.length === 0) return null;

  const byKey = new Map<
    string,
    {
      value: string;
      fromExisting: boolean;
      fromImported: boolean;
    }
  >();

  for (const raw of existingNorm) {
    const key = normalizeKey(raw);
    if (!key) continue;
    const prev = byKey.get(key);
    byKey.set(key, {
      value: prev?.value ?? display(raw),
      fromExisting: true,
      fromImported: prev?.fromImported ?? false,
    });
  }
  for (const raw of importedNorm) {
    const key = normalizeKey(raw);
    if (!key) continue;
    const prev = byKey.get(key);
    byKey.set(key, {
      value: prev?.value ?? display(raw),
      fromExisting: prev?.fromExisting ?? false,
      fromImported: true,
    });
  }

  const entries = [...byKey.entries()];
  if (entries.length === 0) return null;

  const existingKeys = new Set(existingNorm.map(normalizeKey).filter(Boolean));
  const importedKeys = new Set(importedNorm.map(normalizeKey).filter(Boolean));
  if (
    existingKeys.size > 0 &&
    importedKeys.size > 0 &&
    existingKeys.size === importedKeys.size &&
    [...existingKeys].every((key) => importedKeys.has(key))
  ) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existingNorm.map(display).join(', '),
      requiresDecision: false,
    };
  }

  if (existingNorm.length === 0 || importedNorm.length === 0) {
    const only = existingNorm.length > 0 ? existingNorm : importedNorm;
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: only.map(display).join(', '),
      requiresDecision: false,
    };
  }

  // Prefer selecting existing values first, then imported, up to max.
  let selectedBudget = maxSelected;
  const options: ImportMergeContactOption[] = entries.map(([normalizedKey, entry]) => {
    const selected = selectedBudget > 0;
    if (selected) selectedBudget -= 1;
    return {
      value: entry.value,
      normalizedKey,
      fromExisting: entry.fromExisting,
      fromImported: entry.fromImported,
      selected,
    };
  });

  const selectedValues = options.filter((option) => option.selected).map((option) => option.value);
  const existingPrimary = existingNorm[0] ? display(existingNorm[0]) : null;
  const primaryValue =
    (existingPrimary != null && selectedValues.includes(existingPrimary)
      ? existingPrimary
      : selectedValues[0]) ?? null;

  return withRequiresDecision({
    kind: 'contact_collection',
    fieldKey: input.fieldKey,
    label: input.label,
    options,
    primaryValue,
    maxSelected,
    requiresDecision: false,
  });
}

export function toggleContactCollectionOption(
  field: ImportMergeFieldContactCollection,
  normalizedKey: string
): ImportMergeFieldContactCollection {
  const currentlySelected = field.options.filter((option) => option.selected).length;
  const options = field.options.map((option) => {
    if (option.normalizedKey !== normalizedKey) return option;
    if (!option.selected && currentlySelected >= field.maxSelected) {
      return option;
    }
    return { ...option, selected: !option.selected };
  });
  const selected = options.filter((option) => option.selected);
  let primaryValue = field.primaryValue;
  if (primaryValue != null && !selected.some((option) => option.value === primaryValue)) {
    primaryValue = selected[0]?.value ?? null;
  }
  if (primaryValue == null && selected.length > 0) {
    primaryValue = selected[0]!.value;
  }
  return withRequiresDecision({ ...field, options, primaryValue });
}

export function setContactCollectionPrimary(
  field: ImportMergeFieldContactCollection,
  primaryValue: string
): ImportMergeFieldContactCollection {
  const selected = field.options.filter((option) => option.selected);
  if (!selected.some((option) => option.value === primaryValue)) return field;
  return withRequiresDecision({ ...field, primaryValue });
}

export function resolveContactCollectionResult(
  field: ImportMergeFieldContactCollection
): readonly ImportMergeMultiValue[] {
  const selected = field.options.filter((option) => option.selected);
  if (selected.length === 0) return [];
  const primary = field.primaryValue;
  // Keep option order stable so selecting primary only moves the Primary badge.
  return selected.map((option, index) => ({
    value: option.value,
    isPrimary: primary != null ? option.value === primary : index === 0,
  }));
}

export function buildIdenticalOrScalarField(input: {
  readonly fieldKey: string;
  readonly label: string;
  readonly existingValue: string | null | undefined;
  readonly importedValue: string | null | undefined;
  readonly defaultAction?: ImportMergeScalarAction;
}): ImportMergeFieldIdentical | ImportMergeFieldScalar | null {
  const existing = input.existingValue?.trim() ?? '';
  const imported = input.importedValue?.trim() ?? '';
  if (!existing && !imported) return null;
  if (existing && imported && normalizeTextKey(existing) === normalizeTextKey(imported)) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existing,
      requiresDecision: false,
    };
  }
  if (!existing || !imported) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: existing || imported,
      requiresDecision: false,
    };
  }
  return {
    kind: 'scalar',
    fieldKey: input.fieldKey,
    label: input.label,
    existingValue: existing,
    importedValue: imported,
    action: input.defaultAction ?? 'keep_existing',
    requiresDecision: false,
  };
}

export function buildNotesMergeField(input: {
  readonly label: string;
  readonly existingValue: string | null | undefined;
  readonly importedValue: string | null | undefined;
}): ImportMergeFieldIdentical | ImportMergeFieldNotes | null {
  const existing = input.existingValue?.trim() ?? '';
  const imported = input.importedValue?.trim() ?? '';
  if (!existing && !imported) return null;
  if (existing && imported && normalizeTextKey(existing) === normalizeTextKey(imported)) {
    return {
      kind: 'identical',
      fieldKey: 'notes',
      label: input.label,
      value: existing,
      requiresDecision: false,
    };
  }
  if (!existing || !imported) {
    return {
      kind: 'identical',
      fieldKey: 'notes',
      label: input.label,
      value: existing || imported,
      requiresDecision: false,
    };
  }
  return {
    kind: 'notes',
    fieldKey: 'notes',
    label: input.label,
    existingValue: existing,
    importedValue: imported,
    action: 'append',
    requiresDecision: false,
  };
}

export function buildFilesMergeField(input: {
  readonly fieldKey: 'photos' | 'documents';
  readonly label: string;
  readonly existingCount: number;
  readonly importedCount: number;
}): ImportMergeFieldFiles | ImportMergeFieldIdentical | null {
  const existingCount = Math.max(0, input.existingCount);
  const importedCount = Math.max(0, input.importedCount);
  if (existingCount === 0 && importedCount === 0) return null;
  if (importedCount === 0) {
    return {
      kind: 'identical',
      fieldKey: input.fieldKey,
      label: input.label,
      value: String(existingCount),
      requiresDecision: false,
    };
  }
  return {
    kind: 'files',
    fieldKey: input.fieldKey,
    label: input.label,
    existingCount,
    importedCount,
    requiresDecision: false,
  };
}

export function buildCustomMergeFields(input: {
  readonly existing: readonly ImportMergeCustomFieldValue[];
  readonly imported: readonly ImportMergeCustomFieldValue[];
}): ImportMergeFieldState[] {
  const byKey = new Map<
    string,
    { label: string; existingValue: string; importedValue: string }
  >();
  for (const field of input.existing) {
    const key = field.fieldKey.trim();
    if (!key) continue;
    byKey.set(key, {
      label: field.label.trim() || key,
      existingValue: field.valueText.trim(),
      importedValue: '',
    });
  }
  for (const field of input.imported) {
    const key = field.fieldKey.trim();
    if (!key) continue;
    const prev = byKey.get(key);
    byKey.set(key, {
      label: field.label.trim() || prev?.label || key,
      existingValue: prev?.existingValue ?? '',
      importedValue: field.valueText.trim(),
    });
  }

  const fields: ImportMergeFieldState[] = [];
  for (const [fieldKey, entry] of [...byKey.entries()].sort((a, b) =>
    a[1].label.localeCompare(b[1].label)
  )) {
    if (!entry.existingValue && !entry.importedValue) continue;
    if (
      entry.existingValue &&
      entry.importedValue &&
      normalizeTextKey(entry.existingValue) === normalizeTextKey(entry.importedValue)
    ) {
      fields.push({
        kind: 'identical',
        fieldKey: `custom:${fieldKey}`,
        label: entry.label,
        value: entry.existingValue,
        requiresDecision: false,
      });
      continue;
    }
    if (!entry.existingValue || !entry.importedValue) {
      fields.push({
        kind: 'identical',
        fieldKey: `custom:${fieldKey}`,
        label: entry.label,
        value: entry.existingValue || entry.importedValue,
        requiresDecision: false,
      });
      continue;
    }
    fields.push({
      kind: 'custom',
      fieldKey: `custom:${fieldKey}`,
      label: entry.label,
      existingValue: entry.existingValue,
      importedValue: entry.importedValue,
      action: 'keep_existing',
      requiresDecision: false,
    });
  }
  return fields;
}

export function resolveScalarResult(field: ImportMergeFieldScalar): string {
  return field.action === 'use_imported' ? field.importedValue : field.existingValue;
}

export function resolveNotesResult(field: ImportMergeFieldNotes): string {
  if (field.action === 'keep_existing') return field.existingValue;
  if (field.action === 'replace') return field.importedValue;
  return `${field.existingValue}\n---\n${field.importedValue}`;
}

export function resolveCustomResult(field: ImportMergeFieldCustom): string {
  if (field.action === 'use_imported') return field.importedValue;
  if (field.action === 'ignore_imported') return field.existingValue;
  return field.existingValue;
}

export function resolveFilesResult(field: ImportMergeFieldFiles): number {
  return field.existingCount + field.importedCount;
}

export function replaceMergeReviewField(
  fields: readonly ImportMergeFieldState[],
  next: ImportMergeFieldState
): ImportMergeFieldState[] {
  return fields.map((field) => (field.fieldKey === next.fieldKey ? next : field));
}

export function createDefaultMergeGroupDecision(input: {
  readonly incomingId: string;
  readonly matchedRecordId: string;
  readonly fields: readonly ImportMergeFieldState[];
}): ImportMergeGroupDecision {
  return {
    incomingId: input.incomingId,
    matchedRecordId: input.matchedRecordId,
    recordAction: 'merge_into_existing',
    replaceConfirmed: false,
    fields: input.fields,
    showIdenticalFields: false,
    showAllCustomFields: false,
  };
}

export function countImportMergeGroupDecisionsRemaining(
  decision: ImportMergeGroupDecision | null | undefined
): number {
  if (decision == null) return 1;
  if (decision.recordAction === 'keep_both') return 0;
  if (decision.recordAction === 'replace_existing') {
    return decision.replaceConfirmed ? 0 : 1;
  }
  let remaining = 0;
  for (const field of decision.fields) {
    if (field.kind === 'contact_collection' && field.requiresDecision) {
      remaining += 1;
    }
  }
  return remaining;
}

export function areImportMergeDecisionsComplete(
  incomingIds: readonly string[],
  decisions: ImportMergeDecisionMap
): boolean {
  for (const id of incomingIds) {
    if (countImportMergeGroupDecisionsRemaining(decisions[id]) > 0) return false;
  }
  return true;
}

export function countImportMergeDecisionsRemaining(
  incomingIds: readonly string[],
  decisions: ImportMergeDecisionMap
): number {
  let total = 0;
  for (const id of incomingIds) {
    total += countImportMergeGroupDecisionsRemaining(decisions[id]);
  }
  return total;
}

export type ImportMergeSummaryBullet = {
  readonly id: string;
  readonly text: string;
};

export function buildImportMergeSummaryBullets(input: {
  readonly decision: ImportMergeGroupDecision;
  readonly copy: {
    readonly existingRemains: string;
    readonly importedRemoved: string;
    readonly keepBoth: string;
    readonly replaceExisting: string;
    readonly addressReplaced: string;
    readonly addressKept: string;
    readonly stageKept: string;
    readonly stageUpdated: (stage: string) => string;
    readonly phonesRetained: (count: number) => string;
    readonly emailsRetained: (count: number) => string;
    readonly primaryPhone: (value: string) => string;
    readonly primaryEmail: (value: string) => string;
    readonly notesAppended: string;
    readonly notesReplaced: string;
    readonly notesKept: string;
    readonly photosCombined: (existing: number, imported: number, total: number) => string;
    readonly documentsCombined: (existing: number, imported: number, total: number) => string;
    readonly contactKept: string;
    readonly contactReplaced: (value: string) => string;
    readonly nameKept: string;
    readonly nameReplaced: (value: string) => string;
    readonly customUpdated: (count: number) => string;
  };
}): readonly ImportMergeSummaryBullet[] {
  const { decision, copy } = input;
  const bullets: ImportMergeSummaryBullet[] = [];

  if (decision.recordAction === 'keep_both') {
    return [{ id: 'keep-both', text: copy.keepBoth }];
  }
  if (decision.recordAction === 'replace_existing') {
    return [{ id: 'replace', text: copy.replaceExisting }];
  }

  bullets.push({ id: 'existing-remains', text: copy.existingRemains });
  bullets.push({ id: 'imported-removed', text: copy.importedRemoved });

  let customUpdated = 0;
  for (const field of decision.fields) {
    if (field.kind === 'identical') continue;
    if (field.kind === 'scalar') {
      const replaced = field.action === 'use_imported';
      if (field.fieldKey === 'address') {
        bullets.push({
          id: 'address',
          text: replaced ? copy.addressReplaced : copy.addressKept,
        });
      } else if (field.fieldKey === 'stage') {
        bullets.push({
          id: 'stage',
          text: replaced ? copy.stageUpdated(field.importedValue) : copy.stageKept,
        });
      } else if (field.fieldKey === 'contact') {
        bullets.push({
          id: 'contact',
          text: replaced ? copy.contactReplaced(field.importedValue) : copy.contactKept,
        });
      } else if (field.fieldKey === 'name') {
        bullets.push({
          id: 'name',
          text: replaced ? copy.nameReplaced(field.importedValue) : copy.nameKept,
        });
      }
      continue;
    }
    if (field.kind === 'contact_collection') {
      const result = resolveContactCollectionResult(field);
      if (field.fieldKey === 'phone') {
        bullets.push({ id: 'phones', text: copy.phonesRetained(result.length) });
        const primary = result.find((value) => value.isPrimary)?.value;
        if (primary) bullets.push({ id: 'primary-phone', text: copy.primaryPhone(primary) });
      } else {
        bullets.push({ id: 'emails', text: copy.emailsRetained(result.length) });
        const primary = result.find((value) => value.isPrimary)?.value;
        if (primary) bullets.push({ id: 'primary-email', text: copy.primaryEmail(primary) });
      }
      continue;
    }
    if (field.kind === 'notes') {
      bullets.push({
        id: 'notes',
        text:
          field.action === 'append'
            ? copy.notesAppended
            : field.action === 'replace'
              ? copy.notesReplaced
              : copy.notesKept,
      });
      continue;
    }
    if (field.kind === 'files') {
      const total = resolveFilesResult(field);
      bullets.push({
        id: field.fieldKey,
        text:
          field.fieldKey === 'photos'
            ? copy.photosCombined(field.existingCount, field.importedCount, total)
            : copy.documentsCombined(field.existingCount, field.importedCount, total),
      });
      continue;
    }
    if (field.kind === 'custom' && field.action === 'use_imported') {
      customUpdated += 1;
    }
  }
  if (customUpdated > 0) {
    bullets.push({ id: 'custom', text: copy.customUpdated(customUpdated) });
  }
  return bullets;
}

/** @deprecated Prefer buildContactCollectionField */
export function buildMultiMergeReviewField(input: {
  readonly fieldKey: string;
  readonly label: string;
  readonly existingValues: readonly string[];
  readonly importedValues: readonly string[];
}): ImportMergeFieldIdentical | ImportMergeFieldContactCollection | null {
  if (input.fieldKey !== 'phone' && input.fieldKey !== 'email') return null;
  return buildContactCollectionField({
    fieldKey: input.fieldKey,
    label: input.label,
    existingValues: input.existingValues,
    importedValues: input.importedValues,
  });
}

/** @deprecated */
export function mergeContactValueLists(
  existing: readonly string[],
  imported: readonly string[],
  limit: number = MAX_CONTACT_PHONES
): string[] {
  const field = buildContactCollectionField({
    fieldKey: 'phone',
    label: 'Phone',
    existingValues: existing,
    importedValues: imported,
  });
  if (field == null) return [];
  if (field.kind === 'identical') {
    return field.value
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean)
      .slice(0, limit);
  }
  return resolveContactCollectionResult(field)
    .map((value) => value.value)
    .slice(0, limit);
}

/** @deprecated */
export function resolveMultiResult(
  field: ImportMergeFieldContactCollection
): readonly ImportMergeMultiValue[] {
  return resolveContactCollectionResult(field);
}
