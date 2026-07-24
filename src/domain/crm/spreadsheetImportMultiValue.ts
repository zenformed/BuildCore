/**
 * Multi-value standard field mapping rules for spreadsheet import.
 * Phones/emails may map multiple columns up to contact multi-value caps.
 */

import { MAX_CONTACT_EMAILS, MAX_CONTACT_PHONES } from '@/domain/crm/contactMultiValue';
import { clampImportCell } from '@/domain/crm/spreadsheetImportGrouping';
import type {
  CrmImportColumnMapping,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';

export function maxStandardFieldMappings(key: string): number {
  if (key === 'phones') return MAX_CONTACT_PHONES;
  if (key === 'emails') return MAX_CONTACT_EMAILS;
  return 1;
}

/** Collect non-empty cell strings from every column mapped to a standard key. */
export function collectMappedStandardCellValues(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  key: string,
  entity?: 'parent' | 'subproject'
): string[] {
  const values: string[] = [];
  for (const mapping of mappings) {
    if (mapping.destination.kind !== 'standard_field') continue;
    if (mapping.destination.key !== key) continue;
    if (entity != null && mapping.destination.entity !== entity) continue;
    const raw = clampImportCell(row.cells[mapping.sourceIndex] ?? '').trim();
    if (!raw) continue;
    values.push(raw);
  }
  return values;
}

/** Split each mapped cell on `;` / `,` and flatten. */
export function expandDelimitedContactValues(rawCells: readonly string[]): string[] {
  const out: string[] = [];
  for (const raw of rawCells) {
    for (const part of raw.split(/[;,]/)) {
      const trimmed = part.trim();
      if (trimmed) out.push(trimmed);
    }
  }
  return out;
}

export function duplicateOrOverLimitMappingMessage(key: string, max: number): string {
  if (max <= 1) return `Duplicate mapping for ${key}.`;
  return `Too many columns mapped to ${key} (maximum ${max}).`;
}
