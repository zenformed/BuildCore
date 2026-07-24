'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useId, useMemo, useState } from 'react';
import type * as XLSX from 'xlsx';
import type {
  CrmImportColumnMapping,
  CrmImportJobCounts,
  CrmImportMode,
  CrmImportParentResolution,
  CrmImportParsedRow,
} from '@/domain/crm/spreadsheetImportTypes';
import { isCompositionConfigured } from '@/domain/crm/spreadsheetImportComposition';
import {
  buildImportParentGroups,
  detectParentFieldConflicts,
  normalizeImportText,
} from '@/domain/crm/spreadsheetImportGrouping';
import {
  areParentConflictsResolved,
  buildResolvedParentAttributesForGroup,
} from '@/domain/crm/spreadsheetImportConflictResolution';
import {
  filterEligibleImportParentProjects,
  type CrmImportParentCandidate,
} from '@/domain/crm/spreadsheetImportParentSearch';
import { detectSpreadsheetHeaderRowIndex } from '@/domain/crm/spreadsheetImportHeaderDetection';
import { getSpreadsheetImportWizardTitle } from '@/domain/crm/spreadsheetImportIntroCopy';
import { suggestFieldPlacementFromGroupConsistency } from '@/domain/crm/spreadsheetImportFieldPlacement';
import { recommendSpreadsheetStructures } from '@/domain/crm/spreadsheetImportStructureAnalysis';
import { getSubprojectNameFromRow } from '@/domain/crm/spreadsheetImportValidation';
import { listCrmProjectSummaries } from '@/application/use-cases/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { canMutateCrmProjectsInCurrentRuntime } from '@/infrastructure/demo/canMutateCrmProjectsInCurrentRuntime';
import {
  createSpreadsheetImportDraftFromApi,
  downloadSpreadsheetImportErrorCsvFromApi,
  saveSpreadsheetImportResolutionsFromApi,
  validateSpreadsheetImportJobFromApi,
  type CrmImportValidateGroup,
} from '@/infrastructure/crm/api/crmSpreadsheetImportApi';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { SpreadsheetImportModal } from '@/presentation/components/CrmImport/SpreadsheetImportModal';
import {
  parseSheetToImportRows,
  parseSpreadsheetFile,
  sheetToMatrix,
  type ParsedSpreadsheetFile,
} from '@/presentation/features/crmImport/parseSpreadsheetFile';
import {
  cancelImportChunkRunner,
  isImportChunkRunnerActive,
  startOrAttachImportChunkRunner,
  subscribeImportChunkRunner,
} from '@/presentation/features/crmImport/importChunkRunnerCoordinator';
import {
  failedRowsDisplayCount,
  isImportExecutionSettled,
  isImportExecutionSuccessful,
  shouldConfirmCancelImport,
} from '@/presentation/features/crmImport/interview/importPresentation';
import { detectLikelyFirstLastNameColumns, suggestColumnMappings } from '@/presentation/features/crmImport/suggestColumnMappings';
import {
  applyRecommendation,
  applyStructureChoice,
  applyMultiProjectOrganization,
  clearDownstreamAfterHeaderChange,
  clearDownstreamAfterProjectIdentityChange,
  createInitialInterviewState,
  goInterviewBack,
  goInterviewForward,
  interviewScreenToMilestone,
  jumpInterviewFromReview,
  jumpInterviewTo,
  milestonesForInterview,
  resolveEffectiveImportMode,
  type CrmImportFieldPlacement,
  type CrmImportInterviewScreen,
  type CrmImportInterviewState,
  type CrmImportMultiProjectOrganization,
  type CrmImportProgressMilestone,
  type CrmImportRemainingFieldDraft,
  type CrmImportStructureChoice,
} from '@/presentation/features/crmImport/interview/interviewState';
import { buildImportPayloadFromInterview } from '@/presentation/features/crmImport/interview/buildImportPayloadFromInterview';
import {
  buildKeyFieldChips,
  collectReviewClientIssues,
  continueInterviewAfterEdit,
  countMappedAndIgnoredColumns,
  reviewIssueMetricCount,
} from '@/presentation/features/crmImport/interview/reviewPresentation';
import { buildSubprojectIdentityPrimaryPreview } from '@/presentation/features/crmImport/interview/subprojectIdentityPresentation';
import { InterviewProgressPipeline } from '@/presentation/features/crmImport/interview/InterviewProgressPipeline';
import { UploadScreen } from '@/presentation/features/crmImport/interview/screens/UploadScreen';
import { HeaderScreen } from '@/presentation/features/crmImport/interview/screens/HeaderScreen';
import { StructureScreen, RecommendScreen } from '@/presentation/features/crmImport/interview/screens/StructureScreen';
import { isMultiProjectOrganizationSelectable } from '@/presentation/features/crmImport/interview/multiProjectOrganizationPresentation';
import {
  ComingSoonImportScreen,
  MultiProjectOrganizationScreen,
} from '@/presentation/features/crmImport/interview/screens/MultiProjectOrganizationScreen';
import { ChooseParentScreen } from '@/presentation/features/crmImport/interview/screens/ChooseParentScreen';
import {
  ProjectIdentityScreen,
  SubprojectIdentityScreen,
} from '@/presentation/features/crmImport/interview/screens/IdentityScreens';
import { FieldsScreen, LOCKED_STANDARD_KEYS } from '@/presentation/features/crmImport/interview/screens/FieldsScreen';
import {
  UNSET_DESTINATION_KEY,
  areFieldsReadyToContinue,
  buildFieldsDestinationGroups,
} from '@/presentation/features/crmImport/interview/fieldsPresentation';
import {
  ConflictScreen,
  HierarchyPreviewScreen,
  ParentResolveScreen,
} from '@/presentation/features/crmImport/interview/screens/HierarchyScreens';
import { ReviewScreen } from '@/presentation/features/crmImport/interview/screens/ReviewScreen';
import { ImportScreen } from '@/presentation/features/crmImport/interview/screens/ImportScreens';
import { useBuildCoreProjectCustomFieldsForScope } from '@/presentation/providers/BuildCoreProjectCustomFieldsProvider';
import { crmRepositories } from '@/shared/di/container';
import styles from './SpreadsheetImportWizard.module.css';

export type SpreadsheetImportWizardProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly mode: CrmImportMode;
  readonly fixedParentProjectId?: string;
  readonly fixedParentDisplayName?: string;
  /** Address or customer line shown under the parent name in Mode 1. */
  readonly fixedParentContextLine?: string | null;
  readonly onCompleted?: () => void;
};

const EMPTY_COUNTS: CrmImportJobCounts = {
  createdParents: 0,
  existingParentsUsed: 0,
  createdSubprojects: 0,
  failedRows: 0,
  excludedRows: 0,
  invalidRows: 0,
  warningCount: 0,
  failedGroups: 0,
  ignoredGroups: 0,
};

function collectLockedIndexes(state: CrmImportInterviewState): Set<number> {
  const set = new Set<number>();
  for (const idx of state.projectComposition?.columnIndexes ?? []) set.add(idx);
  for (const idx of state.subprojectComposition?.columnIndexes ?? []) set.add(idx);
  for (const idx of state.contactComposition?.columnIndexes ?? []) set.add(idx);
  return set;
}

