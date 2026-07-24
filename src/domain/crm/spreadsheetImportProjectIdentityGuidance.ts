/**
 * Deterministic guidance when the user picks Project-identifying columns.
 * Does not change grouping — only analyzes the selection for UI warnings.
 */

import {
  composeImportColumnValues,
  type CrmImportColumnComposition,
} from '@/domain/crm/spreadsheetImportComposition';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export type ProjectIdentityGuidanceKind =
  | 'none'
  | 'high_cardinality'
  | 'looks_like_zip'
  | 'looks_like_email'
  | 'looks_like_phone'
  | 'looks_like_first_name'
  | 'looks_like_unique_id'
  | 'likely_one_project_sheet';

export type ProjectIdentityGuidance = {
  readonly kind: ProjectIdentityGuidanceKind;
  readonly severity: 'none' | 'warning';
  readonly groupCount: number;
  readonly totalRows: number;
  readonly uniqueRatio: number;
};

const ZIP_HEADER_RE = /\b(zip|postal|post\s*code|postcode)\b/i;
const EMAIL_HEADER_RE = /\b(e[\s-]?mail|email\s*address)\b/i;
const PHONE_HEADER_RE = /\b(phone|mobile|cell|fax|tel)\b/i;
const FIRST_NAME_HEADER_RE = /\b(first\s*name|firstname|given\s*name|fname)\b/i;
const UNIQUE_ID_HEADER_RE = /\b(uuid|guid|row\s*id|record\s*id|unique\s*id|external\s*id)\b/i;

const ZIP_VALUE_RE = /^\d{5}(-\d{4})?$/;
const EMAIL_VALUE_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_VALUE_RE = /^[\d\s().+\-]{7,}$/;
const UUID_VALUE_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function composedValues(
  rows: readonly (readonly string[])[],
  composition: CrmImportColumnComposition
): string[] {
  const out: string[] = [];
  for (const row of rows) {
    const value = composeImportColumnValues(row, composition).trim();
    if (value) out.push(value);
  }
  return out;
}

function majorityMatch(values: readonly string[], predicate: (value: string) => boolean): boolean {
  if (values.length === 0) return false;
  let hits = 0;
  for (const value of values) {
    if (predicate(value)) hits += 1;
  }
  return hits / values.length >= 0.6;
}

function joinedHeader(headers: readonly string[], indexes: readonly number[]): string {
  return indexes.map((index) => headers[index] ?? '').join(' ');
}

/**
 * Analyze selected Project identity columns against spreadsheet data rows.
 * `groupCount` should come from the existing parent-grouping preview when available;
 * otherwise unique composed values are used.
 */
export function analyzeProjectIdentitySelection(input: {
  readonly headers: readonly string[];
  readonly dataRows: readonly (readonly string[])[];
  readonly composition: CrmImportColumnComposition | null;
  readonly groupCount?: number | null;
}): ProjectIdentityGuidance {
  const empty: ProjectIdentityGuidance = {
    kind: 'none',
    severity: 'none',
    groupCount: 0,
    totalRows: input.dataRows.length,
    uniqueRatio: 0,
  };

  if (input.composition == null || input.composition.columnIndexes.length === 0) {
    return empty;
  }

  const values = composedValues(input.dataRows, input.composition);
  const totalRows = Math.max(1, input.dataRows.length);
  const unique = new Set(values.map((value) => normalizeImportText(value)));
  const groupCount = input.groupCount != null ? input.groupCount : unique.size;
  const uniqueRatio = groupCount / totalRows;
  const header = joinedHeader(input.headers, input.composition.columnIndexes);
  const singleColumn = input.composition.columnIndexes.length === 1;

  const base = {
    groupCount,
    totalRows: input.dataRows.length,
    uniqueRatio,
  };

  if (singleColumn && (ZIP_HEADER_RE.test(header) || majorityMatch(values, (v) => ZIP_VALUE_RE.test(v)))) {
    return { ...base, kind: 'looks_like_zip', severity: 'warning' };
  }

  if (
    singleColumn &&
    (EMAIL_HEADER_RE.test(header) || majorityMatch(values, (v) => EMAIL_VALUE_RE.test(v)))
  ) {
    return { ...base, kind: 'looks_like_email', severity: 'warning' };
  }

  if (
    singleColumn &&
    (PHONE_HEADER_RE.test(header) ||
      majorityMatch(values, (v) => PHONE_VALUE_RE.test(v.replace(/\s+/g, '')) && /\d{7,}/.test(v)))
  ) {
    return { ...base, kind: 'looks_like_phone', severity: 'warning' };
  }

  if (
    singleColumn &&
    (UNIQUE_ID_HEADER_RE.test(header) || majorityMatch(values, (v) => UUID_VALUE_RE.test(v)))
  ) {
    return { ...base, kind: 'looks_like_unique_id', severity: 'warning' };
  }

  if (singleColumn && FIRST_NAME_HEADER_RE.test(header) && uniqueRatio >= 0.35) {
    return { ...base, kind: 'looks_like_first_name', severity: 'warning' };
  }

  if (uniqueRatio >= 0.85 && groupCount >= 8) {
    return { ...base, kind: 'high_cardinality', severity: 'warning' };
  }

  // Many distinct values with little repetition → likely one Project sheet.
  if (uniqueRatio >= 0.55 && groupCount >= 10 && !/\b(project|property|complex|community|site|show)\b/i.test(header)) {
    return { ...base, kind: 'likely_one_project_sheet', severity: 'warning' };
  }

  return { ...base, kind: 'none', severity: 'none' };
}
