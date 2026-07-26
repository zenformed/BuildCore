'use client';

import { useMemo, type ReactElement } from 'react';
import { LuArrowRight, LuBuilding2, LuCircleCheck, LuLightbulb, LuSkipForward } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  toUserFacingSpreadsheetRowNumber,
  type WorksheetProjectConfig,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  includedWorksheetConfigs,
  summarizeWorksheetResolveSelection,
  type WorksheetResolutionDraft,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type WorksheetResolveSummaryScreenProps = {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly disabled?: boolean;
  readonly onReviewWorksheet: (worksheetId: string) => void;
};

function resolveProjectLabel(
  config: WorksheetProjectConfig,
  resolution: WorksheetResolutionDraft | undefined
): string {
  if (resolution?.kind === 'attach_existing') {
    return resolution.existingProjectLabel?.trim() || '—';
  }
  return config.projectName.trim() || config.worksheetName;
}

/**
 * Confirmation screen after worksheet Project assignment — scan, review, continue.
 */
export function WorksheetResolveSummaryScreen({
  configs,
  resolutions,
  disabled = false,
  onReviewWorksheet,
}: WorksheetResolveSummaryScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.worksheetResolve;
  const included = useMemo(() => includedWorksheetConfigs(configs), [configs]);
  const summary = useMemo(
    () => summarizeWorksheetResolveSelection({ configs, resolutions }),
    [configs, resolutions]
  );
  const allSkipped = summary.importingCount === 0 && included.length > 0;

  return (
    <div className={styles.worksheetResolveSummaryScreen}>
      <header className={styles.worksheetResolveSummaryIntro}>
        <h2 className={styles.worksheetResolveSummaryHeading}>{copy.summaryHeading}</h2>
        <p className={styles.worksheetResolveSummarySupporting}>{copy.summarySupporting}</p>
      </header>

      {allSkipped ? (
        <p className={styles.worksheetResolveValidation} role="status">
          {copy.allSkippedWarning}
        </p>
      ) : null}

      <ul className={styles.worksheetResolveSummaryList}>
        {included.map((config) => {
          const resolution = resolutions[config.worksheetId];
          const skipped = resolution?.kind === 'skip';
          const projectLabel = resolveProjectLabel(config, resolution);
          const headerRow = toUserFacingSpreadsheetRowNumber(config.headerRowIndex);

          return (
            <li key={config.worksheetId} className={styles.worksheetResolveSummaryRow}>
              <div className={styles.worksheetResolveSummaryRowBody}>
                <div className={styles.worksheetResolveSummaryTitle}>
                  <span
                    className={
                      skipped
                        ? styles.worksheetResolveSummaryIconSkipped
                        : styles.worksheetResolveSummaryIcon
                    }
                    aria-hidden
                  >
                    {skipped ? <LuSkipForward size={18} /> : <LuCircleCheck size={18} />}
                  </span>
                  <strong title={config.worksheetName}>
                    {copy.summaryWorksheetTitle(config.worksheetName)}
                  </strong>
                </div>

                {skipped ? (
                  <p className={styles.worksheetResolveSummaryAction}>{copy.summarySkippedDetail}</p>
                ) : (
                  <p className={styles.worksheetResolveSummaryAction}>
                    <span>{copy.summaryWillAdd(config.dataRowCount)}</span>
                    <span className={styles.worksheetResolveSummaryProject}>
                      <LuBuilding2 size={16} aria-hidden />
                      <span>{projectLabel}</span>
                    </span>
                  </p>
                )}

                <p className={styles.worksheetResolveSummaryMeta}>
                  {copy.summaryMeta(config.dataRowCount, headerRow, config.columnCount)}
                </p>
              </div>

              <button
                type="button"
                className={styles.worksheetResolveSummaryReview}
                disabled={disabled}
                aria-label={copy.summaryReviewAria(config.worksheetName)}
                onClick={() => onReviewWorksheet(config.worksheetId)}
              >
                {copy.summaryReview}
                <LuArrowRight size={16} aria-hidden />
              </button>
            </li>
          );
        })}
      </ul>

      <p className={styles.worksheetResolveSummaryTotals}>
        <LuLightbulb className={styles.worksheetResolveSummaryTotalsIcon} size={16} aria-hidden />
        <span>{copy.summaryTotals(summary.totalRows, summary.projectCount)}</span>
      </p>
    </div>
  );
}