function draftFromSuggestion(
  sourceIndex: number,
  suggestion: ReturnType<typeof suggestColumnMappings>[number] | undefined,
  placementOverride?: CrmImportFieldPlacement
): CrmImportRemainingFieldDraft {
  if (suggestion == null || suggestion.ownership === 'ignored' || suggestion.destination.kind === 'ignored') {
    // Keep the column enabled so the user can choose a destination (never trap as ignored).
    return { sourceIndex, destinationKey: UNSET_DESTINATION_KEY, placement: 'subproject' };
  }
  const placement: CrmImportFieldPlacement =
    placementOverride === 'project' || placementOverride === 'subproject'
      ? placementOverride
      : suggestion.ownership === 'parent'
        ? 'project'
        : 'subproject';
  if (suggestion.destination.kind === 'standard_field') {
    if (LOCKED_STANDARD_KEYS.has(suggestion.destination.key)) {
      return { sourceIndex, destinationKey: UNSET_DESTINATION_KEY, placement: 'subproject' };
    }
    return {
      sourceIndex,
      destinationKey: `standard:${placement === 'project' ? 'project' : 'subproject'}:${suggestion.destination.key}`,
      placement,
    };
  }
  if (suggestion.destination.kind === 'existing_custom_field') {
    return {
      sourceIndex,
      destinationKey: `existing_cf:${suggestion.destination.scope}:${suggestion.destination.fieldKey}:${suggestion.destination.definitionId}`,
      placement,
    };
  }
  return { sourceIndex, destinationKey: UNSET_DESTINATION_KEY, placement: 'subproject' };
}

function fieldDraftsEqual(
  a: readonly CrmImportRemainingFieldDraft[],
  b: readonly CrmImportRemainingFieldDraft[]
): boolean {
  if (a.length !== b.length) return false;
  const byIndex = new Map(b.map((f) => [f.sourceIndex, f]));
  return a.every((field) => {
    const other = byIndex.get(field.sourceIndex);
    return (
      other != null &&
      other.destinationKey === field.destinationKey &&
      other.placement === field.placement
    );
  });
}

