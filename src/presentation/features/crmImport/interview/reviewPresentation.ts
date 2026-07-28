/**
 * Pure helpers for the spreadsheet import Review confirmation screen.
 */

import { isCompositionConfigured } from '@/domain/crm/spreadsheetImportComposition';
import type { CrmImportColumnComposition } from '@/domain/crm/spreadsheetImportComposition';
import {
  duplicateOrOverLimitMappingMessage,
  maxStandardFieldMappings,
} from '@/domain/crm/spreadsheetImportMultiValue';
import type {
  CrmImportColumnMapping,
  CrmImportMode,
} from '@/domain/crm/spreadsheetImportTypes';
import { validateImportRow } from '@/domain/crm/spreadsheetImportValidation';
import type { CrmImportParsedRow } from '@/domain/crm/spreadsheetImportTypes';
import {
  areFieldsReadyToContinue,
  isRemainingFieldEnabled,
} from '@/presentation/features/crmImport/interview/fieldsPresentation';
import type {
  CrmImportInterviewScreen,
  CrmImportInterviewState,
  CrmImportRemainingFieldDraft,
  CrmImportStructureChoice,
} from '@/presentation/features/crmImport/interview/interviewState';
import {
  goInterviewForward,
} from '@/presentation/features/crmImport/interview/interviewState';
import { canContinueWorksheetResolve } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

export type ReviewReadinessTone = 'ready' | 'warning' | 'blocking';

export type ReviewMetricId = 'rows' | 'fields' | 'issues';

export type ReviewSectionId =
  | 'spreadsheet'
  | 'destination'
  | 'subprojectNames'
  | 'importedFields';

export type ReviewLayoutMode = 'desktop' | 'tablet' | 'mobile';

/** Stable Review UI issue after dedupe / aggregation. */
export type ReviewDisplayIssue = {
  readonly id: string;
  readonly severity: 'error' | 'warning';
  readonly code: string;
  readonly message: string;
  readonly section: ReviewSectionId | 'general';
  readonly field?: string;
};

const KEY_FIELD_PRIORITY: readonly string[] = [
  'contact_name',
  'emails',
  'phones',
  'address_line_1',
  'city',
  'state',
  'postal_code',
  'address_line_2',
  'notes',
  'stage',
  'deal_value',
  'assignee_email',
  'industry',
  'priority',
];

const KEY_FIELD_VISIBLE_LIMIT = 5;

export function resolveReviewLayoutMode(viewportWidth: number): ReviewLayoutMode {
  if (viewportWidth < 640) return 'mobile';
  if (viewportWidth < 960) return 'tablet';
  return 'desktop';
}

export function compositionLabel(
  headers: readonly string[],
  composition: CrmImportColumnComposition | null
): string | null {
  if (composition == null || composition.columnIndexes.length === 0) return null;
  return composition.columnIndexes
    .map((index) => headers[index] ?? `Column ${index + 1}`)
    .join(' + ');
}

export function countMappedAndIgnoredColumns(input: {
  readonly headersLength: number;
  readonly remainingFields: readonly CrmImportRemainingFieldDraft[];
  readonly lockedColumnCount: number;
}): { readonly mappedCount: number; readonly ignoredCount: number } {
  let ignoredCount = 0;
  let remainingMapped = 0;
  for (const field of input.remainingFields) {
    if (isRemainingFieldEnabled(field)) remainingMapped += 1;
    else ignoredCount += 1;
  }
  return {
    mappedCount: input.lockedColumnCount + remainingMapped,
    ignoredCount,
  };
}

