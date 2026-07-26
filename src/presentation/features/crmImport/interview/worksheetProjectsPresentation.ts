/**
 * Pure helpers for the worksheet-based Projects interview screen.
 * Master-detail: each selected worksheet is assigned to an existing/new Project
 * (or skipped); rows become Subprojects.
 */

import {
  detectSpreadsheetHeaderRowIndex,
  toUserFacingSpreadsheetRowNumber,
  toZeroBasedSpreadsheetRowIndex,
} from '@/domain/crm/spreadsheetImportHeaderDetection';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import type { WorksheetResolutionDraft } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';

export type WorksheetProjectConfig = {
  readonly worksheetId: string;
  readonly worksheetName: string;
  readonly included: boolean;
  readonly projectName: string;
  readonly headerRowIndex: number;
  readonly dataRowCount: number;
  readonly columnCount: number;
};

export type WorksheetProjectStatusKind =
  | 'ready'
  | 'needs_review'
  | 'skipped'
  | 'no_data'
  | 'needs_header';

export type WorksheetSheetInput = {
  readonly worksheetId: string;
  readonly worksheetName: string;
  readonly matrix: readonly (readonly string[])[];
};

export type WorksheetProjectRowView = {
  readonly config: WorksheetProjectConfig;
  readonly status: WorksheetProjectStatusKind;
  readonly importable: boolean;
  readonly headerOptions: readonly number[];
  readonly muted: boolean;
  readonly controlsDisabled: boolean;
};

function isBlankRow(row: readonly string[]): boolean {
  return row.every((cell) => cell.trim() === '');
}

function hasAnyContent(matrix: readonly (readonly string[])[]): boolean {
  return matrix.some((row) => row.some((cell) => cell.trim() !== ''));
}

/** Non-blank scan candidates for the header-row selector (0-based). */
export function listWorksheetHeaderRowCandidates(
  matrix: readonly (readonly string[])[],
  maxScanRows = 40
): readonly number[] {
  const limit = Math.min(matrix.length, maxScanRows);
  const indexes: number[] = [];
  for (let i = 0; i < limit; i += 1) {
    if (!isBlankRow(matrix[i] ?? [])) indexes.push(i);
  }
  if (indexes.length === 0 && matrix.length > 0) {
    return [0];
  }
  return indexes;
}

export function computeWorksheetStatsForHeader(
  matrix: readonly (readonly string[])[],
  headerRowIndex: number
): { readonly dataRowCount: number; readonly columnCount: number } {
  if (matrix.length === 0 || headerRowIndex < 0 || headerRowIndex >= matrix.length) {
    return { dataRowCount: 0, columnCount: 0 };
  }
  const headerRow = matrix[headerRowIndex] ?? [];
  const columnCount = headerRow.reduce((max, cell, index) => {
    if (cell.trim() === '') return max;
    return Math.max(max, index + 1);
  }, 0);

  const dataRowCount = matrix
    .slice(headerRowIndex + 1)
    .filter((row) => row.some((cell) => cell.trim() !== '')).length;

  return { dataRowCount, columnCount };
}

/** True when some header choice yields at least one non-blank data row. */
export function worksheetHasImportableData(matrix: readonly (readonly string[])[]): boolean {
  if (!hasAnyContent(matrix)) return false;
  const candidates = listWorksheetHeaderRowCandidates(matrix);
  for (const headerRowIndex of candidates) {
    const stats = computeWorksheetStatsForHeader(matrix, headerRowIndex);
    if (stats.dataRowCount > 0 && stats.columnCount > 0) return true;
  }
  return false;
}

export function buildInitialWorksheetProjectConfig(sheet: WorksheetSheetInput): WorksheetProjectConfig {
  const importable = worksheetHasImportableData(sheet.matrix);
  const headerRowIndex = hasAnyContent(sheet.matrix)
    ? detectSpreadsheetHeaderRowIndex(sheet.matrix)
    : 0;
  const stats = computeWorksheetStatsForHeader(sheet.matrix, headerRowIndex);
  return {
    worksheetId: sheet.worksheetId,
    worksheetName: sheet.worksheetName,
    included: importable && stats.dataRowCount > 0 && stats.columnCount > 0,
    projectName: sheet.worksheetName,
    headerRowIndex,
    dataRowCount: stats.dataRowCount,
    columnCount: stats.columnCount,
  };
}

export function buildInitialWorksheetProjectConfigs(
  sheets: readonly WorksheetSheetInput[]
): readonly WorksheetProjectConfig[] {
  return sheets.map((sheet) => buildInitialWorksheetProjectConfig(sheet));
}