export function SpreadsheetImportWizard({
  open,
  onClose,
  mode,
  fixedParentProjectId,
  fixedParentDisplayName,
  fixedParentContextLine = null,
  onCompleted,
}: SpreadsheetImportWizardProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const nav = copy.interview.nav;
  const titleId = useId();
  const { activeDefinitions: projectCustomFields } =
    useBuildCoreProjectCustomFieldsForScope('project');
  const { activeDefinitions: subprojectCustomFields } =
    useBuildCoreProjectCustomFieldsForScope('subproject');
  const canMutateProjects = canMutateCrmProjectsInCurrentRuntime();
  const isApiSource = getCrmDataSource() === 'api';
  const canImport = canMutateProjects && isApiSource;

  const [interview, setInterview] = useState<CrmImportInterviewState>(() =>
    createInitialInterviewState({
      launchMode: mode,
      fixedParentProjectId: fixedParentProjectId ?? null,
      fixedParentDisplayName: fixedParentDisplayName ?? null,
    })
  );
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [parsedFile, setParsedFile] = useState<ParsedSpreadsheetFile | null>(null);
  const [sheetName, setSheetName] = useState('');
  const [sheetMatrix, setSheetMatrix] = useState<string[][]>([]);
  const [headerRowIndex, setHeaderRowIndex] = useState(0);
  const [detectedHeaderRowIndex, setDetectedHeaderRowIndex] = useState(0);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<CrmImportParsedRow[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [jobId, setJobId] = useState<string | null>(null);
  const [idempotencyKey, setIdempotencyKey] = useState('');
  const [mappingErrors, setMappingErrors] = useState<string[]>([]);
  const [parentCandidates, setParentCandidates] = useState<readonly CrmImportParentCandidate[]>([]);
  const [excludedRowNumbers, setExcludedRowNumbers] = useState<ReadonlySet<number>>(() => new Set());
  const [importStatus, setImportStatus] = useState('');
  const [importCounts, setImportCounts] = useState<CrmImportJobCounts>(EMPTY_COUNTS);
  const [clientClaimToken, setClientClaimToken] = useState('');
  const [cumulativeProcessed, setCumulativeProcessed] = useState(0);
  const [lastChunkProcessed, setLastChunkProcessed] = useState(0);
  const [peakPercent, setPeakPercent] = useState(0);
  const [importDone, setImportDone] = useState(false);
  const [cancelConfirmOpen, setCancelConfirmOpen] = useState(false);
  const [cancellingImport, setCancellingImport] = useState(false);
  const [completionToast, setCompletionToast] = useState<string | null>(null);

  const existingCustomFields = useMemo(
    () => [
      ...projectCustomFields.map((field) => ({
        scope: 'project' as const,
        fieldKey: field.fieldKey,
        definitionId: field.id,
        label: field.label,
      })),
      ...subprojectCustomFields.map((field) => ({
        scope: 'subproject' as const,
        fieldKey: field.fieldKey,
        definitionId: field.id,
        label: field.label,
      })),
    ],
    [projectCustomFields, subprojectCustomFields]
  );

  const resetWizard = useCallback(() => {
    setInterview(
      createInitialInterviewState({
        launchMode: mode,
        fixedParentProjectId: fixedParentProjectId ?? null,
        fixedParentDisplayName: fixedParentDisplayName ?? null,
      })
    );
    setBusy(false);
    setError(null);
    setSelectedFile(null);
    setParsedFile(null);
    setSheetName('');
    setSheetMatrix([]);
    setHeaderRowIndex(0);
    setDetectedHeaderRowIndex(0);
    setHeaders([]);
    setRows([]);
    setTruncated(false);
    setJobId(null);
    setIdempotencyKey('');
    setMappingErrors([]);
    setParentCandidates([]);
    setExcludedRowNumbers(new Set());
    setImportStatus('');
    setImportCounts(EMPTY_COUNTS);
    setClientClaimToken('');
    setCumulativeProcessed(0);
    setLastChunkProcessed(0);
    setPeakPercent(0);
    setImportDone(false);
    setCancelConfirmOpen(false);
    setCancellingImport(false);
    setCompletionToast(null);
  }, [fixedParentDisplayName, fixedParentProjectId, mode]);

  useEffect(() => {
    if (open) return;
    // Keep wizard state while a background chunk runner is still active so Close is safe.
    if (isImportChunkRunnerActive(jobId)) return;
    resetWizard();
  }, [open, jobId, resetWizard]);

  const handleClose = useCallback(() => {
    // Close never cancels — the module-level chunk runner keeps going.
    onClose();
  }, [onClose]);

  useEffect(() => {
    if (jobId == null || !isImportChunkRunnerActive(jobId)) return;
    return subscribeImportChunkRunner(jobId, (progress) => {
      setImportStatus(progress.status);
      setImportCounts(progress.counts);
      setCumulativeProcessed(progress.cumulativeProcessed);
      setLastChunkProcessed(progress.lastChunkProcessed);
      setPeakPercent(progress.peakPercent);
      setImportDone(progress.done);
    });
  }, [jobId, open]);

  useEffect(() => {
    if (completionToast == null) return;
    const timeout = window.setTimeout(() => setCompletionToast(null), 3500);
    return () => window.clearTimeout(timeout);
  }, [completionToast]);

  // ---------------------------------------------------------------------
  // Upload / sheet / header
  // ---------------------------------------------------------------------

  const applyParsedSheet = useCallback(
    async (workbook: XLSX.WorkBook, nextSheetName: string, nextHeaderRowIndex: number) => {
      const matrix = sheetToMatrix(workbook, nextSheetName);
      setSheetMatrix(matrix);
      const parsed = await parseSheetToImportRows(workbook, nextSheetName, nextHeaderRowIndex);
      if (parsed.rows.length === 0) {
        throw new Error(copy.errors.noDataRows);
      }
      setHeaders([...parsed.headers]);
      setRows([...parsed.rows]);
      setTruncated(Boolean(parsed.truncated));
    },
    [copy.errors.noDataRows]
  );

  const handleFileChange = useCallback(
    async (file: File | null) => {
      setError(null);
      setSelectedFile(file);
      if (file == null) {
        setParsedFile(null);
        setSheetName('');
        setSheetMatrix([]);
        setHeaders([]);
        setRows([]);
        return;
      }
      setBusy(true);
      try {
        const parsed = await parseSpreadsheetFile(file);
        setParsedFile(parsed);
        setSheetName(parsed.defaultSheetName);
        setDetectedHeaderRowIndex(parsed.suggestedHeaderRowIndex);
        setHeaderRowIndex(parsed.suggestedHeaderRowIndex);
        await applyParsedSheet(parsed.workbook, parsed.defaultSheetName, parsed.suggestedHeaderRowIndex);
        setInterview((s) => clearDownstreamAfterHeaderChange(s));
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errors.parseFailed);
        setParsedFile(null);
      } finally {
        setBusy(false);
      }
    },
    [applyParsedSheet, copy.errors.parseFailed]
  );

  const handleSheetChange = useCallback(
    async (nextSheetName: string) => {
      if (parsedFile == null) return;
      setSheetName(nextSheetName);
      setBusy(true);
      setError(null);
      try {
        const matrix = sheetToMatrix(parsedFile.workbook, nextSheetName);
        const suggested = detectSpreadsheetHeaderRowIndex(matrix);
        setDetectedHeaderRowIndex(suggested);
        setHeaderRowIndex(suggested);
        await applyParsedSheet(parsedFile.workbook, nextSheetName, suggested);
        setInterview((s) => clearDownstreamAfterHeaderChange(s));
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errors.parseFailed);
      } finally {
        setBusy(false);
      }
    },
    [applyParsedSheet, copy.errors.parseFailed, parsedFile]
  );

  const handleHeaderRowChange = useCallback(
    async (nextHeaderRowIndex: number) => {
      if (parsedFile == null || !sheetName) return;
      setHeaderRowIndex(nextHeaderRowIndex);
      setBusy(true);
      setError(null);
      try {
        await applyParsedSheet(parsedFile.workbook, sheetName, nextHeaderRowIndex);
        setInterview((s) => clearDownstreamAfterHeaderChange(s));
      } catch (err) {
        setError(err instanceof Error ? err.message : copy.errors.parseFailed);
      } finally {
        setBusy(false);
      }
    },
    [applyParsedSheet, copy.errors.parseFailed, parsedFile, sheetName]
  );

  // ---------------------------------------------------------------------
  // Derived data: grouping / mapping preview computed live from the interview
  // ---------------------------------------------------------------------

  const sampleRowsMatrix = useMemo(
    () => rows.slice(0, 8).map((row) => headers.map((_, index) => row.cells[index] ?? '')),
    [rows, headers]
  );

  const dataRowsMatrix = useMemo(
    () => rows.map((row) => headers.map((_, index) => row.cells[index] ?? '')),
    [rows, headers]
  );

  const dataRowsBySourceIndex = useMemo(() => {
    const map = new Map<number, readonly string[]>();
    for (const row of rows) {
      map.set(
        row.sourceRowIndex,
        headers.map((_, index) => row.cells[index] ?? '')
      );
    }
    return map;
  }, [rows, headers]);

  const payloadPreview = useMemo(
    () => buildImportPayloadFromInterview({ state: interview, headers, rows }),
    [interview, headers, rows]
  );

  const localGroups = useMemo(() => {
    if (payloadPreview.importMode !== 'master_hierarchy') return [];
    const built = buildImportParentGroups({
      mode: 'master_hierarchy',
      mappings: payloadPreview.mappings,
      rows: payloadPreview.rows,
    });
    return built.map((group) => {
      const groupRows = payloadPreview.rows.filter((row) =>
        group.sourceRowIndexes.includes(row.sourceRowIndex)
      );
      const conflicts =
        group.kind !== 'unassigned'
          ? detectParentFieldConflicts({ mappings: payloadPreview.mappings, rows: groupRows })
          : [];
      return {
        groupKey: group.groupKey,
        displayName: group.displayParentName,
        rowCount: group.sourceRowIndexes.length,
        sourceRowIndexes: group.sourceRowIndexes,
        conflicts,
      };
    });
  }, [payloadPreview]);

  const groupResolutionType = useCallback(
    (groupKey: string) => interview.groupResolutions[groupKey]?.type ?? 'create_new',
    [interview.groupResolutions]
  );

  const flattenedConflicts = useMemo(() => {
    const out: {
      readonly key: string;
      readonly groupKey: string;
      readonly groupDisplayName: string;
      readonly conflict: (typeof localGroups)[number]['conflicts'][number];
    }[] = [];
    for (const group of localGroups) {
      if (groupResolutionType(group.groupKey) !== 'create_new') continue;
      for (const conflict of group.conflicts) {
        out.push({
          key: `${group.groupKey}::${conflict.fieldKey}`,
          groupKey: group.groupKey,
          groupDisplayName: group.displayName,
          conflict,
        });
      }
    }
    return out;
  }, [localGroups, groupResolutionType]);

  const lockedIndexesSet = useMemo(() => collectLockedIndexes(interview), [interview]);
  const remainingIndexes = useMemo(
    () => headers.map((_, index) => index).filter((index) => !lockedIndexesSet.has(index)),
    [headers, lockedIndexesSet]
  );
  const lockedHeadersList = useMemo(
    () =>
      Array.from(lockedIndexesSet)
        .sort((a, b) => a - b)
        .map((index) => headers[index] ?? `Column ${index + 1}`),
    [lockedIndexesSet, headers]
  );

  const sampleValuesByIndex = useMemo(() => {
    const map = new Map<number, string[]>();
    for (let index = 0; index < headers.length; index += 1) {
      const samples: string[] = [];
      for (const row of rows) {
        if (samples.length >= 1) break;
        const value = String(row.cells[index] ?? '').trim();
        if (value && !samples.includes(value)) samples.push(value);
      }
      map.set(index, samples);
    }
    return map;
  }, [headers, rows]);

  // Keep remainingFields drafts in sync with which columns are currently locked.
  useEffect(() => {
    if (headers.length === 0) return;
    const rowsBySourceIndex = new Map(rows.map((row) => [row.sourceRowIndex, row.cells] as const));
    const placementGroups = localGroups.map((group) => ({
      sourceRowIndexes: group.sourceRowIndexes,
    }));
    setInterview((s) => {
      const locked = collectLockedIndexes(s);
      const effectiveMode = resolveEffectiveImportMode(s);
      const suggestions = suggestColumnMappings({ headers, mode: effectiveMode, existingCustomFields });
      const existingByIndex = new Map(s.remainingFields.map((field) => [field.sourceIndex, field]));
      const next: CrmImportRemainingFieldDraft[] = [];
      for (let index = 0; index < headers.length; index += 1) {
        if (locked.has(index)) continue;
        const existing = existingByIndex.get(index);
        if (existing != null) {
          next.push(existing);
          continue;
        }
        const placementOverride =
          effectiveMode === 'master_hierarchy' && placementGroups.length > 0
            ? suggestFieldPlacementFromGroupConsistency({
                groups: placementGroups,
                rowsBySourceIndex,
                columnIndex: index,
              })
            : undefined;
        next.push(draftFromSuggestion(index, suggestions[index], placementOverride));
      }
      if (fieldDraftsEqual(next, s.remainingFields)) return s;
      return { ...s, remainingFields: next };
    });
  }, [headers, lockedIndexesSet, existingCustomFields, rows, localGroups]);

  const sampleHierarchy = useMemo(() => {
    if (interview.structureChoice !== 'multiple_projects') return [];
    return localGroups.slice(0, 4).map((group) => ({
      parentLabel: group.displayName,
      childLabels: group.sourceRowIndexes
        .slice(0, 3)
        .map((sourceRowIndex) => {
          const row = payloadPreview.rows.find((r) => r.sourceRowIndex === sourceRowIndex);
          return row ? getSubprojectNameFromRow(row, payloadPreview.mappings) : '';
        })
        .filter(Boolean),
    }));
  }, [interview.structureChoice, localGroups, payloadPreview]);

  const groupsSummary = useMemo(() => {
    if (payloadPreview.importMode !== 'master_hierarchy' || localGroups.length === 0) return null;
    let created = 0;
    let attached = 0;
    let ignored = 0;
    for (const group of localGroups) {
      const type = groupResolutionType(group.groupKey);
      if (type === 'create_new') created += 1;
      else if (type === 'attach_existing') attached += 1;
      else ignored += 1;
    }
    return { created, attached, ignored };
  }, [payloadPreview.importMode, localGroups, groupResolutionType]);

  const fieldsMappedCount = useMemo(
    () => payloadPreview.mappings.filter((m) => m.destination.kind !== 'ignored').length,
    [payloadPreview]
  );

  const reviewColumnCounts = useMemo(
    () =>
      countMappedAndIgnoredColumns({
        headersLength: headers.length,
        remainingFields: interview.remainingFields,
        lockedColumnCount: lockedIndexesSet.size,
      }),
    [headers.length, interview.remainingFields, lockedIndexesSet.size]
  );

  const reviewKeyFields = useMemo(
    () =>
      buildKeyFieldChips({
        mappings: payloadPreview.mappings,
        standardFieldLabels: copy.standardFields as Record<string, string>,
        customFieldFallback: (label) => label,
      }),
    [payloadPreview.mappings, copy.standardFields]
  );

  const reviewIssues = useMemo(() => {
    const effectiveMode = resolveEffectiveImportMode(interview);
    return collectReviewClientIssues({
      mappings: payloadPreview.mappings,
      rows: payloadPreview.rows,
      importMode: payloadPreview.importMode,
      mappingErrors,
      fieldsReady: areFieldsReadyToContinue(interview.remainingFields),
      hasParent:
        effectiveMode === 'master_hierarchy' || interview.selectedParentProjectId != null,
      hasSubprojectIdentity: isCompositionConfigured(interview.subprojectComposition),
      missingNameMessage: copy.interview.review.missingNameRows,
    });
  }, [
    payloadPreview.mappings,
    payloadPreview.rows,
    payloadPreview.importMode,
    mappingErrors,
    interview,
    copy.interview.review.missingNameRows,
  ]);

  const reviewIssueCount = reviewIssueMetricCount(reviewIssues);
  const subprojectNameExample = useMemo(
    () => buildSubprojectIdentityPrimaryPreview(sampleRowsMatrix, interview.subprojectComposition),
    [sampleRowsMatrix, interview.subprojectComposition]
  );

  const currentGroupIndex = useMemo(() => {
    if (localGroups.length === 0) return 0;
    const idx = localGroups.findIndex((g) => g.groupKey === interview.activeGroupKey);
    return idx >= 0 ? idx : 0;
  }, [localGroups, interview.activeGroupKey]);
  const currentGroup = localGroups[currentGroupIndex] ?? null;
  const currentGroupDraft = currentGroup
    ? interview.groupResolutions[currentGroup.groupKey] ?? { type: 'create_new' as const }
    : null;
  const currentGroupValid =
    currentGroupDraft != null &&
    (currentGroupDraft.type !== 'attach_existing' || Boolean(currentGroupDraft.attachProjectId));
  const currentGroupRowNumbers = currentGroup
    ? currentGroup.sourceRowIndexes.map((i) => i + 1)
    : [];
  const suggestedIdsForCurrentGroup = useMemo(() => {
    if (currentGroup == null) return [];
    const norm = normalizeImportText(currentGroup.displayName);
    return parentCandidates.filter((c) => normalizeImportText(c.name) === norm).map((c) => c.id);
  }, [currentGroup, parentCandidates]);

  const currentConflictIndex = useMemo(() => {
    if (flattenedConflicts.length === 0) return 0;
    const idx = flattenedConflicts.findIndex((c) => c.key === interview.activeConflictFieldKey);
    return idx >= 0 ? idx : 0;
  }, [flattenedConflicts, interview.activeConflictFieldKey]);
  const currentConflictEntry = flattenedConflicts[currentConflictIndex] ?? null;
  const currentConflictResolution = currentConflictEntry
    ? interview.groupResolutions[currentConflictEntry.groupKey]?.conflictResolutions?.[
        currentConflictEntry.conflict.fieldKey
      ]
    : undefined;
  const currentConflictValid =
    currentConflictResolution != null && currentConflictResolution.value.trim() !== '';

  // ---------------------------------------------------------------------
  // Screen-entry effects
  // ---------------------------------------------------------------------

  const refreshParentCandidates = useCallback(async (): Promise<readonly CrmImportParentCandidate[]> => {
    const summaries = await listCrmProjectSummaries(crmRepositories, { rootsOnly: false });
    const next = filterEligibleImportParentProjects(summaries);
    setParentCandidates(next);
    return next;
  }, []);

  useEffect(() => {
    if (
      (interview.screen === 'choose_parent' || interview.screen === 'parent_resolve') &&
      parentCandidates.length === 0
    ) {
      void refreshParentCandidates();
    }
  }, [interview.screen, parentCandidates.length, refreshParentCandidates]);

  useEffect(() => {
    if (interview.screen !== 'parent_resolve' || localGroups.length === 0) return;
    const exists = localGroups.some((g) => g.groupKey === interview.activeGroupKey);
    if (!exists) {
      setInterview((s) => ({ ...s, activeGroupKey: localGroups[0]!.groupKey }));
    }
  }, [interview.screen, interview.activeGroupKey, localGroups]);

  useEffect(() => {
    if (interview.screen !== 'conflict') return;
    if (flattenedConflicts.length === 0) {
      setInterview((s) => goInterviewForward(s));
      return;
    }
    const exists = flattenedConflicts.some((c) => c.key === interview.activeConflictFieldKey);
    if (!exists) {
      setInterview((s) => ({ ...s, activeConflictFieldKey: flattenedConflicts[0]!.key }));
    }
  }, [interview.screen, interview.activeConflictFieldKey, flattenedConflicts]);

  // ---------------------------------------------------------------------
  // Import execution
  // ---------------------------------------------------------------------

  const buildResolutionPayload = useCallback(
    (
      group: CrmImportValidateGroup,
      mappings: readonly CrmImportColumnMapping[],
      rowsForGrouping: readonly CrmImportParsedRow[]
    ): CrmImportParentResolution => {
      const draft = interview.groupResolutions[group.groupKey] ?? { type: 'create_new' as const };
      if (draft.type === 'ignore') return { type: 'ignore' };
      if (draft.type === 'attach_existing' && draft.attachProjectId) {
        return { type: 'attach_existing', projectId: draft.attachProjectId };
      }

      const conflictResolutions = draft.conflictResolutions ?? {};
      const rebuilt = buildImportParentGroups({
        mode: 'master_hierarchy',
        mappings,
        rows: rowsForGrouping,
      }).find((entry) => entry.groupKey === group.groupKey);
      const scopedRows =
        rebuilt != null
          ? rowsForGrouping.filter((row) => rebuilt.sourceRowIndexes.includes(row.sourceRowIndex))
          : rowsForGrouping;

      const built = buildResolvedParentAttributesForGroup({
        displayParentName: group.displayName || copy.defaults.newParentName,
        mappings,
        rows: scopedRows,
        conflicts: group.conflicts,
        conflictResolutions,
      });

      return {
        type: 'create_new',
        parentAttributes: built.ok
          ? built.attributes
          : { name: group.displayName || copy.defaults.newParentName },
        conflictResolutions,
      };
    },
    [copy.defaults.newParentName, interview.groupResolutions]
  );

  const handleStartImport = useCallback(
    async (targetJobId: string) => {
      const claimToken = clientClaimToken || crypto.randomUUID();
      setClientClaimToken(claimToken);
      setBusy(true);
      setError(null);
      setImportDone(false);
      setCompletionToast(null);
      let settledStatus = 'running';
      try {
        const { promise } = startOrAttachImportChunkRunner({
          jobId: targetJobId,
          clientClaimToken: claimToken,
          totalRows: rows.length,
          listener: (progress) => {
            settledStatus = progress.status;
            setImportStatus(progress.status);
            setImportCounts(progress.counts);
            setCumulativeProcessed(progress.cumulativeProcessed);
            setLastChunkProcessed(progress.lastChunkProcessed);
            setPeakPercent(progress.peakPercent);
            setImportDone(progress.done);
          },
        });
        await promise;
        // Stay on the Import progress screen — no separate Results step.
        if (isImportExecutionSuccessful(settledStatus)) {
          setCompletionToast(
            settledStatus === 'partially_completed'
              ? copy.interview.importExecution.toastCompletedPartial
              : copy.interview.importExecution.toastCompleted
          );
        }
        onCompleted?.();
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          setImportStatus('cancelled');
          setError(copy.errors.importCancelled);
        } else {
          setError(
            err instanceof Error
              ? err.message
              : copy.errors.importFailed
          );
        }
      } finally {
        setBusy(false);
      }
    },
    [
      clientClaimToken,
      copy.errors.importCancelled,
      copy.errors.importFailed,
      copy.interview.importExecution.toastCompleted,
      copy.interview.importExecution.toastCompletedPartial,
      onCompleted,
      rows.length,
    ]
  );

  const handleCancelImport = useCallback(async () => {
    if (jobId == null) return;
    setCancellingImport(true);
    setError(null);
    try {
      await cancelImportChunkRunner(jobId);
      setImportStatus('cancelled');
      setError(copy.errors.importCancelled);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.importFailed);
    } finally {
      setCancellingImport(false);
      setCancelConfirmOpen(false);
      setBusy(false);
    }
  }, [copy.errors.importCancelled, copy.errors.importFailed, jobId]);

  const handleCancelImportClick = useCallback(() => {
    if (shouldConfirmCancelImport(importCounts)) {
      setCancelConfirmOpen(true);
      return;
    }
    void handleCancelImport();
  }, [handleCancelImport, importCounts]);

  const handleStartFromReview = useCallback(async () => {
    setBusy(true);
    setError(null);
    try {
      const payload = buildImportPayloadFromInterview({ state: interview, headers, rows });

      let currentJobId = jobId;
      if (currentJobId == null) {
        const nextIdempotencyKey = idempotencyKey || crypto.randomUUID();
        setIdempotencyKey(nextIdempotencyKey);
        const response = await createSpreadsheetImportDraftFromApi({
          importMode: payload.importMode,
          fixedParentProjectId: payload.fixedParentProjectId,
          fixedParentDisplayName: interview.selectedParentLabel ?? fixedParentDisplayName ?? null,
          sourceFilename: selectedFile?.name ?? 'import.csv',
          sheetName,
          headerRowIndex,
          idempotencyKey: nextIdempotencyKey,
          mappings: payload.mappings,
          rows: payload.rows,
        });
        currentJobId = response.jobId;
        setJobId(currentJobId);
      }

      const validation = await validateSpreadsheetImportJobFromApi(currentJobId);
      if (validation.mappingErrors.length > 0) {
        setMappingErrors([...validation.mappingErrors]);
        // Issues render in the Review reserved region — do not also set footer error.
        return;
      }
      setMappingErrors([]);

      if (payload.importMode === 'master_hierarchy') {
        const unresolved = validation.groups.filter((group) => {
          const draft = interview.groupResolutions[group.groupKey];
          if (draft == null) return true;
          if (draft.type === 'attach_existing') return !draft.attachProjectId;
          if (draft.type === 'create_new') {
            return !areParentConflictsResolved(group.conflicts, draft.conflictResolutions);
          }
          return false;
        });
        if (unresolved.length > 0) {
          setMappingErrors([copy.errors.resolutionRequired]);
          return;
        }

        const saved = await saveSpreadsheetImportResolutionsFromApi(currentJobId, {
          groups: validation.groups.map((group) => ({
            groupKey: group.groupKey,
            resolution: buildResolutionPayload(group, payload.mappings, payload.rows),
          })),
          excludedSourceRowIndexes: Array.from(excludedRowNumbers).map((n) => n - 1),
        });
        if (saved.blockingGroupKeys.length > 0) {
          setMappingErrors([copy.errors.resolutionRequired]);
          return;
        }
        await validateSpreadsheetImportJobFromApi(currentJobId);
      }

      setInterview((s) => ({
        ...goInterviewForward(s),
        structuralLocked: true,
      }));
      await handleStartImport(currentJobId);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.errors.draftFailed;
      setMappingErrors([message]);
    } finally {
      setBusy(false);
    }
  }, [
    buildResolutionPayload,
    copy.errors.draftFailed,
    copy.errors.resolutionRequired,
    excludedRowNumbers,
    fixedParentDisplayName,
    handleStartImport,
    headerRowIndex,
    headers,
    idempotencyKey,
    interview,
    jobId,
    rows,
    selectedFile?.name,
    sheetName,
  ]);

  const handleDownloadErrors = useCallback(async () => {
    if (jobId == null) return;
    setBusy(true);
    setError(null);
    try {
      const csv = await downloadSpreadsheetImportErrorCsvFromApi(jobId);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = `import-errors-${jobId}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setError(err instanceof Error ? err.message : copy.errors.downloadFailed);
    } finally {
      setBusy(false);
    }
  }, [copy.errors.downloadFailed, jobId]);

  // ---------------------------------------------------------------------
  // Navigation
  // ---------------------------------------------------------------------

  const isMidGroupStepper = interview.screen === 'parent_resolve' && currentGroupIndex > 0;
  const isMidConflictStepper = interview.screen === 'conflict' && currentConflictIndex > 0;
  const isLastGroup = currentGroupIndex >= localGroups.length - 1;
  const isLastConflict = currentConflictIndex >= flattenedConflicts.length - 1;

  const canContinue = useMemo(() => {
    switch (interview.screen) {
      case 'upload':
        return parsedFile != null && rows.length > 0 && canImport;
      case 'header':
        return rows.length > 0;
      case 'structure':
        return interview.structureChoice != null;
      case 'multi_project_organization':
        return isMultiProjectOrganizationSelectable(interview.multiProjectOrganization);
      case 'coming_soon_header_rows':
      case 'coming_soon_worksheet':
        return false;
      case 'recommend':
        return interview.structureChoice === 'one_project' || interview.structureChoice === 'multiple_projects';
      case 'choose_parent':
        return interview.selectedParentProjectId != null;
      case 'project_identity':
        return isCompositionConfigured(interview.projectComposition);
      case 'subproject_identity':
        return isCompositionConfigured(interview.subprojectComposition);
      case 'fields':
        return areFieldsReadyToContinue(
          interview.remainingFields,
          buildFieldsDestinationGroups({
            mode: resolveEffectiveImportMode(interview),
            existingCustomFields,
            labels: {
              standardFields: copy.standardFields as Record<string, string>,
              contactGroup: copy.interview.fields.groupContact,
              subprojectGroup: copy.interview.fields.groupSubproject,
              projectGroup: copy.interview.fields.groupProject,
              customGroup: copy.interview.fields.groupCustom,
              newCustomField: copy.destinations.newCustomFieldSubproject,
              chooseDestination: copy.interview.fields.chooseDestination,
            },
          })
        );
      case 'parent_resolve':
        return currentGroupValid;
      case 'conflict':
        return flattenedConflicts.length === 0 || currentConflictValid;
      case 'review':
        return reviewIssues.blockingCount === 0;
      default:
        return true;
    }
  }, [
    interview,
    existingCustomFields,
    parsedFile,
    rows.length,
    canImport,
    currentGroupValid,
    currentConflictValid,
    flattenedConflicts.length,
    reviewIssues.blockingCount,
    copy.standardFields,
    copy.interview.fields,
    copy.destinations.newCustomFieldSubproject,
  ]);

  const handleBack = useCallback(() => {
    setError(null);
    if (isMidGroupStepper) {
      setInterview((s) => ({ ...s, activeGroupKey: localGroups[currentGroupIndex - 1]!.groupKey }));
      return;
    }
    if (isMidConflictStepper) {
      setInterview((s) => ({
        ...s,
        activeConflictFieldKey: flattenedConflicts[currentConflictIndex - 1]!.key,
      }));
      return;
    }
    setInterview((s) => {
      const next = goInterviewBack(s);
      // The forward flow auto-skips an empty conflict screen; mirror that going back.
      if (next.screen === 'conflict' && flattenedConflicts.length === 0) {
        return goInterviewBack(next);
      }
      return next;
    });
  }, [isMidGroupStepper, isMidConflictStepper, localGroups, currentGroupIndex, flattenedConflicts, currentConflictIndex]);

  const handleContinue = useCallback(async () => {
    setError(null);
    if (!canContinue) return;

    if (interview.screen === 'parent_resolve') {
      if (!isLastGroup) {
        setInterview((s) => ({ ...s, activeGroupKey: localGroups[currentGroupIndex + 1]!.groupKey }));
        return;
      }
      setInterview((s) => goInterviewForward(s));
      return;
    }

    if (interview.screen === 'conflict') {
      if (!isLastConflict) {
        setInterview((s) => ({
          ...s,
          activeConflictFieldKey: flattenedConflicts[currentConflictIndex + 1]!.key,
        }));
        return;
      }
      setInterview((s) => goInterviewForward(s));
      return;
    }

    if (interview.screen === 'review') {
      await handleStartFromReview();
      return;
    }

    setInterview((s) => continueInterviewAfterEdit(s));
  }, [
    canContinue,
    interview.screen,
    isLastGroup,
    isLastConflict,
    localGroups,
    currentGroupIndex,
    flattenedConflicts,
    currentConflictIndex,
    handleStartFromReview,
  ]);

  const showBack =
    interview.screen !== 'import' &&
    interview.screen !== 'results' &&
    (interview.history.length > 0 || isMidGroupStepper || isMidConflictStepper);
  const importSettled =
    (interview.screen === 'import' || interview.screen === 'results') &&
    isImportExecutionSettled(importStatus);
  const importRunning =
    (interview.screen === 'import' || interview.screen === 'results') &&
    !importSettled &&
    (busy || isImportChunkRunnerActive(jobId));
  const backLabel = isMidGroupStepper || isMidConflictStepper ? nav.previous : nav.back;
  const continueLabel =
    interview.screen === 'review'
      ? copy.interview.review.startImport(rows.length)
      : (interview.screen === 'parent_resolve' && !isLastGroup) ||
          (interview.screen === 'conflict' && !isLastConflict)
        ? nav.next
        : nav.continue;

  // ---------------------------------------------------------------------
  // Progress pipeline
  // ---------------------------------------------------------------------

  const milestoneDefs = useMemo(
    () =>
      milestonesForInterview(interview).map((id) => ({
        id,
        label: copy.interview.progress[id],
      })),
    [interview, copy.interview.progress]
  );
  const currentMilestone = interviewScreenToMilestone(interview.screen);
  const completedMilestones = useMemo(() => {
    const set = new Set<CrmImportProgressMilestone>();
    for (const screen of interview.history) set.add(interviewScreenToMilestone(screen));
    return set;
  }, [interview.history]);

  // ---------------------------------------------------------------------
  // Contact first/last combine prompt
  // ---------------------------------------------------------------------

  const firstLastColumns = useMemo(
    () => (headers.length > 0 ? detectLikelyFirstLastNameColumns(headers) : null),
    [headers]
  );
  const showContactPrompt =
    interview.screen === 'fields' && firstLastColumns != null && interview.contactComposition == null;

  // ---------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------

  const jumpTo = useCallback((screen: CrmImportInterviewScreen) => {
    setError(null);
    setInterview((s) =>
      s.screen === 'review' ? jumpInterviewFromReview(s, screen) : jumpInterviewTo(s, screen)
    );
  }, []);

  let screenBody: ReactElement | null = null;
  switch (interview.screen) {
    case 'upload':
      screenBody = (
        <UploadScreen
          mode={mode}
          fixedParentDisplayName={fixedParentDisplayName}
          fixedParentContextLine={fixedParentContextLine}
          busy={busy}
          canImport={canImport}
          selectedFile={selectedFile}
          parsedFile={parsedFile}
          sheetName={sheetName}
          onFileChange={(file) => void handleFileChange(file)}
          onSheetChange={(next) => void handleSheetChange(next)}
        />
      );
      break;
    case 'header':
      screenBody = (
        <HeaderScreen
          busy={busy}
          sheetMatrix={sheetMatrix}
          headerRowIndex={headerRowIndex}
          detectedHeaderRowIndex={detectedHeaderRowIndex}
          truncated={truncated}
          onHeaderRowChange={(index) => void handleHeaderRowChange(index)}
        />
      );
      break;
    case 'structure':
      screenBody = (
        <StructureScreen
          value={interview.structureChoice}
          disabled={busy}
          onSelect={(choice: CrmImportStructureChoice) =>
            setInterview((s) => applyStructureChoice(s, choice))
          }
        />
      );
      break;
    case 'multi_project_organization':
      screenBody = (
        <MultiProjectOrganizationScreen
          value={interview.multiProjectOrganization}
          disabled={busy}
          onSelect={(choice: CrmImportMultiProjectOrganization) =>
            setInterview((s) => applyMultiProjectOrganization(s, choice))
          }
        />
      );
      break;
    case 'coming_soon_header_rows':
      screenBody = <ComingSoonImportScreen kind="header_rows" />;
      break;
    case 'coming_soon_worksheet':
      screenBody = <ComingSoonImportScreen kind="worksheet_per_project" />;
      break;
    case 'recommend': {
      const recommendations = recommendSpreadsheetStructures({
        headers,
        matrix: sheetMatrix,
        headerRowIndex,
      });
      screenBody = (
        <RecommendScreen
          recommendations={recommendations}
          selectedId={interview.recommendationId}
          manualSelected={interview.structureChoice != null && interview.recommendationId == null}
          disabled={busy}
          onSelectRecommendation={(recommendation) =>
            setInterview((s) => applyRecommendation(s, recommendation))
          }
          onSelectManual={() =>
            setInterview((s) =>
              applyMultiProjectOrganization(applyStructureChoice(s, 'multiple_projects'), 'repeating_column')
            )
          }
        />
      );
      break;
    }
    case 'choose_parent':
      screenBody = (
        <ChooseParentScreen
          candidates={parentCandidates}
          selectedId={interview.selectedParentProjectId}
          selectedLabel={interview.selectedParentLabel}
          disabled={busy}
          onSelect={(candidate) =>
            setInterview((s) => ({
              ...s,
              selectedParentProjectId: candidate.id,
              selectedParentLabel: candidate.name,
            }))
          }
          onClear={() =>
            setInterview((s) => ({ ...s, selectedParentProjectId: null, selectedParentLabel: null }))
          }
          onRefreshCandidates={refreshParentCandidates}
        />
      );
      break;
    case 'project_identity':
      screenBody = (
        <ProjectIdentityScreen
          headers={headers}
          sampleRows={sampleRowsMatrix}
          dataRows={dataRowsMatrix}
          dataRowsBySourceIndex={dataRowsBySourceIndex}
          composition={interview.projectComposition}
          groups={localGroups}
          disabled={busy}
          onChange={(composition) =>
            setInterview((s) =>
              clearDownstreamAfterProjectIdentityChange({ ...s, projectComposition: composition })
            )
          }
          onChooseOneProject={() =>
            setInterview((s) => {
              const next = applyStructureChoice(s, 'one_project');
              return {
                ...next,
                screen: 'choose_parent',
                history: s.history.filter(
                  (screen) =>
                    screen !== 'project_identity' &&
                    screen !== 'subproject_identity' &&
                    screen !== 'multi_project_organization' &&
                    screen !== 'coming_soon_header_rows' &&
                    screen !== 'coming_soon_worksheet' &&
                    screen !== 'choose_parent'
                ),
              };
            })
          }
        />
      );
      break;
    case 'subproject_identity':
      screenBody = (
        <SubprojectIdentityScreen
          headers={headers}
          sampleRows={sampleRowsMatrix}
          dataRows={dataRowsMatrix}
          composition={interview.subprojectComposition}
          disabledIndexes={new Set(interview.projectComposition?.columnIndexes ?? [])}
          disabled={busy}
          showSampleHierarchy={interview.structureChoice === 'multiple_projects'}
          sampleHierarchy={sampleHierarchy}
          onChange={(composition) => setInterview((s) => ({ ...s, subprojectComposition: composition }))}
        />
      );
      break;
    case 'fields': {
      const contactSample =
        firstLastColumns != null
          ? [sampleRowsMatrix[0]?.[firstLastColumns.firstIndex], sampleRowsMatrix[0]?.[firstLastColumns.lastIndex]]
              .map((part) => String(part ?? '').trim())
              .filter(Boolean)
              .join(' ')
          : '';
      const suggestedFields = (() => {
        const effectiveMode = resolveEffectiveImportMode(interview);
        const suggestions = suggestColumnMappings({
          headers,
          mode: effectiveMode,
          existingCustomFields,
        });
        const locked = collectLockedIndexes(interview);
        const next: CrmImportRemainingFieldDraft[] = [];
        for (let index = 0; index < headers.length; index += 1) {
          if (locked.has(index)) continue;
          next.push(draftFromSuggestion(index, suggestions[index]));
        }
        return next;
      })();
      screenBody = (
        <FieldsScreen
          effectiveMode={resolveEffectiveImportMode(interview)}
          headers={headers}
          remainingIndexes={remainingIndexes}
          fields={interview.remainingFields}
          lockedHeaders={lockedHeadersList}
          sampleValuesByIndex={sampleValuesByIndex}
          existingCustomFields={existingCustomFields}
          disabled={busy}
          contactPrompt={
            showContactPrompt && firstLastColumns != null
              ? {
                  firstHeader: headers[firstLastColumns.firstIndex] ?? 'First Name',
                  lastHeader: headers[firstLastColumns.lastIndex] ?? 'Last Name',
                  sampleName: contactSample || 'Antoinette Reese',
                }
              : null
          }
          onCombineContact={() => {
            if (firstLastColumns == null) return;
            setInterview((s) => ({
              ...s,
              contactComposition: {
                columnIndexes: [firstLastColumns.firstIndex, firstLastColumns.lastIndex],
                separator: ' ',
              },
            }));
          }}
          onKeepContactSeparate={() =>
            setInterview((s) => ({
              ...s,
              contactComposition: { columnIndexes: [], separator: ' ' },
            }))
          }
          suggestedFields={suggestedFields}
          onReplaceFields={(next) => setInterview((s) => ({ ...s, remainingFields: next }))}
          onFieldChange={(sourceIndex, next) =>
            setInterview((s) => ({
              ...s,
              remainingFields: s.remainingFields.map((field) =>
                field.sourceIndex === sourceIndex ? { ...field, ...next } : field
              ),
            }))
          }
        />
      );
      break;
    }
    case 'hierarchy_preview':
      screenBody = <HierarchyPreviewScreen groups={localGroups} />;
      break;
    case 'parent_resolve':
      screenBody = currentGroup ? (
        <ParentResolveScreen
          groupDisplayName={currentGroup.displayName}
          groupRowCount={currentGroup.rowCount}
          index={currentGroupIndex}
          total={localGroups.length}
          resolutionType={currentGroupDraft?.type ?? 'create_new'}
          attachProjectId={currentGroupDraft?.attachProjectId ?? null}
          attachLabel={currentGroupDraft?.attachLabel ?? null}
          parentCandidates={parentCandidates}
          suggestedIds={suggestedIdsForCurrentGroup}
          rowNumbersInGroup={currentGroupRowNumbers}
          excludedRowNumbers={excludedRowNumbers}
          onToggleExcludeRow={(rowNumber) =>
            setExcludedRowNumbers((current) => {
              const next = new Set(current);
              if (next.has(rowNumber)) next.delete(rowNumber);
              else next.add(rowNumber);
              return next;
            })
          }
          disabled={busy}
          onChangeType={(type) =>
            setInterview((s) => ({
              ...s,
              groupResolutions: {
                ...s.groupResolutions,
                [currentGroup.groupKey]: {
                  type,
                  attachProjectId:
                    type === 'attach_existing'
                      ? s.groupResolutions[currentGroup.groupKey]?.attachProjectId
                      : undefined,
                  attachLabel:
                    type === 'attach_existing'
                      ? s.groupResolutions[currentGroup.groupKey]?.attachLabel
                      : undefined,
                  conflictResolutions:
                    type === 'create_new'
                      ? s.groupResolutions[currentGroup.groupKey]?.conflictResolutions ?? {}
                      : {},
                },
              },
            }))
          }
          onSelectAttach={(candidate) =>
            setInterview((s) => ({
              ...s,
              groupResolutions: {
                ...s.groupResolutions,
                [currentGroup.groupKey]: {
                  type: 'attach_existing',
                  attachProjectId: candidate.id,
                  attachLabel: candidate.name,
                  conflictResolutions: {},
                },
              },
            }))
          }
          onClearAttach={() =>
            setInterview((s) => ({
              ...s,
              groupResolutions: {
                ...s.groupResolutions,
                [currentGroup.groupKey]: { type: 'attach_existing', conflictResolutions: {} },
              },
            }))
          }
          onCreateAllUnmatched={() =>
            setInterview((s) => {
              const next = { ...s.groupResolutions };
              for (const group of localGroups) {
                const existing = next[group.groupKey];
                if (existing?.type === 'attach_existing' && existing.attachProjectId) continue;
                next[group.groupKey] = {
                  type: 'create_new',
                  conflictResolutions: existing?.conflictResolutions ?? {},
                };
              }
              return { ...s, groupResolutions: next };
            })
          }
          onIgnoreAllUnresolved={() =>
            setInterview((s) => {
              const next = { ...s.groupResolutions };
              for (const group of localGroups) {
                const existing = next[group.groupKey];
                if (existing?.type === 'attach_existing' && existing.attachProjectId) continue;
                if (existing?.type === 'create_new') continue;
                next[group.groupKey] = { type: 'ignore', conflictResolutions: {} };
              }
              return { ...s, groupResolutions: next };
            })
          }
        />
      ) : null;
      break;
    case 'conflict':
      screenBody = currentConflictEntry ? (
        <ConflictScreen
          groupDisplayName={currentConflictEntry.groupDisplayName}
          fieldLabel={
            (copy.standardFields as Record<string, string>)[currentConflictEntry.conflict.fieldKey] ??
            currentConflictEntry.conflict.fieldKey
          }
          conflict={currentConflictEntry.conflict}
          index={currentConflictIndex}
          total={flattenedConflicts.length}
          resolution={currentConflictResolution}
          disabled={busy}
          onChooseExisting={(value) =>
            setInterview((s) => ({
              ...s,
              groupResolutions: {
                ...s.groupResolutions,
                [currentConflictEntry.groupKey]: {
                  type: 'create_new',
                  conflictResolutions: {
                    ...(s.groupResolutions[currentConflictEntry.groupKey]?.conflictResolutions ?? {}),
                    [currentConflictEntry.conflict.fieldKey]: { kind: 'choose_existing', value },
                  },
                },
              },
            }))
          }
          onEnterReplacement={(value) =>
            setInterview((s) => ({
              ...s,
              groupResolutions: {
                ...s.groupResolutions,
                [currentConflictEntry.groupKey]: {
                  type: 'create_new',
                  conflictResolutions: {
                    ...(s.groupResolutions[currentConflictEntry.groupKey]?.conflictResolutions ?? {}),
                    [currentConflictEntry.conflict.fieldKey]: { kind: 'replacement', value },
                  },
                },
              },
            }))
          }
        />
      ) : null;
      break;
    case 'review':
      screenBody = (
        <ReviewScreen
          launchMode={mode}
          effectiveMode={resolveEffectiveImportMode(interview)}
          fileName={selectedFile?.name ?? null}
          sheetName={sheetName}
          headerRowNumber={headerRowIndex + 1}
          structureChoice={interview.structureChoice}
          parentLabel={interview.selectedParentLabel}
          headers={headers}
          projectComposition={interview.projectComposition}
          subprojectComposition={interview.subprojectComposition}
          subprojectNameExample={subprojectNameExample}
          rowsCount={rows.length}
          fieldsMappedCount={fieldsMappedCount}
          ignoredColumnsCount={reviewColumnCounts.ignoredCount}
          mappedColumnsCount={reviewColumnCounts.mappedCount}
          keyFieldLabels={reviewKeyFields.visible}
          keyFieldsRemainingCount={reviewKeyFields.remainingCount}
          issueCount={reviewIssueCount}
          blockingIssueCount={reviewIssues.blockingCount}
          warningIssueCount={reviewIssues.warningCount}
          issueMessages={reviewIssues.messages}
          issueSections={reviewIssues.sectionsWithIssues}
          groupsSummary={groupsSummary}
          disabled={busy}
          onEdit={jumpTo}
        />
      );
      break;
    case 'import':
    case 'results':
      // Completion stays on the Import progress screen (no separate Results step).
      screenBody = (
        <ImportScreen
          importStatus={importStatus}
          importCounts={importCounts}
          totalRows={rows.length}
          cumulativeProcessed={cumulativeProcessed}
          lastChunkProcessed={lastChunkProcessed}
          peakPercent={peakPercent}
          done={importDone || importSettled}
          errorMessage={
            importStatus === 'failed' || importStatus === 'cancelled' ? error : null
          }
        />
      );
      break;
    default:
      screenBody = null;
  }

  const wizardBody = (
    <div className={styles.wizardBody}>
      {completionToast ? (
        <div className={styles.importCompletionToast} role="status" aria-live="polite">
          <span className={styles.importCompletionToastIcon} aria-hidden>
            ✓
          </span>
          <p className={styles.importCompletionToastMessage}>{completionToast}</p>
          <button
            type="button"
            className={styles.importCompletionToastDismiss}
            aria-label="Dismiss"
            onClick={() => setCompletionToast(null)}
          >
            ×
          </button>
        </div>
      ) : null}
      <InterviewProgressPipeline
        milestones={milestoneDefs}
        current={currentMilestone}
        completed={completedMilestones}
      />
      <div
        className={[
          styles.scroll,
          interview.screen === 'upload' ||
          interview.screen === 'header' ||
          interview.screen === 'structure' ||
          interview.screen === 'multi_project_organization' ||
          interview.screen === 'coming_soon_header_rows' ||
          interview.screen === 'coming_soon_worksheet' ||
          interview.screen === 'project_identity' ||
          interview.screen === 'choose_parent' ||
          interview.screen === 'subproject_identity' ||
          interview.screen === 'fields' ||
          interview.screen === 'review' ||
          interview.screen === 'import' ||
          interview.screen === 'results'
            ? styles.scrollFit
            : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {!canImport ? <p className={styles.notice}>{copy.unavailable}</p> : null}

        {screenBody}

        {error && interview.screen !== 'review' && interview.screen !== 'import' ? (
          <p className={styles.error}>{error}</p>
        ) : null}
      </div>

      <div className={styles.footer}>
        {showBack ? (
          <button type="button" className={styles.backButton} disabled={busy} onClick={handleBack}>
            {backLabel}
          </button>
        ) : (
          <span />
        )}
        <div className={styles.footerActions}>
          {interview.screen === 'import' || interview.screen === 'results' ? (
            <>
              {importRunning ? (
                <button
                  type="button"
                  className={styles.cancelButton}
                  disabled={cancellingImport}
                  onClick={handleCancelImportClick}
                >
                  {cancellingImport ? copy.actions.working : copy.actions.cancelImport}
                </button>
              ) : null}
              {importSettled &&
              (failedRowsDisplayCount(importCounts) > 0 ||
                importStatus === 'partially_completed') ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy}
                  onClick={() => void handleDownloadErrors()}
                >
                  {copy.actions.downloadErrors}
                </button>
              ) : null}
              {importSettled &&
              importStatus === 'partially_completed' &&
              jobId != null ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={busy || isImportChunkRunnerActive(jobId)}
                  onClick={() => void handleStartImport(jobId)}
                >
                  {copy.actions.resumeImport}
                </button>
              ) : null}
              <button
                type="button"
                className={styles.primaryButton}
                disabled={cancellingImport}
                onClick={handleClose}
              >
                {importSettled ? copy.actions.finish : copy.actions.close}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className={styles.cancelButton}
                disabled={busy}
                onClick={handleClose}
              >
                {copy.actions.cancel}
              </button>
              <button
                type="button"
                className={styles.primaryButton}
                disabled={busy || !canContinue}
                onClick={() => void handleContinue()}
              >
                {busy ? nav.working : continueLabel}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  if (!open) {
    return <></>;
  }

  return (
    <>
      <SpreadsheetImportModal
        open={open}
        title={getSpreadsheetImportWizardTitle(mode)}
        titleId={titleId}
        closeAriaLabel={copy.closeAriaLabel}
        closeDisabled={cancellingImport}
        onClose={handleClose}
      >
        {wizardBody}
      </SpreadsheetImportModal>
      <ConfirmModal
        isOpen={cancelConfirmOpen}
        onClose={() => setCancelConfirmOpen(false)}
        onConfirm={() => void handleCancelImport()}
        title={copy.interview.importExecution.cancelConfirmTitle}
        message={copy.interview.importExecution.cancelConfirmBody}
        confirmLabel={copy.actions.cancelImport}
        cancelLabel={copy.actions.keepImporting}
        variant="danger"
        hideIcon
      />
    </>
  );
}

export { styles as spreadsheetImportToolbarStyles };