export function buildKeyFieldChips(input: {
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly standardFieldLabels: Readonly<Record<string, string>>;
  readonly customFieldFallback: (label: string) => string;
  readonly visibleLimit?: number;
}): {
  readonly visible: readonly string[];
  readonly remainingCount: number;
} {
  const limit = input.visibleLimit ?? KEY_FIELD_VISIBLE_LIMIT;
  const labels: string[] = [];
  const seen = new Set<string>();

  const pushLabel = (label: string): void => {
    const trimmed = label.trim();
    if (!trimmed) return;
    const key = trimmed.toLocaleLowerCase('en-US');
    if (seen.has(key)) return;
    seen.add(key);
    labels.push(trimmed);
  };

  const standardMapped = new Map<string, string>();
  for (const mapping of input.mappings) {
    if (mapping.destination.kind === 'ignored') continue;
    if (mapping.destination.kind === 'standard_field') {
      if (
        mapping.destination.key === 'parent_name' ||
        mapping.destination.key === 'parent_identifier' ||
        mapping.destination.key === 'subproject_name'
      ) {
        continue;
      }
      const label =
        input.standardFieldLabels[mapping.destination.key] ?? mapping.destination.key;
      standardMapped.set(mapping.destination.key, label);
    }
  }

  for (const key of KEY_FIELD_PRIORITY) {
    const label = standardMapped.get(key);
    if (label != null) pushLabel(label);
  }
  for (const [key, label] of standardMapped) {
    if (!KEY_FIELD_PRIORITY.includes(key)) pushLabel(label);
  }

  for (const mapping of input.mappings) {
    if (mapping.destination.kind === 'existing_custom_field') {
      pushLabel(input.customFieldFallback(mapping.destination.fieldKey));
    } else if (mapping.destination.kind === 'new_custom_field') {
      pushLabel(input.customFieldFallback(mapping.destination.proposedLabel));
    }
  }

  return {
    visible: labels.slice(0, limit),
    remainingCount: Math.max(0, labels.length - limit),
  };
}

function reviewIssueId(input: {
  readonly code: string;
  readonly section: ReviewDisplayIssue['section'];
  readonly field?: string;
  readonly message: string;
}): string {
  return [
    input.code,
    input.section,
    input.field ?? '',
    input.message.trim().toLocaleLowerCase('en-US'),
  ].join('|');
}

function sectionForIssueCode(code: string, field?: string): ReviewDisplayIssue['section'] {
  if (code === 'missing_parent') return 'destination';
  if (code === 'missing_subproject_identity' || code === 'missing_subproject_name') {
    return 'subprojectNames';
  }
  if (
    code === 'fields_incomplete' ||
    code === 'duplicate_mapping' ||
    code === 'mapping_error' ||
    code === 'invalid_email' ||
    code === 'invalid_deal_value' ||
    code === 'invalid_stage' ||
    code === 'unknown_assignee_email' ||
    code === 'duplicate_subproject_name'
  ) {
    return 'importedFields';
  }
  if (field === 'subproject_name') return 'subprojectNames';
  return 'general';
}

/**
 * Client-side mapping checks that mirror server `collectImportMappingErrors`
 * so Review can block before Start Import for the same problems.
 */