/**
 * Preserve prior edits when re-entering the screen; seed new sheets; drop removed ones.
 */
export function mergeWorksheetProjectConfigs(
  previous: readonly WorksheetProjectConfig[] | null | undefined,
  sheets: readonly WorksheetSheetInput[]
): readonly WorksheetProjectConfig[] {
  const byId = new Map((previous ?? []).map((config) => [config.worksheetId, config]));
  return sheets.map((sheet) => {
    const existing = byId.get(sheet.worksheetId);
    if (existing == null) return buildInitialWorksheetProjectConfig(sheet);
    const stats = computeWorksheetStatsForHeader(sheet.matrix, existing.headerRowIndex);
    const importable = worksheetHasImportableData(sheet.matrix);
    return {
      ...existing,
      worksheetName: sheet.worksheetName,
      dataRowCount: stats.dataRowCount,
      columnCount: stats.columnCount,
      included: importable ? existing.included : false,
      headerRowIndex: hasAnyContent(sheet.matrix) ? existing.headerRowIndex : 0,
      projectName: existing.projectName.trim() ? existing.projectName : sheet.worksheetName,
    };
  });
}

export function updateWorksheetProjectIncluded(
  configs: readonly WorksheetProjectConfig[],
  worksheetId: string,
  included: boolean
): readonly WorksheetProjectConfig[] {
  return configs.map((config) =>
    config.worksheetId === worksheetId ? { ...config, included } : config
  );
}

export function updateWorksheetProjectName(
  configs: readonly WorksheetProjectConfig[],
  worksheetId: string,
  projectName: string
): readonly WorksheetProjectConfig[] {
  return configs.map((config) =>
    config.worksheetId === worksheetId ? { ...config, projectName } : config
  );
}

export function updateWorksheetProjectHeaderRow(
  configs: readonly WorksheetProjectConfig[],
  worksheetId: string,
  headerRowIndex: number,
  matrix: readonly (readonly string[])[]
): readonly WorksheetProjectConfig[] {
  const stats = computeWorksheetStatsForHeader(matrix, headerRowIndex);
  return configs.map((config) =>
    config.worksheetId === worksheetId
      ? {
          ...config,
          headerRowIndex,
          dataRowCount: stats.dataRowCount,
          columnCount: stats.columnCount,
        }
      : config
  );
}

/** Include a worksheet and clear skip so it needs Project assignment again. */
export function includeWorksheetForAssignment(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly worksheetId: string;
}): {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
} {
  const configs = updateWorksheetProjectIncluded(input.configs, input.worksheetId, true);
  const current = input.resolutions[input.worksheetId];
  if (current != null && current.kind === 'attach_existing' && current.existingProjectId) {
    return {
      configs,
      resolutions: {
        ...input.resolutions,
        [input.worksheetId]: { ...current, confirmed: true },
      },
    };
  }
  return {
    configs,
    resolutions: {
      ...input.resolutions,
      [input.worksheetId]: {
        kind: 'attach_existing',
        existingProjectId:
          current?.kind === 'attach_existing' ? current.existingProjectId : null,
        existingProjectLabel:
          current?.kind === 'attach_existing' ? current.existingProjectLabel : null,
        confirmed: false,
      },
    },
  };
}

/** Skip / uncheck: exclude from import and mark skip confirmed. */
export function skipWorksheetAssignment(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly worksheetId: string;
}): {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
} {
  const current = input.resolutions[input.worksheetId];
  return {
    configs: updateWorksheetProjectIncluded(input.configs, input.worksheetId, false),
    resolutions: {
      ...input.resolutions,
      [input.worksheetId]: {
        kind: 'skip',
        existingProjectId: current?.existingProjectId ?? null,
        existingProjectLabel: current?.existingProjectLabel ?? null,
        confirmed: true,
      },
    },
  };
}

/** Attach an eligible existing (or newly created) Project and mark Ready. */
export function assignWorksheetExistingProject(input: {
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly worksheetId: string;
  readonly projectId: string;
  readonly projectLabel: string;
}): Readonly<Record<string, WorksheetResolutionDraft>> {
  return {
    ...input.resolutions,
    [input.worksheetId]: {
      kind: 'attach_existing',
      existingProjectId: input.projectId,
      existingProjectLabel: input.projectLabel,
      confirmed: true,
    },
  };
}

