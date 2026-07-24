/**
 * Normalization, grouping, and conflict helpers for spreadsheet import.
 */

import {
  SPREADSHEET_IMPORT_MAX_CELL_CHARS,
  SPREADSHEET_IMPORT_MAX_HEADER_CHARS,
} from '@/domain/crm/spreadsheetImportLimits';
import type {
  CrmImportColumnMapping,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';

/** Unicode NFKC → trim → collapse whitespace → casefold. */
export function normalizeImportText(value: string): string {
  return value
    .normalize('NFKC')
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('en-US');
}

export function clampImportCell(value: string): string {
  if (value.length <= SPREADSHEET_IMPORT_MAX_CELL_CHARS) return value;
  return value.slice(0, SPREADSHEET_IMPORT_MAX_CELL_CHARS);
}

export function clampImportHeader(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= SPREADSHEET_IMPORT_MAX_HEADER_CHARS) return trimmed;
  return trimmed.slice(0, SPREADSHEET_IMPORT_MAX_HEADER_CHARS);
}

export function valuesAreEquivalentForImport(a: string, b: string): boolean {
  return normalizeImportText(a) === normalizeImportText(b);
}

export type CrmImportGroupKeyKind = 'id' | 'name' | 'unassigned' | 'fixed';

export type CrmImportBuiltGroup = {
  readonly groupKey: string;
  readonly kind: CrmImportGroupKeyKind;
  readonly rawIdentifier: string | null;
  readonly displayParentName: string;
  readonly sourceRowIndexes: readonly number[];
};

function cellForKey(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  standardKey: string
): string {
  const col = mappings.find(
    (m) =>
      m.destination.kind === 'standard_field' &&
      m.destination.key === standardKey &&
      m.destination.kind === 'standard_field'
  );
  if (col == null) return '';
  return clampImportCell(row.cells[col.sourceIndex] ?? '').trim();
}

/**
 * Build parent groups from mapped rows.
 * Priority: parent_identifier → parent_name → unassigned.
 */
export function buildImportParentGroups(input: {
  readonly mode: 'into_existing_parent' | 'master_hierarchy';
  readonly fixedParentProjectId?: string | null;
  readonly fixedParentDisplayName?: string | null;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
}): readonly CrmImportBuiltGroup[] {
  if (input.mode === 'into_existing_parent') {
    const id = input.fixedParentProjectId?.trim() || 'unknown';
    return [
      {
        groupKey: `fixed:${id}`,
        kind: 'fixed',
        rawIdentifier: null,
        displayParentName: input.fixedParentDisplayName?.trim() || 'Parent project',
        sourceRowIndexes: input.rows.map((r) => r.sourceRowIndex),
      },
    ];
  }

  const byKey = new Map<
    string,
    {
      kind: CrmImportGroupKeyKind;
      rawIdentifier: string | null;
      displayParentName: string;
      sourceRowIndexes: number[];
      nameSamples: Set<string>;
    }
  >();

  for (const row of input.rows) {
    const idRaw = cellForKey(row, input.mappings, 'parent_identifier');
    const nameRaw = cellForKey(row, input.mappings, 'parent_name');

    let groupKey: string;
    let kind: CrmImportGroupKeyKind;
    let rawIdentifier: string | null = null;
    let displayParentName: string;

    if (idRaw) {
      groupKey = `id:${normalizeImportText(idRaw)}`;
      kind = 'id';
      rawIdentifier = idRaw;
      displayParentName = nameRaw || idRaw;
    } else if (nameRaw) {
      groupKey = `name:${normalizeImportText(nameRaw)}`;
      kind = 'name';
      displayParentName = nameRaw;
    } else {
      groupKey = 'unassigned';
      kind = 'unassigned';
      displayParentName = 'Unassigned';
    }

    const existing = byKey.get(groupKey);
    if (existing == null) {
      byKey.set(groupKey, {
        kind,
        rawIdentifier,
        displayParentName,
        sourceRowIndexes: [row.sourceRowIndex],
        nameSamples: new Set(nameRaw ? [nameRaw] : []),
      });
    } else {
      existing.sourceRowIndexes.push(row.sourceRowIndex);
      if (nameRaw) existing.nameSamples.add(nameRaw);
      if (!existing.displayParentName && nameRaw) existing.displayParentName = nameRaw;
    }
  }

  return Array.from(byKey.entries()).map(([groupKey, value]) => ({
    groupKey,
    kind: value.kind,
    rawIdentifier: value.rawIdentifier,
    displayParentName: value.displayParentName,
    sourceRowIndexes: value.sourceRowIndexes,
  }));
}

export type CrmImportParentFieldConflict = {
  readonly fieldKey: string;
  readonly values: readonly {
    readonly value: string;
    readonly sourceRowIndexes: readonly number[];
  }[];
};

/**
 * Detect meaningful conflicts on parent-owned mapped columns within a group.
 */
export function detectParentFieldConflicts(input: {
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly parentOwnedStandardKeys?: readonly string[];
}): readonly CrmImportParentFieldConflict[] {
  const parentMappings = input.mappings.filter((m) => {
    if (m.ownership === 'ignored' || m.destination.kind === 'ignored') return false;
    if (m.ownership === 'parent') return true;
    if (
      m.destination.kind === 'standard_field' &&
      m.destination.entity === 'parent'
    ) {
      return true;
    }
    if (
      m.destination.kind === 'existing_custom_field' ||
      m.destination.kind === 'new_custom_field'
    ) {
      return m.destination.scope === 'project';
    }
    return false;
  });

  const conflicts: CrmImportParentFieldConflict[] = [];

  for (const mapping of parentMappings) {
    const fieldKey =
      mapping.destination.kind === 'standard_field'
        ? mapping.destination.key
        : mapping.destination.kind === 'existing_custom_field'
          ? `cf:${mapping.destination.fieldKey}`
          : mapping.destination.kind === 'new_custom_field'
            ? `cf_new:${mapping.destination.proposedLabel}`
            : `col:${mapping.sourceIndex}`;

    const buckets = new Map<string, { value: string; rows: number[] }>();
    for (const row of input.rows) {
      const raw = clampImportCell(row.cells[mapping.sourceIndex] ?? '').trim();
      if (!raw) continue;
      const norm = normalizeImportText(raw);
      const bucket = buckets.get(norm);
      if (bucket == null) {
        buckets.set(norm, { value: raw, rows: [row.sourceRowIndex] });
      } else {
        bucket.rows.push(row.sourceRowIndex);
      }
    }

    if (buckets.size > 1) {
      conflicts.push({
        fieldKey,
        values: Array.from(buckets.values()).map((b) => ({
          value: b.value,
          sourceRowIndexes: b.rows,
        })),
      });
    }
  }

  return conflicts;
}