export function collectClientMappingErrors(
  mappings: readonly CrmImportColumnMapping[],
  importMode: CrmImportMode,
  options?: { readonly requireParentKeyColumn?: boolean }
): readonly ReviewDisplayIssue[] {
  const out: ReviewDisplayIssue[] = [];

  const hasSubprojectName = mappings.some(
    (m) =>
      m.destination.kind === 'standard_field' && m.destination.key === 'subproject_name'
  );
  if (!hasSubprojectName) {
    const message = 'A subproject name column mapping is required.';
    out.push({
      id: reviewIssueId({
        code: 'missing_subproject_name_mapping',
        section: 'subprojectNames',
        message,
      }),
      severity: 'error',
      code: 'missing_subproject_name_mapping',
      message,
      section: 'subprojectNames',
      field: 'subproject_name',
    });
  }

  const requireParentKey =
    options?.requireParentKeyColumn ?? importMode === 'master_hierarchy';
  if (requireParentKey) {
    const hasParentKey = mappings.some(
      (m) =>
        m.destination.kind === 'standard_field' &&
        (m.destination.key === 'parent_name' || m.destination.key === 'parent_identifier')
    );
    if (!hasParentKey) {
      const message =
        'Master hierarchy imports require a parent name or parent identifier column.';
      out.push({
        id: reviewIssueId({
          code: 'missing_parent_key',
          section: 'destination',
          message,
        }),
        severity: 'error',
        code: 'missing_parent_key',
        message,
        section: 'destination',
      });
    }
  }

  const standardCounts = new Map<string, number>();
  for (const mapping of mappings) {
    if (mapping.destination.kind !== 'standard_field') continue;
    const fieldKey = mapping.destination.key;
    const countKey = `${mapping.destination.entity}:${fieldKey}`;
    const count = (standardCounts.get(countKey) ?? 0) + 1;
    standardCounts.set(countKey, count);
    const max = maxStandardFieldMappings(fieldKey);
    if (count === max + 1) {
      const message = duplicateOrOverLimitMappingMessage(fieldKey, max);
      out.push({
        id: reviewIssueId({
          code: 'duplicate_mapping',
          section: 'importedFields',
          field: fieldKey,
          message,
        }),
        severity: 'error',
        code: 'duplicate_mapping',
        message,
        section: 'importedFields',
        field: fieldKey,
      });
    }
  }

  return out;
}

function upsertDisplayIssue(
  byId: Map<string, ReviewDisplayIssue>,
  issue: ReviewDisplayIssue
): void {
  if (!byId.has(issue.id)) byId.set(issue.id, issue);
}

