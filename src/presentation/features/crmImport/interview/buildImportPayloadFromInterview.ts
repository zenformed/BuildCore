/**
 * Build engine mappings + rewritten rows from guided interview answers.
 */

import type { CrmImportColumnComposition } from '@/domain/crm/spreadsheetImportComposition';
import { composeImportColumnValues } from '@/domain/crm/spreadsheetImportComposition';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import type {
  CrmImportColumnMapping,
  CrmImportMode,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import type {
  CrmImportInterviewState,
  CrmImportRemainingFieldDraft,
} from '@/presentation/features/crmImport/interview/interviewState';
import { resolveEffectiveImportMode } from '@/presentation/features/crmImport/interview/interviewState';
import {
  includedWorksheetConfigs,
  worksheetParentDisplayName,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

function parseDestination(
  destinationKey: string,
  header: string,
  placement: 'project' | 'subproject'
): CrmImportColumnMapping['destination'] {
  if (destinationKey === 'ignored') return { kind: 'ignored' };
  if (destinationKey.startsWith('standard:')) {
    const parts = destinationKey.split(':');
    const key = parts[2] ?? '';
    const entity = placement === 'project' ? 'parent' : 'subproject';
    return { kind: 'standard_field', entity, key };
  }
  if (destinationKey.startsWith('existing_cf:')) {
    const [, scope, fieldKey, definitionId] = destinationKey.split(':');
    return {
      kind: 'existing_custom_field',
      scope: (scope as 'project' | 'subproject') ?? 'subproject',
      fieldKey: fieldKey ?? '',
      definitionId: definitionId ?? '',
    };
  }
  if (destinationKey.startsWith('new_cf:')) {
    const scope = placement === 'project' ? 'project' : 'subproject';
    return {
      kind: 'new_custom_field',
      scope,
      proposedLabel: header,
      fieldType: 'text',
    };
  }
  return { kind: 'ignored' };
}

function injectComposedColumn(
  rows: readonly CrmImportParsedRow[],
  /** Unmodified source rows — compositions must not read already-injected cells. */
  sourceRows: readonly CrmImportParsedRow[],
  composition: CrmImportColumnComposition,
  targetSourceIndex: number
): CrmImportParsedRow[] {
  return rows.map((row, rowIndex) => {
    const source = sourceRows[rowIndex] ?? row;
    const composed = composeImportColumnValues(source.cells, composition);
    return {
      ...row,
      cells: { ...row.cells, [targetSourceIndex]: composed },
    };
  });
}

function resolveWorksheetParentNameForActiveSheet(
  state: CrmImportInterviewState
): string | null {
  const configs = state.worksheetProjects ?? [];
  const resolutions = state.worksheetResolutions ?? {};
  const activeId =
    state.activeWorksheetSetupId ??
    includedWorksheetConfigs(configs).find(
      (config) => resolutions[config.worksheetId]?.kind !== 'skip'
    )?.worksheetId ??
    null;
  if (activeId == null) return null;
  const config = configs.find((item) => item.worksheetId === activeId);
  if (config == null) return null;
  return worksheetParentDisplayName(config, resolutions[activeId]);
}

export function buildImportPayloadFromInterview(input: {
  readonly state: CrmImportInterviewState;
  readonly headers: readonly string[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly remainingFields?: readonly CrmImportRemainingFieldDraft[];
}): {
  readonly importMode: CrmImportMode;
  readonly fixedParentProjectId: string | null;
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
} {
  const mode = resolveEffectiveImportMode(input.state);
  const sourceRows = input.rows;
  let rows = sourceRows.map((row) => ({ ...row, cells: { ...row.cells } }));
  const mappings: CrmImportColumnMapping[] = [];
  const used = new Set<number>();

  const projectComp = input.state.projectComposition;
  const subComp = input.state.subprojectComposition;
  const contactComp = input.state.contactComposition;

  if (mode === 'master_hierarchy' && projectComp && projectComp.columnIndexes.length > 0) {
    const target = projectComp.columnIndexes[0]!;
    rows = injectComposedColumn(rows, sourceRows, projectComp, target);
    mappings.push({
      sourceIndex: target,
      originalHeader: input.headers[target] ?? 'Project',
      ownership: 'parent',
      destination: { kind: 'standard_field', entity: 'parent', key: 'parent_name' },
    });
    for (const idx of projectComp.columnIndexes) used.add(idx);
  } else if (
    mode === 'master_hierarchy' &&
    (input.state.multiProjectOrganization === 'worksheet_per_project' ||
      input.state.multiProjectOrganization === 'header_rows')
  ) {
    // Parents come from create/attach decisions, not a spreadsheet column.
    const target = input.headers.length;
    const fallbackName = resolveWorksheetParentNameForActiveSheet(input.state) ?? 'Project';
    rows = rows.map((row) => {
      const existing = row.cells[target];
      const value =
        existing != null && normalizeImportText(existing) ? existing : fallbackName;
      return { ...row, cells: { ...row.cells, [target]: value } };
    });
    mappings.push({
      sourceIndex: target,
      originalHeader: 'Project',
      ownership: 'parent',
      destination: { kind: 'standard_field', entity: 'parent', key: 'parent_name' },
    });
  }

  if (subComp && subComp.columnIndexes.length > 0) {
    const target = subComp.columnIndexes[0]!;
    rows = injectComposedColumn(rows, sourceRows, subComp, target);
    mappings.push({
      sourceIndex: target,
      originalHeader: input.headers[target] ?? 'Subproject',
      ownership: 'subproject',
      destination: { kind: 'standard_field', entity: 'subproject', key: 'subproject_name' },
    });
    for (const idx of subComp.columnIndexes) used.add(idx);
  }

  if (contactComp && contactComp.columnIndexes.length > 0) {
    const target = contactComp.columnIndexes[0]!;
    rows = injectComposedColumn(rows, sourceRows, contactComp, target);
    mappings.push({
      sourceIndex: target,
      originalHeader: input.headers[target] ?? 'Contact',
      ownership: 'subproject',
      destination: { kind: 'standard_field', entity: 'subproject', key: 'contact_name' },
    });
    for (const idx of contactComp.columnIndexes) used.add(idx);
  }

  const fields = input.remainingFields ?? input.state.remainingFields;
  for (const field of fields) {
    if (used.has(field.sourceIndex)) continue;
    if (field.destinationKey === 'ignored' || field.placement === 'ignore') {
      mappings.push({
        sourceIndex: field.sourceIndex,
        originalHeader: input.headers[field.sourceIndex] ?? `Column ${field.sourceIndex + 1}`,
        ownership: 'ignored',
        destination: { kind: 'ignored' },
      });
      used.add(field.sourceIndex);
      continue;
    }
    if (field.destinationKey === 'unset' || field.destinationKey === '') {
      mappings.push({
        sourceIndex: field.sourceIndex,
        originalHeader: input.headers[field.sourceIndex] ?? `Column ${field.sourceIndex + 1}`,
        ownership: 'ignored',
        destination: { kind: 'ignored' },
      });
      used.add(field.sourceIndex);
      continue;
    }
    const header = input.headers[field.sourceIndex] ?? `Column ${field.sourceIndex + 1}`;
    const ownership =
      field.placement === 'project'
        ? mode === 'into_existing_parent'
          ? 'ignored'
          : 'parent'
        : 'subproject';
    if (ownership === 'ignored') {
      mappings.push({
        sourceIndex: field.sourceIndex,
        originalHeader: header,
        ownership: 'ignored',
        destination: { kind: 'ignored' },
      });
    } else {
      mappings.push({
        sourceIndex: field.sourceIndex,
        originalHeader: header,
        ownership,
        destination: parseDestination(field.destinationKey, header, field.placement),
      });
    }
    used.add(field.sourceIndex);
  }

  // Any unused columns ignored
  for (let i = 0; i < input.headers.length; i += 1) {
    if (used.has(i)) continue;
    mappings.push({
      sourceIndex: i,
      originalHeader: input.headers[i] ?? `Column ${i + 1}`,
      ownership: 'ignored',
      destination: { kind: 'ignored' },
    });
  }

  return {
    importMode: mode,
    fixedParentProjectId:
      mode === 'into_existing_parent' ? input.state.selectedParentProjectId : null,
    mappings,
    rows,
  };
}
