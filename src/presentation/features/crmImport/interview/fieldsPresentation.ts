/**
 * Pure helpers for the remaining-fields mapping screen.
 */

import { CRM_IMPORT_STANDARD_FIELD_KEYS } from '@/domain/crm/spreadsheetImportTypes';
import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';
import { maxStandardFieldMappings } from '@/domain/crm/spreadsheetImportMultiValue';
import type { ExistingCustomFieldDefinition } from '@/presentation/features/crmImport/suggestColumnMappings';
import type {
  CrmImportFieldPlacement,
  CrmImportRemainingFieldDraft,
} from '@/presentation/features/crmImport/interview/interviewState';

/** Checked row without a destination yet — needs user attention. */
export const UNSET_DESTINATION_KEY = 'unset';

export const LOCKED_STANDARD_KEYS = new Set(['parent_name', 'parent_identifier', 'subproject_name']);

export type FieldsDestinationOption = {
  readonly value: string;
  readonly label: string;
  readonly group: 'contact' | 'subproject' | 'project' | 'custom';
  readonly icon: 'user' | 'mail' | 'phone' | 'pin' | 'note' | 'money' | 'assignee' | 'stage' | 'custom' | 'none';
};

export type FieldsDestinationOptionGroup = {
  readonly id: string;
  readonly label: string;
  readonly options: readonly FieldsDestinationOption[];
};

const CONTACT_KEYS = new Set(['contact_name', 'emails', 'phones', 'address_line_1', 'address_line_2', 'city', 'state', 'postal_code']);

function iconForStandardKey(key: string): FieldsDestinationOption['icon'] {
  if (key === 'contact_name') return 'user';
  if (key === 'emails') return 'mail';
  if (key === 'phones') return 'phone';
  if (key === 'notes') return 'note';
  if (key === 'deal_value') return 'money';
  if (key === 'assignee_email') return 'assignee';
  if (key === 'stage') return 'stage';
  if (
    key === 'address_line_1' ||
    key === 'address_line_2' ||
    key === 'city' ||
    key === 'state' ||
    key === 'postal_code'
  ) {
    return 'pin';
  }
  return 'none';
}

export function isRemainingFieldEnabled(draft: CrmImportRemainingFieldDraft | undefined): boolean {
  if (draft == null) return true;
  return draft.placement !== 'ignore' && draft.destinationKey !== 'ignored';
}

export function isRemainingFieldDestinationReady(
  draft: CrmImportRemainingFieldDraft | undefined
): boolean {
  if (!isRemainingFieldEnabled(draft)) return true;
  if (draft == null) return false;
  return (
    draft.destinationKey !== UNSET_DESTINATION_KEY &&
    draft.destinationKey !== '' &&
    draft.destinationKey !== 'ignored'
  );
}

/** True when the destination key exists in the current Import To option list. */
export function isKnownDestinationKey(
  destinationKey: string,
  groups: readonly FieldsDestinationOptionGroup[]
): boolean {
  if (
    destinationKey === UNSET_DESTINATION_KEY ||
    destinationKey === '' ||
    destinationKey === 'ignored'
  ) {
    return false;
  }
  return groups.some((group) =>
    group.options.some((option) => option.value === destinationKey)
  );
}

/**
 * Enabled rows need a destination that is both set and present in the dropdown.
 * Orphaned keys (e.g. removed custom fields / stale project-scoped keys) must
 * block continue — browsers otherwise show the placeholder option with no icon.
 */
export function fieldNeedsDestinationAttention(
  draft: CrmImportRemainingFieldDraft | undefined,
  groups: readonly FieldsDestinationOptionGroup[]
): boolean {
  if (!isRemainingFieldEnabled(draft) || draft == null) return false;
  if (!isRemainingFieldDestinationReady(draft)) return true;
  return !isKnownDestinationKey(draft.destinationKey, groups);
}