export function collectReviewClientIssues(input: {
  readonly mappings: readonly CrmImportColumnMapping[];
  readonly rows: readonly CrmImportParsedRow[];
  readonly importMode: CrmImportMode;
  readonly mappingErrors?: readonly string[];
  readonly fieldsReady: boolean;
  readonly hasParent: boolean;
  readonly hasSubprojectIdentity: boolean;
  readonly requireParentKeyColumn?: boolean;
  readonly maxRowsToScan?: number;
  readonly missingNameMessage?: (count: number) => string;
}): {
  readonly blockingCount: number;
  readonly warningCount: number;
  readonly issues: readonly ReviewDisplayIssue[];
  readonly messages: readonly string[];
  readonly sectionsWithIssues: ReadonlySet<ReviewSectionId>;
} {
  const byId = new Map<string, ReviewDisplayIssue>();

  for (const issue of collectClientMappingErrors(input.mappings, input.importMode, {
    requireParentKeyColumn: input.requireParentKeyColumn,
  })) {
    upsertDisplayIssue(byId, issue);
  }

  for (const message of input.mappingErrors ?? []) {
    const normalized = message.trim();
    if (!normalized) continue;
    // Stale server errors from a prior Start attempt must not re-block worksheet imports
    // that intentionally have no parent column (parents come from worksheet decisions).
    if (
      input.requireParentKeyColumn === false &&
      /Master hierarchy imports require a parent name or parent identifier column/i.test(
        normalized
      )
    ) {
      continue;
    }
    const fieldMatch =
      /^Duplicate mapping for (.+)\.$/i.exec(normalized) ??
      /^Too many columns mapped to (.+) \(maximum \d+\)\.$/i.exec(normalized);
    const field = fieldMatch?.[1];
    const code = field != null ? 'duplicate_mapping' : 'mapping_error';
    const section = sectionForIssueCode(code, field);
    upsertDisplayIssue(byId, {
      id: reviewIssueId({ code, section, field, message: normalized }),
      severity: 'error',
      code,
      message: normalized,
      section,
      field,
    });
  }

  if (!input.hasSubprojectIdentity) {
    const message = 'Choose columns that identify each imported row.';
    upsertDisplayIssue(byId, {
      id: reviewIssueId({
        code: 'missing_subproject_identity',
        section: 'subprojectNames',
        message,
      }),
      severity: 'error',
      code: 'missing_subproject_identity',
      message,
      section: 'subprojectNames',
    });
  }

  if (!input.hasParent) {
    const message = 'Choose a destination Project before importing.';
    upsertDisplayIssue(byId, {
      id: reviewIssueId({ code: 'missing_parent', section: 'destination', message }),
      severity: 'error',
      code: 'missing_parent',
      message,
      section: 'destination',
    });
  }

  if (!input.fieldsReady) {
    const message = 'Finish matching spreadsheet columns before importing.';
    upsertDisplayIssue(byId, {
      id: reviewIssueId({
        code: 'fields_incomplete',
        section: 'importedFields',
        message,
      }),
      severity: 'error',
      code: 'fields_incomplete',
      message,
      section: 'importedFields',
    });
  }

  const maxRows = input.maxRowsToScan ?? 200;
  const duplicateNames = new Set<string>();
  const seenNames = new Set<string>();
  const rowIssueTallies = new Map<
    string,
    { readonly template: ReviewDisplayIssue; count: number }
  >();

  for (const row of input.rows.slice(0, maxRows)) {
    const result = validateImportRow({
      row,
      mappings: input.mappings,
      duplicateNamesInGroup: duplicateNames,
    });
    for (const issue of result.issues) {
      const section = sectionForIssueCode(issue.code, issue.field);
      const aggregateKey = `${issue.code}|${issue.field ?? ''}|${issue.severity}|${section}`;
      const existing = rowIssueTallies.get(aggregateKey);
      if (existing) {
        existing.count += 1;
      } else {
        rowIssueTallies.set(aggregateKey, {
          count: 1,
          template: {
            id: aggregateKey,
            severity: issue.severity === 'warning' ? 'warning' : 'error',
            code: issue.code,
            message: issue.message,
            section,
            field: issue.field,
          },
        });
      }
    }
    if (result.subprojectName) {
      const norm = result.subprojectName.toLocaleLowerCase('en-US');
      if (seenNames.has(norm)) duplicateNames.add(norm);
      else seenNames.add(norm);
    }
  }

  for (const { template, count } of rowIssueTallies.values()) {
    let message = template.message;
    if (template.code === 'missing_subproject_name' && count > 1) {
      message =
        input.missingNameMessage?.(count) ??
        `${count.toLocaleString()} rows are missing a Subproject name.`;
    } else if (count > 1 && template.code === 'duplicate_subproject_name') {
      message = `${count.toLocaleString()} rows have duplicate Subproject names.`;
    } else if (count > 1 && template.code.startsWith('invalid_')) {
      message = `${count.toLocaleString()} rows: ${template.message}`;
    }
    upsertDisplayIssue(byId, {
      ...template,
      id: reviewIssueId({
        code: template.code,
        section: template.section,
        field: template.field,
        message,
      }),
      message,
    });
  }

  const issues = Array.from(byId.values());
  let blockingCount = 0;
  let warningCount = 0;
  const sectionsWithIssues = new Set<ReviewSectionId>();
  for (const issue of issues) {
    if (issue.severity === 'error') blockingCount += 1;
    else warningCount += 1;
    if (issue.section !== 'general') sectionsWithIssues.add(issue.section);
  }

  return {
    blockingCount,
    warningCount,
    issues,
    messages: issues.map((issue) => issue.message),
    sectionsWithIssues,
  };
}

export function resolveReviewReadiness(input: {
  readonly blockingCount: number;
  readonly warningCount: number;
}): ReviewReadinessTone {
  if (input.blockingCount > 0) return 'blocking';
  if (input.warningCount > 0) return 'warning';
  return 'ready';
}

export function reviewIssueMetricCount(input: {
  readonly blockingCount: number;
  readonly warningCount: number;
}): number {
  return input.blockingCount + input.warningCount;
}

export function destinationImportingToLabel(
  structureChoice: CrmImportStructureChoice | null,
  launchMode: CrmImportMode,
  labels: { readonly oneProject: string; readonly multipleProjects: string }
): string {
  if (launchMode === 'into_existing_parent' || structureChoice === 'one_project') {
    return labels.oneProject;
  }
  return labels.multipleProjects;
}

