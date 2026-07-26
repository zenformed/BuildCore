'use client';

import { useEffect, useId, useMemo, useState, type ReactElement } from 'react';
import {
  LuCheck,
  LuCircleAlert,
  LuCircleCheck,
  LuColumns3,
  LuFileSpreadsheet,
  LuX,
} from 'react-icons/lu';
import { detectSpreadsheetHeaderRowIndex } from '@/domain/crm/spreadsheetImportHeaderDetection';
import { SPREADSHEET_IMPORT_LIMITS } from '@/domain/crm/spreadsheetImportLimits';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { HeaderScreen } from '@/presentation/features/crmImport/interview/screens/HeaderScreen';
import {
  buildWorksheetProjectRowViews,
  updateWorksheetProjectHeaderRow,
  type WorksheetProjectConfig,
  type WorksheetProjectStatusKind,
  type WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  includedWorksheetConfigs,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type WorksheetHeadersScreenProps = {
  readonly sheets: readonly WorksheetSheetInput[];
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly activeWorksheetId: string | null;
  readonly disabled?: boolean;
  readonly onChangeConfigs: (configs: readonly WorksheetProjectConfig[]) => void;
  readonly onSelectWorksheet: (worksheetId: string) => void;
};

function importingConfigs(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
): readonly WorksheetProjectConfig[] {
  return includedWorksheetConfigs(configs).filter(
    (config) => resolutions[config.worksheetId]?.kind !== 'skip'
  );
}

function StatusBadge(input: {
  readonly status: WorksheetProjectStatusKind;
  readonly copy: (typeof content.crm.spreadsheetImport.interview)['worksheetProjects'];
}): ReactElement {
  const { status, copy } = input;
  if (status === 'ready') {
    return (
      <span
        className={styles.worksheetProjectsStatusReady}
        title={copy.statusReady}
        aria-label={copy.statusReady}
      >
        <LuCircleCheck size={16} aria-hidden />
      </span>
    );
  }
  if (status === 'skipped') {
    return (
      <span className={styles.worksheetProjectsStatusSkipped}>
        <LuX size={14} aria-hidden />
        {copy.statusSkipped}
      </span>
    );
  }
  if (status === 'no_data') {
    return (
      <span className={styles.worksheetProjectsStatusWarn}>
        <LuCircleAlert size={14} aria-hidden />
        {copy.statusNoData}
      </span>
    );
  }
  if (status === 'needs_header') {
    return (
      <span className={styles.worksheetProjectsStatusWarn}>
        <LuCircleAlert size={14} aria-hidden />
        {copy.statusNeedsHeader}
      </span>
    );
  }
  return (
    <span
      className={styles.worksheetProjectsStatusWarn}
      title={copy.statusNeedsReview}
      aria-label={copy.statusNeedsReview}
    >
      <LuCircleAlert size={16} aria-hidden />
    </span>
  );
}

export function canContinueWorksheetHeaders(
  configs: readonly WorksheetProjectConfig[],
  resolutions: Readonly<Record<string, WorksheetResolutionDraft>>,
  sheetsById: ReadonlyMap<string, WorksheetSheetInput>
): boolean {
  const active = importingConfigs(configs, resolutions);
  if (active.length === 0) return false;
  return active.every((config) => {
    const sheet = sheetsById.get(config.worksheetId);
    if (sheet == null || sheet.matrix.length === 0) return false;
    return (
      config.headerRowIndex >= 0 &&
      config.headerRowIndex < sheet.matrix.length &&
      config.columnCount > 0
    );
  });
}

/** Per-worksheet header confirmation after sheet/Project assignment. */
export function WorksheetHeadersScreen({
  sheets,
  configs,
  resolutions,
  activeWorksheetId,
  disabled = false,
  onChangeConfigs,
  onSelectWorksheet,
}: WorksheetHeadersScreenProps): ReactElement {
  const listCopy = content.crm.spreadsheetImport.interview.worksheetProjects;
  const headerCopy = content.crm.spreadsheetImport.interview.header;
  const rootId = useId();
  const sheetsById = useMemo(
    () => new Map(sheets.map((sheet) => [sheet.worksheetId, sheet])),
    [sheets]
  );
  const activeConfigs = useMemo(
    () => importingConfigs(configs, resolutions),
    [configs, resolutions]
  );

  const rowViews = useMemo(() => {
    const views = buildWorksheetProjectRowViews({
      configs: activeConfigs,
      resolutions,
      sheetsById,
    });
    return views;
  }, [activeConfigs, resolutions, sheetsById]);

  const resolvedActiveId = useMemo(() => {
    if (
      activeWorksheetId != null &&
      activeConfigs.some((config) => config.worksheetId === activeWorksheetId)
    ) {
      return activeWorksheetId;
    }
    return activeConfigs[0]?.worksheetId ?? null;
  }, [activeConfigs, activeWorksheetId]);

  const activeConfig =
    activeConfigs.find((config) => config.worksheetId === resolvedActiveId) ?? null;
  const activeSheet =
    activeConfig != null ? sheetsById.get(activeConfig.worksheetId) ?? null : null;

  const [detectedBySheet, setDetectedBySheet] = useState<Readonly<Record<string, number>>>(
    {}
  );

  useEffect(() => {
    setDetectedBySheet((prev) => {
      const next: Record<string, number> = { ...prev };
      let changed = false;
      for (const config of activeConfigs) {
        if (next[config.worksheetId] != null) continue;
        const sheet = sheetsById.get(config.worksheetId);
        if (sheet == null) continue;
        next[config.worksheetId] = detectSpreadsheetHeaderRowIndex(sheet.matrix);
        changed = true;
      }
      return changed ? next : prev;
    });
  }, [activeConfigs, sheetsById]);

  useEffect(() => {
    if (resolvedActiveId == null) return;
    if (activeWorksheetId === resolvedActiveId) return;
    onSelectWorksheet(resolvedActiveId);
  }, [activeWorksheetId, onSelectWorksheet, resolvedActiveId]);

  const detectedHeaderRowIndex =
    activeConfig != null
      ? (detectedBySheet[activeConfig.worksheetId] ?? activeConfig.headerRowIndex)
      : 0;

  const truncated =
    activeSheet != null &&
    activeSheet.matrix.length > SPREADSHEET_IMPORT_LIMITS.maxRows + 1;

  return (
    <div className={styles.worksheetHeadersScreen}>
      <header className={styles.worksheetHeadersIntro}>
        <h2 id={`${rootId}-heading`} className={styles.worksheetHeadersHeading}>
          <LuColumns3 className={styles.worksheetHeadersHeadingIcon} aria-hidden size={22} />
          <span>{headerCopy.heading}</span>
        </h2>
        <p className={styles.worksheetHeadersHint}>{headerCopy.hint}</p>
      </header>

      <aside className={styles.worksheetProjectsSidebar} aria-label={listCopy.listAria}>
        <h3 className={styles.worksheetProjectsListHeading}>
          {listCopy.listHeading(activeConfigs.length, activeConfigs.length)}
        </h3>
        <div className={styles.worksheetProjectsList}>
          {rowViews.map((row) => {
            const current = row.config.worksheetId === resolvedActiveId;
            return (
              <div
                key={row.config.worksheetId}
                className={[
                  styles.worksheetProjectsListItem,
                  current ? styles.worksheetProjectsListItemCurrent : '',
                  row.muted ? styles.worksheetProjectsListItemMuted : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
              >
                <label
                  className={styles.worksheetProjectsCheckboxLabel}
                  onClick={(event) => event.stopPropagation()}
                >
                  <input
                    type="checkbox"
                    className={styles.worksheetProjectsCheckbox}
                    checked={row.config.included}
                    disabled
                    readOnly
                    aria-label={listCopy.importWorksheetAria(row.config.worksheetName)}
                  />
                  <span className={styles.worksheetProjectsCheckboxFace} aria-hidden>
                    {row.config.included ? <LuCheck size={12} strokeWidth={3} /> : null}
                  </span>
                </label>
                <button
                  type="button"
                  className={styles.worksheetProjectsListItemMain}
                  disabled={disabled}
                  aria-current={current ? 'true' : undefined}
                  aria-label={
                    current
                      ? listCopy.currentWorksheetAria(row.config.worksheetName)
                      : listCopy.selectWorksheetAria(row.config.worksheetName)
                  }
                  onClick={() => onSelectWorksheet(row.config.worksheetId)}
                >
                  <LuFileSpreadsheet
                    className={styles.worksheetProjectsSheetIcon}
                    size={18}
                    aria-hidden
                  />
                  <span className={styles.worksheetProjectsListItemCopy}>
                    <span
                      className={styles.worksheetProjectsSheetName}
                      title={row.config.worksheetName}
                    >
                      {row.config.worksheetName}
                    </span>
                    <span className={styles.worksheetProjectsListItemMeta}>
                      {listCopy.sheetMeta(row.config.dataRowCount, row.config.columnCount)}
                    </span>
                  </span>
                  <StatusBadge status={row.status} copy={listCopy} />
                </button>
              </div>
            );
          })}
        </div>
      </aside>

      <section
        className={styles.worksheetHeadersDetail}
        aria-labelledby={`${rootId}-heading`}
      >
        {activeConfig != null && activeSheet != null ? (
          <HeaderScreen
            busy={disabled}
            sheetMatrix={activeSheet.matrix}
            headerRowIndex={activeConfig.headerRowIndex}
            detectedHeaderRowIndex={detectedHeaderRowIndex}
            truncated={truncated}
            showIntro={false}
            onHeaderRowChange={(index) =>
              onChangeConfigs(
                updateWorksheetProjectHeaderRow(
                  configs,
                  activeConfig.worksheetId,
                  index,
                  activeSheet.matrix
                )
              )
            }
          />
        ) : (
          <p className={styles.notice}>Select a worksheet to confirm its header row.</p>
        )}
      </section>
    </div>
  );
}
