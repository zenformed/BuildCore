/**
 * Pure helpers for worksheet Project resolution (create / attach / skip).
 * Focused one-worksheet-at-a-time interview.
 */

import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import type { WorksheetSheetInput } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import { clampImportHeader, normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';

export type WorksheetResolutionKind = 'create_new' | 'attach_existing' | 'skip';

export type WorksheetResolutionDraft = {
  readonly kind: WorksheetResolutionKind;
  readonly existingProjectId: string | null;
  readonly existingProjectLabel: string | null;
  /** True after the user saves this worksheet via Save and continue / Save and review. */
  readonly confirmed: boolean;
};

export type WorksheetResolveStatusKind =
  | 'ready'
  | 'needs_project'
  | 'missing_name'
  | 'duplicate_name'
  | 'skipped';

export type WorksheetProgressKind = 'complete' | 'needs_review' | 'skipped';

export type WorksheetProgressItem = {
  readonly worksheetId: string;
  readonly worksheetName: string;
  readonly kind: WorksheetProgressKind;
};

export type WorksheetHeaderCompatibility =
  | { readonly kind: 'identical'; readonly headers: readonly string[] }
  | { readonly kind: 'mismatched'; readonly worksheetIds: readonly string[] };

export type WorksheetResolveValidationCode =
  | 'ok'
  | 'missing_name'
  | 'duplicate_name'
  | 'needs_project'
  | 'all_skipped';

const DEFAULT_DRAFT: WorksheetResolutionDraft = {
  kind: 'create_new',
  existingProjectId: null,
  existingProjectLabel: null,
  confirmed: false,
};

export function includedWorksheetConfigs(
  configs: readonly WorksheetProjectConfig[]
): readonly WorksheetProjectConfig[] {
  return configs.filter((config) => config.included);
}

export function buildDefaultWorksheetResolutions(
  configs: readonly WorksheetProjectConfig[]
): Readonly<Record<string, WorksheetResolutionDraft>> {
  const next: Record<string, WorksheetResolutionDraft> = {};
  for (const config of includedWorksheetConfigs(configs)) {
    next[config.worksheetId] = { ...DEFAULT_DRAFT };
  }
  return next;
}

/** Preserve prior drafts; seed defaults for newly included worksheets. */
export function mergeWorksheetResolutions(
  previous: Readonly<Record<string, WorksheetResolutionDraft>> | null | undefined,
  configs: readonly WorksheetProjectConfig[]
): Readonly<Record<string, WorksheetResolutionDraft>> {
  const included = includedWorksheetConfigs(configs);
  const next: Record<string, WorksheetResolutionDraft> = {};
  for (const config of included) {
    const existing = previous?.[config.worksheetId];
    next[config.worksheetId] = existing
      ? {
          kind: existing.kind,
          existingProjectId: existing.existingProjectId,
          existingProjectLabel: existing.existingProjectLabel,
          confirmed: existing.confirmed ?? false,
        }
      : { ...DEFAULT_DRAFT };
  }
  return next;
}

export function updateWorksheetResolutionKind(
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  worksheetId: string,
  kind: WorksheetResolutionKind
): Readonly<Record<string, WorksheetResolutionDraft>> {
  const current = resolutions[worksheetId];
  if (current == null) return resolutions;
  return {
    ...resolutions,
    [worksheetId]: {
      kind,
      existingProjectId: current.existingProjectId,
      existingProjectLabel: current.existingProjectLabel,
      confirmed: false,
    },
  };
}

export function updateWorksheetResolutionAttach(
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  worksheetId: string,
  existingProjectId: string | null,
  existingProjectLabel: string | null
): Readonly<Record<string, WorksheetResolutionDraft>> {
  const current = resolutions[worksheetId];
  if (current == null) return resolutions;
  return {
    ...resolutions,
    [worksheetId]: {
      kind: 'attach_existing',
      existingProjectId,
      existingProjectLabel,
      confirmed: false,
    },
  };
}

export function confirmWorksheetResolution(
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  worksheetId: string
): Readonly<Record<string, WorksheetResolutionDraft>> {
  const current = resolutions[worksheetId];
  if (current == null) return resolutions;
  return {
    ...resolutions,
    [worksheetId]: { ...current, confirmed: true },
  };
}

export function collectDuplicateCreateProjectNames(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  options?: { readonly excludeWorksheetId?: string }
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const config of includedWorksheetConfigs(configs)) {
    if (config.worksheetId === options?.excludeWorksheetId) continue;
    const resolution = resolutions[config.worksheetId];
    if (resolution?.kind !== 'create_new') continue;
    const key = normalizeImportText(config.projectName);
    if (!key) continue;
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const duplicates = new Set<string>();
  for (const [key, count] of counts) {
    if (count > 0) duplicates.add(key);
  }
  return duplicates;
}

/** All create_new names that appear more than once (for status display). */
export function collectBlockingDuplicateCreateNames(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const config of includedWorksheetConfigs(configs)) {
    const resolution = resolutions[config.worksheetId];
    if (resolution?.kind !== 'create_new') continue;
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

export function deriveWorksheetResolveStatus(input: {
  readonly config: WorksheetProjectConfig;
  readonly resolution: WorksheetResolutionDraft | null | undefined;
  readonly duplicateNormalizedNames: ReadonlySet<string>;
}): WorksheetResolveStatusKind {
  const { config, resolution, duplicateNormalizedNames } = input;
  if (resolution == null) return 'needs_project';
  if (resolution.kind === 'skip') return 'skipped';
  if (resolution.kind === 'attach_existing') {
    return resolution.existingProjectId ? 'ready' : 'needs_project';
  }
  if (!config.projectName.trim()) return 'missing_name';
  const normalized = normalizeImportText(config.projectName);
  if (normalized && duplicateNormalizedNames.has(normalized)) return 'duplicate_name';
  return 'ready';
}

export function validateCurrentWorksheetResolution(input: {
  readonly config: WorksheetProjectConfig;
  readonly resolution: WorksheetResolutionDraft | null | undefined;
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): WorksheetResolveValidationCode {
  const { config, resolution } = input;
  if (resolution == null) return 'needs_project';
  if (resolution.kind === 'skip') return 'ok';
  if (resolution.kind === 'attach_existing') {
    return resolution.existingProjectId ? 'ok' : 'needs_project';
  }
  if (!config.projectName.trim()) return 'missing_name';
  const others = collectDuplicateCreateProjectNames(input.configs, input.resolutions, {
    excludeWorksheetId: config.worksheetId,
  });
  const normalized = normalizeImportText(config.projectName);
  if (normalized && others.has(normalized)) return 'duplicate_name';
  return 'ok';
}

export function isCurrentWorksheetResolutionSavable(input: {
  readonly config: WorksheetProjectConfig;
  readonly resolution: WorksheetResolutionDraft | null | undefined;
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): boolean {
  return validateCurrentWorksheetResolution(input) === 'ok';
}

export function buildWorksheetProgressItems(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): readonly WorksheetProgressItem[] {
  const duplicates = collectBlockingDuplicateCreateNames(input.configs, input.resolutions);
  return includedWorksheetConfigs(input.configs).map((config) => {
    const resolution = input.resolutions[config.worksheetId];
    if (resolution?.confirmed && resolution.kind === 'skip') {
      return { worksheetId: config.worksheetId, worksheetName: config.worksheetName, kind: 'skipped' };
    }
    if (resolution?.confirmed) {
      const status = deriveWorksheetResolveStatus({
        config,
        resolution,
        duplicateNormalizedNames: duplicates,
      });
      if (status === 'ready' || status === 'skipped') {
        return {
          worksheetId: config.worksheetId,
          worksheetName: config.worksheetName,
          kind: resolution.kind === 'skip' ? 'skipped' : 'complete',
        };
      }
    }
    return {
      worksheetId: config.worksheetId,
      worksheetName: config.worksheetName,
      kind: 'needs_review',
    };
  });
}

export function firstIncludedWorksheetId(
  configs: readonly WorksheetProjectConfig[]
): string | null {
  return includedWorksheetConfigs(configs)[0]?.worksheetId ?? null;
}

export function worksheetIndexAmongIncluded(
  configs: readonly WorksheetProjectConfig[],
  worksheetId: string | null
): number {
  if (worksheetId == null) return 0;
  const index = includedWorksheetConfigs(configs).findIndex(
    (config) => config.worksheetId === worksheetId
  );
  return Math.max(0, index);
}

export function previousIncludedWorksheetId(
  configs: readonly WorksheetProjectConfig[],
  worksheetId: string | null
): string | null {
  const included = includedWorksheetConfigs(configs);
  const index = included.findIndex((config) => config.worksheetId === worksheetId);
  if (index <= 0) return null;
  return included[index - 1]?.worksheetId ?? null;
}

export function nextUnresolvedWorksheetId(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  afterWorksheetId: string | null
): string | null {
  const included = includedWorksheetConfigs(configs);
  const start = afterWorksheetId
    ? included.findIndex((config) => config.worksheetId === afterWorksheetId) + 1
    : 0;
  for (let i = start; i < included.length; i += 1) {
    const id = included[i]!.worksheetId;
    if (!resolutions[id]?.confirmed) return id;
  }
  for (let i = 0; i < start; i += 1) {
    const id = included[i]!.worksheetId;
    if (!resolutions[id]?.confirmed) return id;
  }
  return null;
}

export function allIncludedWorksheetsConfirmed(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): boolean {
  const included = includedWorksheetConfigs(configs);
  if (included.length === 0) return false;
  return included.every((config) => resolutions[config.worksheetId]?.confirmed === true);
}

export function summarizeWorksheetResolveSelection(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): {
  readonly selectedCount: number;
  readonly importingCount: number;
  readonly totalCount: number;
  readonly totalRows: number;
  readonly projectCount: number;
} {
  const included = includedWorksheetConfigs(input.configs);
  const importing = included.filter((config) => {
    const resolution = input.resolutions[config.worksheetId];
    return resolution != null && resolution.kind !== 'skip';
  });
  const projectKeys = new Set<string>();
  for (const config of importing) {
    const resolution = input.resolutions[config.worksheetId];
    if (resolution == null) continue;
    if (resolution.kind === 'attach_existing' && resolution.existingProjectId) {
      projectKeys.add(`attach:${resolution.existingProjectId}`);
      continue;
    }
    const created = normalizeImportText(config.projectName) || normalizeImportText(config.worksheetName);
    if (created) projectKeys.add(`create:${created}`);
  }
  return {
    selectedCount: included.length,
    importingCount: importing.length,
    totalCount: included.length,
    totalRows: importing.reduce((sum, config) => sum + config.dataRowCount, 0),
    projectCount: projectKeys.size,
  };
}

/** Review metrics for worksheet-per-Project imports (additive across sheets). */
export function summarizeWorksheetImportReview(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
}): {
  readonly sheetsCount: number;
  readonly rowsCount: number;
  readonly destinationLabel: string;
  readonly groupsSummary: {
    readonly created: number;
    readonly attached: number;
    readonly ignored: number;
  };
} {
  const included = includedWorksheetConfigs(input.configs);
  const labels: string[] = [];
  const seenLabels = new Set<string>();
  let sheetsCount = 0;
  let rowsCount = 0;
  let createdRows = 0;
  let attachedRows = 0;
  let ignoredRows = 0;

  for (const config of included) {
    const resolution = input.resolutions[config.worksheetId];
    if (resolution == null || resolution.kind === 'skip') {
      ignoredRows += config.dataRowCount;
      continue;
    }
    sheetsCount += 1;
    rowsCount += config.dataRowCount;
    if (resolution.kind === 'attach_existing') {
      attachedRows += config.dataRowCount;
      const label = resolution.existingProjectLabel?.trim() || config.projectName.trim();
      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        labels.push(label);
      }
    } else {
      createdRows += config.dataRowCount;
      const label = config.projectName.trim() || config.worksheetName;
      if (label && !seenLabels.has(label)) {
        seenLabels.add(label);
        labels.push(label);
      }
    }
  }

  return {
    sheetsCount,
    rowsCount,
    destinationLabel: labels.join(' · ') || '—',
    groupsSummary: {
      // "new" = Subprojects being imported (additive across worksheets).
      created: createdRows + attachedRows,
      attached: 0,
      ignored: ignoredRows,
    },
  };
}

/** Summary / final Continue: every worksheet confirmed and at least one imported. */
export function canContinueWorksheetResolve(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): boolean {
  if (!allIncludedWorksheetsConfirmed(configs, resolutions)) return false;
  const included = includedWorksheetConfigs(configs);
  if (included.length === 0) return false;
  const importing = included.filter((config) => resolutions[config.worksheetId]?.kind !== 'skip');
  if (importing.length === 0) return false;
  const duplicates = collectBlockingDuplicateCreateNames(configs, resolutions);
  return included.every((config) => {
    const status = deriveWorksheetResolveStatus({
      config,
      resolution: resolutions[config.worksheetId],
      duplicateNormalizedNames: duplicates,
    });
    return status === 'ready' || status === 'skipped';
  });
}

/** Parent display name used as the injected master-hierarchy parent key for a worksheet. */
export function worksheetParentDisplayName(
  config: WorksheetProjectConfig,
  resolution: WorksheetResolutionDraft | undefined
): string {
  if (resolution?.kind === 'attach_existing') {
    return (
      resolution.existingProjectLabel?.trim() ||
      config.projectName.trim() ||
      config.worksheetName
    );
  }
  return config.projectName.trim() || config.worksheetName;
}

/** Map worksheet create/attach decisions onto master-hierarchy group resolution drafts. */
export function buildWorksheetGroupResolutions(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): Readonly<
  Record<
    string,
    {
      readonly type: 'create_new' | 'attach_existing' | 'ignore';
      readonly attachProjectId?: string;
      readonly attachLabel?: string;
    }
  >
> {
  const out: Record<
    string,
    {
      readonly type: 'create_new' | 'attach_existing' | 'ignore';
      readonly attachProjectId?: string;
      readonly attachLabel?: string;
    }
  > = {};
  for (const config of includedWorksheetConfigs(configs)) {
    const resolution = resolutions[config.worksheetId];
    if (resolution == null || resolution.kind === 'skip') continue;
    const name = worksheetParentDisplayName(config, resolution);
    const groupKey = `name:${normalizeImportText(name)}`;
    if (resolution.kind === 'attach_existing' && resolution.existingProjectId) {
      out[groupKey] = {
        type: 'attach_existing',
        attachProjectId: resolution.existingProjectId,
        attachLabel: resolution.existingProjectLabel ?? name,
      };
    } else {
      out[groupKey] = { type: 'create_new' };
    }
  }
  return out;
}

export function extractWorksheetHeaders(
  matrix: readonly (readonly string[])[],
  headerRowIndex: number
): readonly string[] {
  const row = matrix[headerRowIndex] ?? [];
  return row.map((cell, index) => clampImportHeader(cell || `Column ${index + 1}`));
}

function headerSignature(headers: readonly string[]): string {
  return headers.map((header) => normalizeImportText(header)).join('\u0001');
}

export function analyzeWorksheetHeaderCompatibility(input: {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly sheetsById: ReadonlyMap<string, WorksheetSheetInput>;
}): WorksheetHeaderCompatibility {
  const active = includedWorksheetConfigs(input.configs).filter(
    (config) => input.resolutions[config.worksheetId]?.kind !== 'skip'
  );
  if (active.length === 0) {
    return { kind: 'identical', headers: [] };
  }

  const first = active[0]!;
  const firstSheet = input.sheetsById.get(first.worksheetId);
  const firstHeaders = extractWorksheetHeaders(firstSheet?.matrix ?? [], first.headerRowIndex);
  const firstSig = headerSignature(firstHeaders);

  for (const config of active) {
    const sheet = input.sheetsById.get(config.worksheetId);
    const headers = extractWorksheetHeaders(sheet?.matrix ?? [], config.headerRowIndex);
    if (headerSignature(headers) !== firstSig) {
      return {
        kind: 'mismatched',
        worksheetIds: active.map((item) => item.worksheetId),
      };
    }
  }
  return { kind: 'identical', headers: firstHeaders };
}

/** Next interview screen after resolution summary, based on header compatibility. */
export function nextScreenAfterWorksheetResolve(
  compatibility: WorksheetHeaderCompatibility
): 'subproject_identity' | 'worksheet_subproject_setup' {
  return compatibility.kind === 'identical' ? 'subproject_identity' : 'worksheet_subproject_setup';
}
