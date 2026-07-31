/**
 * Clean up probe builder — remove dead void customFields.
 */
import { formatCrmProjectAddressLine } from '@/domain/crm/projectAddress';
import {
  expandDelimitedContactValues,
} from '@/domain/crm/spreadsheetImportMultiValue';
import {
  normalizeContactEmails,
  normalizeContactPhones,
} from '@/domain/crm/contactMultiValue';
import type {
  CrmImportColumnMapping,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import { importDuplicateIncomingId } from '@/domain/crm/importDuplicateDecisions';
import type { CrmDuplicateCandidatesBatchItem } from '@/infrastructure/crm/api/crmDuplicateCandidatesApi';

function mappingCell(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  key: string
): string {
  const col = mappings.find(
    (m) => m.destination.kind === 'standard_field' && m.destination.key === key
  );
  if (col == null) return '';
  return (row.cells[col.sourceIndex] ?? '').trim();
}

function collectMappedStandardValues(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[],
  key: string
): string[] {
  const values: string[] = [];
  for (const mapping of mappings) {
    if (mapping.destination.kind !== 'standard_field') continue;
    if (mapping.destination.key !== key) continue;
    const raw = (row.cells[mapping.sourceIndex] ?? '').trim();
    if (raw) values.push(raw);
  }
  return values;
}

function getSubprojectName(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[]
): string {
  return (
    mappingCell(row, mappings, 'subproject_name') ||
    mappingCell(row, mappings, 'parent_name') ||
    ''
  ).trim();
}

function collectCustomFields(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[]
): NonNullable<CrmDuplicateCandidatesBatchItem['customFields']> {
  const customFields: NonNullable<CrmDuplicateCandidatesBatchItem['customFields']>[number][] = [];
  for (const mapping of mappings) {
    if (
      mapping.destination.kind !== 'existing_custom_field' &&
      mapping.destination.kind !== 'new_custom_field'
    ) {
      continue;
    }
    const raw = (row.cells[mapping.sourceIndex] ?? '').trim();
    if (!raw) continue;
    const fieldKey =
      mapping.destination.kind === 'existing_custom_field'
        ? mapping.destination.fieldKey
        : mapping.originalHeader;
    const label =
      mapping.destination.kind === 'new_custom_field'
        ? mapping.destination.proposedLabel
        : mapping.originalHeader;
    const definitionId =
      mapping.destination.kind === 'existing_custom_field'
        ? mapping.destination.definitionId
        : '';
    customFields.push({
      definitionId,
      valueId: null,
      fieldKey,
      label,
      valueText: raw,
    });
  }
  return customFields;
}

export type ImportDuplicateRowSummary = {
  readonly incomingId: string;
  readonly sourceRowIndex: number;
  readonly name: string;
  readonly contactName: string | null;
  readonly email: string | null;
  readonly phone: string | null;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
  readonly addressLine: string | null;
  readonly stage: string | null;
  readonly notes: string | null;
  readonly customFields: readonly {
    readonly fieldKey: string;
    readonly label: string;
    readonly valueText: string;
  }[];
};

export function buildImportDuplicateRowSummary(
  row: CrmImportParsedRow,
  mappings: readonly CrmImportColumnMapping[]
): ImportDuplicateRowSummary {
  const emails = normalizeContactEmails(
    expandDelimitedContactValues(collectMappedStandardValues(row, mappings, 'emails'))
  );
  const phones = normalizeContactPhones(
    expandDelimitedContactValues(collectMappedStandardValues(row, mappings, 'phones'))
  );
  const contactName = mappingCell(row, mappings, 'contact_name') || null;
  const addressLine = formatCrmProjectAddressLine({
    addressLine1: mappingCell(row, mappings, 'address_line_1') || null,
    addressLine2: mappingCell(row, mappings, 'address_line_2') || null,
    city: mappingCell(row, mappings, 'city') || null,
    state: mappingCell(row, mappings, 'state') || null,
    postalCode: mappingCell(row, mappings, 'postal_code') || null,
  });
  const stage = mappingCell(row, mappings, 'stage') || null;
  const notes = mappingCell(row, mappings, 'notes') || null;
  const customFields = collectCustomFields(row, mappings).map((field) => ({
    fieldKey: field.fieldKey,
    label: field.label,
    valueText: (field.valueText ?? '').trim(),
  })).filter((field) => field.valueText.length > 0);

  return {
    incomingId: importDuplicateIncomingId(row.sourceRowIndex),
    sourceRowIndex: row.sourceRowIndex,
    name: getSubprojectName(row, mappings) || contactName || 'Untitled',
    contactName,
    email: emails[0] ?? null,
    phone: phones[0] ?? null,
    emails,
    phones,
    addressLine,
    stage,
    notes,
    customFields,
  };
}

export function buildImportDuplicateBatchItems(
  rows: readonly CrmImportParsedRow[],
  mappings: readonly CrmImportColumnMapping[]
): {
  readonly items: CrmDuplicateCandidatesBatchItem[];
  readonly summariesByIncomingId: Map<string, ImportDuplicateRowSummary>;
} {
  const items: CrmDuplicateCandidatesBatchItem[] = [];
  const summariesByIncomingId = new Map<string, ImportDuplicateRowSummary>();

  for (const row of rows) {
    const summary = buildImportDuplicateRowSummary(row, mappings);
    summariesByIncomingId.set(summary.incomingId, summary);

    const emails = normalizeContactEmails(
      expandDelimitedContactValues(collectMappedStandardValues(row, mappings, 'emails'))
    );
    const phones = normalizeContactPhones(
      expandDelimitedContactValues(collectMappedStandardValues(row, mappings, 'phones'))
    );

    items.push({
      incomingId: summary.incomingId,
      recordType: 'subproject',
      projectName: summary.name,
      contactName: summary.contactName,
      emails,
      phones,
      address: {
        addressLine1: mappingCell(row, mappings, 'address_line_1') || null,
        addressLine2: mappingCell(row, mappings, 'address_line_2') || null,
        city: mappingCell(row, mappings, 'city') || null,
        state: mappingCell(row, mappings, 'state') || null,
        postalCode: mappingCell(row, mappings, 'postal_code') || null,
      },
      customFields: collectCustomFields(row, mappings),
    });
  }

  return { items, summariesByIncomingId };
}

/** Identity fingerprint for invalidating stale duplicate results when mappings/values change. */
export function buildImportDuplicateIdentityKey(
  rows: readonly CrmImportParsedRow[],
  mappings: readonly CrmImportColumnMapping[]
): string {
  const { items } = buildImportDuplicateBatchItems(rows, mappings);
  return JSON.stringify(
    items.map((item) => ({
      incomingId: item.incomingId,
      projectName: item.projectName,
      contactName: item.contactName,
      emails: item.emails,
      phones: item.phones,
      address: item.address,
      customFields: item.customFields?.map((f) => [f.fieldKey, f.valueText]),
    }))
  );
}