export function reviewEditTargetForSection(
  section: ReviewSectionId,
  input: {
    readonly launchMode: CrmImportMode;
    readonly structureChoice: CrmImportStructureChoice | null;
    readonly effectiveMode: CrmImportMode;
    readonly multiProjectOrganization?: string | null;
  }
): CrmImportInterviewScreen | null {
  switch (section) {
    case 'spreadsheet':
      return 'upload';
    case 'destination':
      if (input.launchMode === 'into_existing_parent') return null;
      if (input.multiProjectOrganization === 'worksheet_per_project') {
        return 'worksheet_resolve_summary';
      }
      if (input.multiProjectOrganization === 'header_rows') {
        return 'header_row_projects';
      }
      if (input.structureChoice === 'one_project') {
        return 'choose_parent';
      }
      if (input.structureChoice === 'multiple_projects' || input.effectiveMode === 'master_hierarchy') {
        return 'project_identity';
      }
      return 'choose_parent';
    case 'subprojectNames':
      return 'subproject_identity';
    case 'importedFields':
      return 'fields';
    default:
      return null;
  }
}

/**
 * Earliest interview screen that still needs answers before Review is valid.
 * Returns null when the interview can safely land on Review.
 */
export function findEarliestIncompleteInterviewScreen(
  state: CrmImportInterviewState
): CrmImportInterviewScreen | null {
  if (state.launchMode !== 'into_existing_parent') {
    if (state.structureChoice == null) return 'structure';
    if (state.structureChoice === 'unsure') return 'recommend';

    if (state.structureChoice === 'multiple_projects') {
      if (state.multiProjectOrganization == null) return 'multi_project_organization';
      if (state.multiProjectOrganization === 'header_rows') {
        if (state.projectHeaderRowIndexes == null || state.projectHeaderRowIndexes.length === 0) {
          return 'project_header_rows';
        }
        if (
          state.worksheetProjects == null ||
          state.worksheetProjects.length === 0 ||
          !canContinueWorksheetResolve(
            state.worksheetProjects,
            state.worksheetResolutions ?? {}
          )
        ) {
          return 'header_row_projects';
        }
      } else if (state.multiProjectOrganization === 'worksheet_per_project') {
        if (
          state.worksheetProjects == null ||
          state.worksheetProjects.length === 0 ||
          !canContinueWorksheetResolve(
            state.worksheetProjects,
            state.worksheetResolutions ?? {}
          )
        ) {
          return 'worksheet_projects';
        }
      } else if (state.multiProjectOrganization === 'unsure') {
        return 'recommend';
      } else if (!isCompositionConfigured(state.projectComposition)) {
        return 'project_identity';
      }
    }

    if (state.structureChoice === 'one_project') {
      const included = (state.worksheetProjects ?? []).some((config) => config.included);
      if (!included) return 'select_sheets';
      if (state.selectedParentProjectId == null) return 'choose_parent';
    }
  }

  if (!isCompositionConfigured(state.subprojectComposition)) return 'subproject_identity';
  if (!areFieldsReadyToContinue(state.remainingFields)) return 'fields';

  return null;
}

/**
 * After an Edit from Review, Continue either returns to Review or jumps to the
 * earliest incomplete dependent screen while keeping returnToReview set.
 */
export function continueInterviewAfterEdit(
  state: CrmImportInterviewState
): CrmImportInterviewState {
  if (!state.returnToReview) {
    return goInterviewForward(state);
  }

  const earliest = findEarliestIncompleteInterviewScreen(state);
  if (earliest == null) {
    return {
      ...state,
      history: [...state.history, state.screen],
      screen: 'review',
      returnToReview: false,
    };
  }

  if (earliest === state.screen) {
    return state;
  }

  return {
    ...state,
    history: [...state.history, state.screen],
    screen: earliest,
    returnToReview: true,
  };
}
