/**
 * Field-level parent conflict resolution for master_hierarchy create_new groups.
 */

import {
  clampImportCell,
  normalizeImportText,
  type CrmImportParentFieldConflict,
} from '@/domain/crm/spreadsheetImportGrouping';
import { parseImportDealValueToCents } from '@/domain/crm/spreadsheetImportValidation';
import type {
  CrmImportColumnMapping,
  CrmImportParsedRow,
  CrmImportResolvedParentAttributes,
} from '@/domain/crm/spreadsheetImportTypes';

export type CrmImportFieldConflictResolution =
  | { readonly kind: 'choose_existing'; readonly value: string }
  | { readonly kind: 'replacement'; readonly value: string };

export type CrmImportConflictResolutionMap = Readonly<
  Record<string, CrmImportFieldConflictResolution>
>;

export function parentOwnedFieldKey(mapping: CrmImportColumnMapping): string | null {
  if (mapping.ownership === 'ignored' || mapping.destination.kind === 'ignored') {
    return null;
  }
  const isParentOwned =
    mapping.ownership === 'parent' ||
    (mapping.destination.kind === 'standard_field' &&
      mapping.destination.entity === 'parent') ||
    ((mapping.destination.kind === 'existing_custom_field' ||
      mapping.destination.kind === 'new_custom_field') &&
      mapping.destination.scope === 'project');
  if (!isParentOwned) return null;

  if (mapping.destination.kind === 'standard_field') return mapping.destination.key;
  if (mapping.destination.kind === 'existing_custom_field') {
    return `cf:${mapping.destination.fieldKey}`;
  }
  if (mapping.destination.kind === 'new_custom_field') {
    return `cf_new:${mapping.destination.proposedLabel}`;
  }
  return null;
}

export function unresolvedParentConflictFieldKeys(
  conflicts: readonly CrmImportParentFieldConflict[],
  resolutions: CrmImportConflictResolutionMap | null | undefined
): readonly string[] {
  const map = resolutions ?? {};
  return conflicts
    .filter((conflict) => {
      const resolution = map[conflict.fieldKey];
      if (resolution == null) return true;
      return resolution.value.trim() === '';
    })
    .map((c) => c.fieldKey);
}

export function areParentConflictsResolved(
  conflicts: readonly CrmImportParentFieldConflict[],
  resolutions: CrmImportConflictResolutionMap | null | undefined
): boolean {
  return unresolvedParentConflictFieldKeys(conflicts, resolutions).length === 0;
}

function resolvedValueForConflict(
  conflict: CrmImportParentFieldConflict,
  resolutions: CrmImportConflictResolutionMap
): string | null {
  const resolution = resolutions[conflict.fieldKey];
  if (resolution == null) return null;
  const trimmed = resolution.value.trim();
  return trimmed || null;
}

function applyStandardFieldValue(
  attrs: CrmImportResolvedParentAttributes,
  key: string,
  raw: string
): CrmImportResolvedParentAttributes {
  switch (key) {
    case 'parent_name':
      return { ...attrs, name: raw };
    case 'parent_identifier':
      return { ...attrs, parentIdentifierValue: raw };
    case 'contact_name':
      return { ...attrs, contactName: raw };
    case 'emails':
      return {
        ...attrs,
        emails: raw.split(/[;,]/).map((e) => e.trim()).filter(Boolean),
      };
    case 'phones':
      return {
        ...attrs,
        phones: raw.split(/[;,]/).map((e) => e.trim()).filter(Boolean),
      };
    case 'notes':
      return { ...attrs, notes: raw };
    case 'industry':
      return { ...attrs, industry: raw };
    case 'custom_industry':
      return { ...attrs, customIndustry: raw };
    case 'priority':
      return { ...attrs, priority: raw };
    case 'stage':
      return { ...attrs, currentStageSlug: raw };
    case 'assignee_email':
      return attrs; // resolved later via member map at execute time if needed
    case 'deal_value': {
      const parsed = parseImportDealValueToCents(raw);
      return parsed.ok ? { ...attrs, dealValueCents: parsed.cents } : attrs;
    }
    case 'address_line_1':
      return { ...attrs, addressLine1: raw };
    case 'address_line_2':
      return { ...attrs, addressLine2: raw };
    case 'city':
      return { ...attrs, city: raw };
    case 'state':
      return { ...attrs, state: raw };
    case 'postal_code':
      return { ...attrs, postalCode: raw };
    default:
      return attrs;
  }
}

