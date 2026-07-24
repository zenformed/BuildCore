/**
 * Value conversion and row-level validation for spreadsheet import.
 */

import { normalizeImportText, clampImportCell } from '@/domain/crm/spreadsheetImportGrouping';
import {
  collectMappedStandardCellValues,
  expandDelimitedContactValues,
} from '@/domain/crm/spreadsheetImportMultiValue';
import type {
  CrmImportColumnMapping,
  CrmImportIssue,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function parseImportDealValueToCents(raw: string): {
  readonly ok: true;
  readonly cents: number;
} | {
  readonly ok: false;
  readonly message: string;
} {
  const trimmed = raw.trim();
  if (!trimmed) return { ok: true, cents: 0 };
  if (trimmed.includes('%')) {
    return { ok: false, message: 'Percentages cannot be used as currency.' };
  }

  let text = trimmed.replace(/\$/g, '').replace(/,/g, '').trim();
  let negative = false;
  if (/^\(.*\)$/.test(text)) {
    negative = true;
    text = text.slice(1, -1).trim();
  }
  if (text.startsWith('-')) {
    negative = true;
    text = text.slice(1).trim();
  }

  if (!/^\d+(\.\d+)?$/.test(text)) {
    return { ok: false, message: 'Invalid currency or number value.' };
  }

  const amount = Number(text);
  if (!Number.isFinite(amount)) {
    return { ok: false, message: 'Invalid currency or number value.' };
  }
  const cents = Math.round(amount * 100) * (negative ? -1 : 1);
  if (cents < 0) {
    return { ok: false, message: 'Deal value cannot be negative.' };
  }
  return { ok: true, cents };
}

function mappingForStandardKey(
  mappings: readonly CrmImportColumnMapping[],
  key: string,
  entity?: 'parent' | 'subproject'
): CrmImportColumnMapping | undefined {
  return mappings.find(
    (m) =>
      m.destination.kind === 'standard_field' &&
      m.destination.key === key &&
      (entity == null || m.destination.entity === entity)
  );
}

function cell(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  key: string,
  entity?: 'parent' | 'subproject'
): string {
  const col = mappingForStandardKey(mappings, key, entity);
  if (col == null) return '';
  return clampImportCell(row.cells[col.sourceIndex] ?? '').trim();
}

export function getSubprojectNameFromRow(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[]
): string {
  return cell(row, mappings, 'subproject_name', 'subproject') || cell(row, mappings, 'subproject_name');
}

export function validateImportRow(input: {
  readonly row: CrmImportParsedRow;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly memberEmailToId?: ReadonlyMap<string, string>;
  readonly allowedStageSlugs?: ReadonlySet<string>;
  /** Normalized subproject names already seen in the same parent group (warnings only). */
  readonly duplicateNamesInGroup?: ReadonlySet<string>;
}): {
  readonly ok: boolean;
  readonly issues: readonly CrmImportIssue[];
  readonly subprojectName: string;
} {
  const issues: CrmImportIssue[] = [];
  const name = getSubprojectNameFromRow(input.row, input.mappings);
  if (!name) {
    issues.push({
      severity: 'error',
      code: 'missing_subproject_name',
      message: 'Subproject name is required.',
      field: 'subproject_name',
      sourceRowIndex: input.row.sourceRowIndex,
    });
  } else if (
    input.duplicateNamesInGroup != null &&
    input.duplicateNamesInGroup.has(normalizeImportText(name))
  ) {
    issues.push({
      severity: 'warning',
      code: 'duplicate_subproject_name',
      message: `Duplicate subproject name "${name}" within the same parent group.`,
      field: 'subproject_name',
      sourceRowIndex: input.row.sourceRowIndex,
    });
  }

  const emailParts = expandDelimitedContactValues(
    collectMappedStandardCellValues(input.row, input.mappings, 'emails', 'subproject')
  );
  for (const email of emailParts) {
    if (!EMAIL_RE.test(email)) {
      issues.push({
        severity: 'error',
        code: 'invalid_email',
        message: `Invalid email: ${email}`,
        field: 'emails',
        sourceRowIndex: input.row.sourceRowIndex,
      });
    }
  }

  const dealRaw = cell(input.row, input.mappings, 'deal_value', 'subproject');
  if (dealRaw) {
    const parsed = parseImportDealValueToCents(dealRaw);
    if (!parsed.ok) {
      issues.push({
        severity: 'error',
        code: 'invalid_deal_value',
        message: parsed.message,
        field: 'deal_value',
        sourceRowIndex: input.row.sourceRowIndex,
      });
    }
  }

  const stageRaw = cell(input.row, input.mappings, 'stage', 'subproject');
  if (stageRaw && input.allowedStageSlugs != null && !input.allowedStageSlugs.has(stageRaw)) {
    const norm = normalizeImportText(stageRaw);
    const match = Array.from(input.allowedStageSlugs).find((s) => normalizeImportText(s) === norm);
    if (match == null) {
      issues.push({
        severity: 'error',
        code: 'invalid_stage',
        message: `Unknown stage: ${stageRaw}`,
        field: 'stage',
        sourceRowIndex: input.row.sourceRowIndex,
      });
    }
  }

  const assigneeEmail = cell(input.row, input.mappings, 'assignee_email', 'subproject');
  if (assigneeEmail && input.memberEmailToId != null) {
    const id = input.memberEmailToId.get(normalizeImportText(assigneeEmail));
    if (id == null) {
      issues.push({
        severity: 'warning',
        code: 'unknown_assignee_email',
        message: `No active member with email ${assigneeEmail}; leaving unassigned.`,
        field: 'assignee_email',
        sourceRowIndex: input.row.sourceRowIndex,
      });
    }
  }

  const blocking = issues.some((i) => i.severity === 'error');
  return { ok: !blocking, issues, subprojectName: name };
}

/** Escape CSV formula injection. */
export function escapeCsvCell(value: string): string {
  let v = value;
  if (/^[=+\-@]/.test(v)) {
    v = `'${v}`;
  }
  if (/[",\n\r]/.test(v)) {
    return `"${v.replace(/"/g, '""')}"`;
  }
  return v;
}