export function fieldsMappingSummary(
  fields: readonly CrmImportRemainingFieldDraft[],
  groups?: readonly FieldsDestinationOptionGroup[]
): {
  readonly total: number;
  readonly enabledCount: number;
  readonly needsAttentionCount: number;
} {
  let enabledCount = 0;
  let needsAttentionCount = 0;
  for (const field of fields) {
    if (isRemainingFieldEnabled(field)) {
      enabledCount += 1;
      const needsAttention =
        groups != null
          ? fieldNeedsDestinationAttention(field, groups)
          : !isRemainingFieldDestinationReady(field);
      if (needsAttention) needsAttentionCount += 1;
    }
  }
  return { total: fields.length, enabledCount, needsAttentionCount };
}

export function areFieldsReadyToContinue(
  fields: readonly CrmImportRemainingFieldDraft[],
  groups?: readonly FieldsDestinationOptionGroup[]
): boolean {
  if (groups != null) {
    return fields.every((field) => !fieldNeedsDestinationAttention(field, groups));
  }
  return fields.every((field) => isRemainingFieldDestinationReady(field));
}

/** Value to bind on the destination <select>; coerces orphaned keys to unset. */
export function resolveFieldsSelectValue(
  draft: CrmImportRemainingFieldDraft,
  groups: readonly FieldsDestinationOptionGroup[]
): string {
  if (!isRemainingFieldEnabled(draft)) return 'ignored';
  if (fieldNeedsDestinationAttention(draft, groups)) return UNSET_DESTINATION_KEY;
  return draft.destinationKey;
}

export function disableFieldForImport(
  draft: CrmImportRemainingFieldDraft
): CrmImportRemainingFieldDraft {
  return {
    sourceIndex: draft.sourceIndex,
    destinationKey: 'ignored',
    placement: 'ignore',
  };
}

export function enableFieldForImport(
  draft: CrmImportRemainingFieldDraft,
  remembered?: { readonly destinationKey: string; readonly placement: CrmImportFieldPlacement } | null
): CrmImportRemainingFieldDraft {
  if (
    remembered != null &&
    remembered.destinationKey !== 'ignored' &&
    remembered.destinationKey !== UNSET_DESTINATION_KEY &&
    remembered.placement !== 'ignore'
  ) {
    return {
      sourceIndex: draft.sourceIndex,
      destinationKey: remembered.destinationKey,
      placement: remembered.placement,
    };
  }
  return {
    sourceIndex: draft.sourceIndex,
    destinationKey: UNSET_DESTINATION_KEY,
    placement: 'subproject',
  };
}

export function findDuplicateSingleValueDestinations(
  fields: readonly CrmImportRemainingFieldDraft[]
): ReadonlyMap<string, readonly number[]> {
  const byKey = new Map<string, number[]>();
  for (const field of fields) {
    if (!isRemainingFieldEnabled(field) || !isRemainingFieldDestinationReady(field)) continue;
    if (!field.destinationKey.startsWith('standard:')) continue;
    const list = byKey.get(field.destinationKey) ?? [];
    list.push(field.sourceIndex);
    byKey.set(field.destinationKey, list);
  }
  const duplicates = new Map<string, readonly number[]>();
  for (const [destinationKey, indexes] of byKey) {
    const fieldKey = destinationKey.split(':')[2] ?? '';
    const max = maxStandardFieldMappings(fieldKey);
    if (indexes.length > max) duplicates.set(destinationKey, indexes);
  }
  return duplicates;
}

export function isDestinationTakenByOtherRow(input: {
  readonly fields: readonly CrmImportRemainingFieldDraft[];
  readonly sourceIndex: number;
  readonly destinationKey: string;
}): boolean {
  if (!input.destinationKey.startsWith('standard:')) return false;
  const key = input.destinationKey.split(':')[2] ?? '';
  const max = maxStandardFieldMappings(key);
  const othersCount = input.fields.filter(
    (field) =>
      field.sourceIndex !== input.sourceIndex &&
      isRemainingFieldEnabled(field) &&
      field.destinationKey === input.destinationKey
  ).length;
  return othersCount >= max;
}