function applyFieldKeyValue(
  attrs: CrmImportResolvedParentAttributes,
  fieldKey: string,
  raw: string
): CrmImportResolvedParentAttributes {
  if (fieldKey.startsWith('cf:')) {
    const key = fieldKey.slice(3);
    return {
      ...attrs,
      customFieldValues: { ...(attrs.customFieldValues ?? {}), [key]: raw },
    };
  }
  if (fieldKey.startsWith('cf_new:')) {
    const label = fieldKey.slice(7);
    const key = `import:${normalizeImportText(label).replace(/\s+/g, '_')}`;
    return {
      ...attrs,
      customFieldValues: { ...(attrs.customFieldValues ?? {}), [key]: raw },
    };
  }
  return applyStandardFieldValue(attrs, fieldKey, raw);
}

/**
 * Build parent attributes for create_new from parent-owned columns.
 * Conflicting fields require an explicit resolution — never first/last silently.
 */
export function buildResolvedParentAttributesForGroup(input: {
  readonly displayParentName: string;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly conflicts: readonly CrmImportParentFieldConflict[];
  readonly conflictResolutions: CrmImportConflictResolutionMap;
}): {
  readonly ok: true;
  readonly attributes: CrmImportResolvedParentAttributes;
} | {
  readonly ok: false;
  readonly unresolvedFieldKeys: readonly string[];
} {
  const unresolved = unresolvedParentConflictFieldKeys(
    input.conflicts,
    input.conflictResolutions
  );
  if (unresolved.length > 0) {
    return { ok: false, unresolvedFieldKeys: unresolved };
  }

  const conflictByKey = new Map(input.conflicts.map((c) => [c.fieldKey, c]));
  let attrs: CrmImportResolvedParentAttributes = {
    name: input.displayParentName.trim() || 'Imported project',
  };

  for (const mapping of input.mappings) {
    const fieldKey = parentOwnedFieldKey(mapping);
    if (fieldKey == null) continue;

    const conflict = conflictByKey.get(fieldKey);
    if (conflict != null) {
      const value = resolvedValueForConflict(conflict, input.conflictResolutions);
      if (value == null) continue;
      attrs = applyFieldKeyValue(attrs, fieldKey, value);
      continue;
    }

    const buckets = new Map<string, string>();
    for (const row of input.rows) {
      const raw = clampImportCell(row.cells[mapping.sourceIndex] ?? '').trim();
      if (!raw) continue;
      const norm = normalizeImportText(raw);
      if (!buckets.has(norm)) buckets.set(norm, raw);
    }
    if (buckets.size === 1) {
      const only = Array.from(buckets.values())[0]!;
      attrs = applyFieldKeyValue(attrs, fieldKey, only);
    }
  }

  return { ok: true, attributes: attrs };
}

/** Hydrate UI draft conflict resolutions from persisted conflict_state. */
export function parsePersistedConflictResolutions(
  conflictState: unknown
): CrmImportConflictResolutionMap {
  if (conflictState == null || typeof conflictState !== 'object') return {};
  const record = conflictState as Record<string, unknown>;
  const resolutions = record.resolutions;
  if (resolutions == null || typeof resolutions !== 'object') return {};
  const out: Record<string, CrmImportFieldConflictResolution> = {};
  for (const [key, value] of Object.entries(resolutions as Record<string, unknown>)) {
    if (value == null || typeof value !== 'object') continue;
    const row = value as Record<string, unknown>;
    const kind = row.kind;
    const text = typeof row.value === 'string' ? row.value : '';
    if (kind === 'choose_existing' || kind === 'replacement') {
      out[key] = { kind, value: text };
    }
  }
  return out;
}