export function collectDuplicateWorksheetProjectNames(
  configs: readonly WorksheetProjectConfig[]
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const config of configs) {
    if (!config.included) continue;
    const key = normalizeImportText(config.projectName);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 1) duplicates.add(key);
  }
  return duplicates;
}

export function deriveWorksheetProjectStatus(input: {
  readonly config: WorksheetProjectConfig;
  readonly resolution: WorksheetResolutionDraft | null | undefined;
  readonly importable: boolean;
}): WorksheetProjectStatusKind {
  const { config, resolution, importable } = input;
  if (!importable || config.dataRowCount <= 0) return 'no_data';
  if (config.columnCount <= 0) return 'needs_header';
  if (!config.included || resolution?.kind === 'skip') return 'skipped';
  if (
    resolution?.kind === 'attach_existing' &&
    resolution.existingProjectId &&
    resolution.confirmed
  ) {
    return 'ready';
  }
  return 'needs_review';
}

export function buildWorksheetProjectRowViews(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly sheetsById: ReadonlyMap<string, WorksheetSheetInput>;
}): readonly WorksheetProjectRowView[] {
  return input.configs.map((config) => {
    const sheet = input.sheetsById.get(config.worksheetId);
    const matrix = sheet?.matrix ?? [];
    const importable = worksheetHasImportableData(matrix);
    const status = deriveWorksheetProjectStatus({
      config,
      resolution: input.resolutions[config.worksheetId],
      importable,
    });
    return {
      config,
      status,
      importable,
      headerOptions: listWorksheetHeaderRowCandidates(matrix),
      muted: !config.included || status === 'skipped',
      controlsDisabled: !config.included || !importable || status === 'skipped',
    };
  });
}

export function firstWorksheetId(configs: readonly WorksheetProjectConfig[]): string | null {
  return configs[0]?.worksheetId ?? null;
}

export function resolveActiveWorksheetId(
  configs: readonly WorksheetProjectConfig[],
  activeWorksheetId: string | null
): string | null {
  if (activeWorksheetId != null && configs.some((c) => c.worksheetId === activeWorksheetId)) {
    return activeWorksheetId;
  }
  return firstWorksheetId(configs);
}

/** Continue when at least one sheet imports and every included sheet is Ready. */
export function canContinueWorksheetProjects(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  sheetsById: ReadonlyMap<string, WorksheetSheetInput>
): boolean {
  const selected = configs.filter((config) => config.included);
  if (selected.length === 0) return false;
  return selected.every((config) => {
    const sheet = sheetsById.get(config.worksheetId);
    const importable = worksheetHasImportableData(sheet?.matrix ?? []);
    return (
      deriveWorksheetProjectStatus({
        config,
        resolution: resolutions[config.worksheetId],
        importable,
      }) === 'ready'
    );
  });
}

export function summarizeWorksheetProjectSelection(
  configs: readonly WorksheetProjectConfig[]
): {
  readonly selectedCount: number;
  readonly totalCount: number;
  readonly totalRows: number;
} {
  const selected = configs.filter((config) => config.included);
  return {
    selectedCount: selected.length,
    totalCount: configs.length,
    totalRows: selected.reduce((sum, config) => sum + config.dataRowCount, 0),
  };
}

export function trimWorksheetProjectNames(
  configs: readonly WorksheetProjectConfig[]
): readonly WorksheetProjectConfig[] {
  return configs.map((config) => ({
    ...config,
    projectName: config.projectName.trim(),
  }));
}

/**
 * Ensure skipped/unincluded sheets have confirmed skip resolutions before leaving
 * the master-detail screen.
 */
export function syncWorksheetResolutionsForContinue(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): Readonly<Record<string, WorksheetResolutionDraft>> {
  const resolutions: Record<string, WorksheetResolutionDraft> = { ...input.resolutions };
  for (const config of input.configs) {
    if (!config.included) {
      const current = resolutions[config.worksheetId];
      resolutions[config.worksheetId] = {
        kind: 'skip',
        existingProjectId: current?.existingProjectId ?? null,
        existingProjectLabel: current?.existingProjectLabel ?? null,
        confirmed: true,
      };
      continue;
    }
    const current = resolutions[config.worksheetId];
    if (
      current?.kind === 'attach_existing' &&
      current.existingProjectId &&
      !current.confirmed
    ) {
      resolutions[config.worksheetId] = { ...current, confirmed: true };
    }
  }
  return resolutions;
}

export { toUserFacingSpreadsheetRowNumber, toZeroBasedSpreadsheetRowIndex };