export function buildFieldsDestinationGroups(input: {
  readonly mode: CrmImportMode;
  readonly existingCustomFields: readonly ExistingCustomFieldDefinition[];
  readonly labels: {
    readonly standardFields: Record<string, string>;
    readonly contactGroup: string;
    readonly subprojectGroup: string;
    readonly projectGroup: string;
    readonly customGroup: string;
    readonly newCustomField: string;
    readonly chooseDestination: string;
  };
}): readonly FieldsDestinationOptionGroup[] {
  const includeProject = input.mode === 'master_hierarchy';
  const contact: FieldsDestinationOption[] = [];
  const subproject: FieldsDestinationOption[] = [];
  const project: FieldsDestinationOption[] = [];

  for (const key of CRM_IMPORT_STANDARD_FIELD_KEYS) {
    if (LOCKED_STANDARD_KEYS.has(key)) continue;
    const label = input.labels.standardFields[key] ?? key;
    const icon = iconForStandardKey(key);
    if (CONTACT_KEYS.has(key)) {
      contact.push({
        value: `standard:subproject:${key}`,
        label,
        group: 'contact',
        icon,
      });
      continue;
    }
    subproject.push({
      value: `standard:subproject:${key}`,
      label,
      group: 'subproject',
      icon,
    });
    if (includeProject) {
      project.push({
        value: `standard:project:${key}`,
        label,
        group: 'project',
        icon,
      });
    }
  }

  const custom: FieldsDestinationOption[] = [];
  for (const field of input.existingCustomFields) {
    if (input.mode === 'into_existing_parent' && field.scope === 'project') continue;
    custom.push({
      value: `existing_cf:${field.scope}:${field.fieldKey}:${field.definitionId}`,
      label: field.label,
      group: 'custom',
      icon: 'custom',
    });
  }
  custom.push({
    value: 'new_cf:new',
    label: input.labels.newCustomField,
    group: 'custom',
    icon: 'custom',
  });

  const groups: FieldsDestinationOptionGroup[] = [
    { id: 'contact', label: input.labels.contactGroup, options: contact },
    { id: 'subproject', label: input.labels.subprojectGroup, options: subproject },
  ];
  if (includeProject && project.length > 0) {
    groups.push({ id: 'project', label: input.labels.projectGroup, options: project });
  }
  groups.push({ id: 'custom', label: input.labels.customGroup, options: custom });
  return groups;
}

export function fieldsRowClassName(input: {
  readonly enabled: boolean;
  readonly needsAttention: boolean;
  readonly styles: { readonly row: string; readonly muted: string; readonly attention: string };
}): string {
  return [
    input.styles.row,
    input.enabled ? '' : input.styles.muted,
    input.enabled && input.needsAttention ? input.styles.attention : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function shouldConfirmAutoMatch(input: {
  readonly current: readonly CrmImportRemainingFieldDraft[];
  readonly suggested: readonly CrmImportRemainingFieldDraft[];
}): boolean {
  if (input.current.length === 0) return false;
  const suggestedByIndex = new Map(input.suggested.map((field) => [field.sourceIndex, field]));
  return input.current.some((field) => {
    const suggested = suggestedByIndex.get(field.sourceIndex);
    if (suggested == null) return false;
    return (
      field.destinationKey !== suggested.destinationKey || field.placement !== suggested.placement
    );
  });
}

export function iconForDestinationKey(
  destinationKey: string,
  groups: readonly FieldsDestinationOptionGroup[]
): FieldsDestinationOption['icon'] {
  for (const group of groups) {
    const match = group.options.find((option) => option.value === destinationKey);
    if (match) return match.icon;
  }
  return 'none';
}
