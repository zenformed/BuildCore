'use client';

import type { ReactElement } from 'react';
import {
  LuBuilding2,
  LuCheck,
  LuCircleAlert,
  LuDatabase,
  LuFileSpreadsheet,
  LuInfo,
  LuMail,
  LuSparkles,
  LuTable2,
  LuTriangleAlert,
  LuUsers,
} from 'react-icons/lu';
import type { CrmImportJobCounts } from '@/domain/crm/spreadsheetImportTypes';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildImportProgressStatusLine,
  computeImportProgressPercent,
  failedRowsDisplayCount,
  importTimelineStatusLabel,
  resolveImportExecutionPhase,
  resolveImportTimeline,
  type ImportTimelineStageId,
  type ImportTimelineStageStatus,
} from '@/presentation/features/crmImport/interview/importPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type ImportScreenProps = {
  readonly importStatus: string;
  readonly importCounts: CrmImportJobCounts;
  readonly totalRows: number;
  readonly cumulativeProcessed: number;
  readonly lastChunkProcessed: number;
  readonly peakPercent: number;
  readonly done?: boolean;
  readonly errorMessage?: string | null;
};

function headingForPhase(
  phase: ReturnType<typeof resolveImportExecutionPhase>,
  copy: (typeof content.crm.spreadsheetImport.interview)['importExecution']
): string {
  switch (phase) {
    case 'paused':
      return copy.headingPaused;
    case 'failed':
      return copy.headingFailed;
    case 'cancelled':
      return copy.headingCancelled;
    case 'completed':
      return copy.headingCompleted;
    default:
      return copy.headingRunning;
  }
}

function bodyForPhase(
  phase: ReturnType<typeof resolveImportExecutionPhase>,
  copy: (typeof content.crm.spreadsheetImport.interview)['importExecution']
): string {
  switch (phase) {
    case 'paused':
      return copy.bodyPaused;
    case 'failed':
      return copy.bodyFailed;
    case 'cancelled':
      return copy.bodyCancelled;
    case 'completed':
      return copy.bodyCompleted;
    default:
      return copy.bodyRunning;
  }
}

function TimelineIcon({
  id,
  status,
}: {
  readonly id: ImportTimelineStageId;
  readonly status: ImportTimelineStageStatus;
}): ReactElement {
  const size = 18;
  const muted = status === 'pending';
  switch (id) {
    case 'reading':
      return <LuFileSpreadsheet size={size} aria-hidden className={muted ? styles.importTimelineIconMuted : undefined} />;
    case 'validating':
      return <LuTable2 size={size} aria-hidden className={muted ? styles.importTimelineIconMuted : undefined} />;
    case 'creating':
      return <LuDatabase size={size} aria-hidden className={muted ? styles.importTimelineIconMuted : undefined} />;
    case 'finalizing':
      return <LuUsers size={size} aria-hidden className={muted ? styles.importTimelineIconMuted : undefined} />;
    case 'preparing':
      return <LuMail size={size} aria-hidden className={muted ? styles.importTimelineIconMuted : undefined} />;
    default:
      return <LuSparkles size={size} aria-hidden />;
  }
}

function stageLabel(
  id: ImportTimelineStageId,
  copy: (typeof content.crm.spreadsheetImport.interview)['importExecution']
): string {
  switch (id) {
    case 'reading':
      return copy.stageReading;
    case 'validating':
      return copy.stageValidating;
    case 'creating':
      return copy.stageCreating;
    case 'finalizing':
      return copy.stageFinalizing;
    case 'preparing':
      return copy.stagePreparing;
    default:
      return id;
  }
}

export function ImportScreen({
  importStatus,
  importCounts,
  totalRows,
  cumulativeProcessed,
  lastChunkProcessed,
  peakPercent,
  done = false,
  errorMessage = null,
}: ImportScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const exec = copy.interview.importExecution;
  const phase = resolveImportExecutionPhase(importStatus || 'running');
  const { percent } = computeImportProgressPercent({
    status: importStatus || 'running',
    cumulativeProcessed,
    totalRows,
    previousPeak: peakPercent,
    done,
  });
  const statusLine = buildImportProgressStatusLine({
    cumulativeProcessed,
    lastChunkProcessed,
    totalRows,
    phase,
  });
  const timeline = resolveImportTimeline({
    status: importStatus || 'running',
    cumulativeProcessed,
    totalRows,
    percent,
    done,
  });
  const failedCount = failedRowsDisplayCount(importCounts);

  return (
    <div className={styles.importExecutionScreen}>
      <div className={styles.importHero}>
        <div className={styles.importHeroArt} aria-hidden="true">
          <div className={styles.importHeroWindow}>
            <LuFileSpreadsheet size={52} strokeWidth={1.6} />
          </div>
          <span className={styles.importHeroBadge}>
            {phase === 'failed' || phase === 'cancelled' ? (
              <LuTriangleAlert size={22} />
            ) : (
              <LuCheck size={22} strokeWidth={2.5} />
            )}
          </span>
          <LuSparkles className={styles.importHeroSparkleA} size={14} />
          <LuSparkles className={styles.importHeroSparkleB} size={12} />
          <LuSparkles className={styles.importHeroSparkleC} size={10} />
        </div>

        <div className={styles.importHeroCopy}>
          <h2 className={styles.importHeroHeading}>{headingForPhase(phase, exec)}</h2>
          {errorMessage ? (
            <p className={styles.importHeroError} role="alert">
              {errorMessage}
            </p>
          ) : null}

          <div
            className={styles.importMetricCards}
            role="group"
            aria-label={exec.metricsAriaLabel}
          >
            <div className={styles.importMetricCard}>
              <span className={`${styles.importMetricIcon} ${styles.importMetricIconSubprojects}`}>
                <LuUsers size={18} aria-hidden />
              </span>
              <div className={styles.importMetricText}>
                <span className={styles.importMetricValue} aria-live="polite">
                  {importCounts.createdSubprojects.toLocaleString()}
                </span>
                <span className={styles.importMetricLabel}>{exec.metricSubprojects}</span>
              </div>
            </div>
            <div className={styles.importMetricCard}>
              <span className={`${styles.importMetricIcon} ${styles.importMetricIconProjects}`}>
                <LuBuilding2 size={18} aria-hidden />
              </span>
              <div className={styles.importMetricText}>
                <span className={styles.importMetricValue} aria-live="polite">
                  {importCounts.createdParents.toLocaleString()}
                </span>
                <span className={styles.importMetricLabel}>{exec.metricProjects}</span>
              </div>
            </div>
            <div className={styles.importMetricCard}>
              <span className={`${styles.importMetricIcon} ${styles.importMetricIconFailed}`}>
                <LuTriangleAlert size={18} aria-hidden />
              </span>
              <div className={styles.importMetricText}>
                <span className={styles.importMetricValue} aria-live="polite">
                  {failedCount.toLocaleString()}
                </span>
                <span className={styles.importMetricLabel}>{exec.metricFailed}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <section className={styles.importProgressPanel} aria-labelledby="import-overall-progress">
        <div className={styles.importProgressHeader}>
          <h3 id="import-overall-progress" className={styles.importProgressTitle}>
            {exec.overallProgress}
          </h3>
          <span className={styles.importProgressPercent} aria-hidden>
            {percent}%
          </span>
        </div>
        <div
          className={styles.importProgressTrack}
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={percent}
          aria-label={exec.overallProgress}
        >
          <div className={styles.importProgressFill} style={{ width: `${percent}%` }} />
        </div>
        <p className={styles.importProgressStatus} aria-live="polite" aria-atomic="true">
          <span className={styles.importProgressStatusIcon} aria-hidden>
            <LuInfo size={14} />
          </span>
          <span>
            {statusLine}
            {phase === 'running' ? (
              <>
                {' '}
                <span className={styles.importProgressSecondary}>· {exec.mayTakeMinutes}</span>
              </>
            ) : null}
          </span>
        </p>
        <span className={styles.srOnly} aria-live="polite">
          {exec.progressLiveRegionLabel}: {percent}%
        </span>
      </section>

      <section className={styles.importTimelinePanel} aria-labelledby="import-timeline-heading">
        <h3 id="import-timeline-heading" className={styles.importTimelineHeading}>
          {exec.timelineHeading}
        </h3>
        <ol className={styles.importTimeline}>
          {timeline.map((stage, index) => {
            const statusClass =
              stage.status === 'completed'
                ? styles.importTimelineStepCompleted
                : stage.status === 'in_progress'
                  ? styles.importTimelineStepCurrent
                  : stage.status === 'failed'
                    ? styles.importTimelineStepFailed
                    : styles.importTimelineStepPending;
            return (
              <li
                key={stage.id}
                className={`${styles.importTimelineStep} ${statusClass}`}
                aria-current={stage.status === 'in_progress' ? 'step' : undefined}
              >
                {index > 0 ? <span className={styles.importTimelineConnector} aria-hidden /> : null}
                <span className={styles.importTimelineIconWrap}>
                  {stage.status === 'completed' ? (
                    <LuCheck size={18} aria-hidden strokeWidth={2.5} />
                  ) : (
                    <TimelineIcon id={stage.id} status={stage.status} />
                  )}
                </span>
                <span className={styles.importTimelineLabels}>
                  <span className={styles.importTimelineStageName}>{stageLabel(stage.id, exec)}</span>
                  <span className={styles.importTimelineStageStatus}>
                    {importTimelineStatusLabel(stage.status)}
                  </span>
                </span>
              </li>
            );
          })}
        </ol>
      </section>

      <p className={styles.importStatusMessage} aria-live="polite">
        {bodyForPhase(phase, exec)}
      </p>

      {phase === 'running' || phase === 'paused' ? (
        <aside className={styles.importSafeLeaveCallout}>
          <div className={styles.importSafeLeaveCopy}>
            <span className={styles.importSafeLeaveIcon} aria-hidden>
              <LuInfo size={18} />
            </span>
            <div>
              <p className={styles.importSafeLeaveTitle}>{exec.safeLeaveTitle}</p>
              <p className={styles.importSafeLeaveBody}>{exec.safeLeaveBody}</p>
            </div>
          </div>
          <div className={styles.importSafeLeaveArt} aria-hidden="true">
            <LuMail size={28} />
            <span className={styles.importSafeLeaveBadge}>
              <LuCheck size={14} strokeWidth={2.5} />
            </span>
            <LuSparkles className={styles.importSafeLeaveSparkle} size={12} />
          </div>
        </aside>
      ) : null}

      {phase === 'completed' ? (
        <aside className={styles.importCompleteCallout} role="status">
          <span className={styles.importCompleteCalloutIcon} aria-hidden>
            <LuCheck size={20} strokeWidth={2.5} />
          </span>
          <p className={styles.importCompleteCalloutLabel}>{exec.completeBadgeLabel}</p>
        </aside>
      ) : null}
    </div>
  );
}

export type ResultsScreenProps = {
  readonly importStatus: string;
  readonly importCounts: CrmImportJobCounts;
};

/** @deprecated Kept for tests; completion stays on ImportScreen. */
export function ResultsScreen({ importStatus, importCounts }: ResultsScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const failedCount = failedRowsDisplayCount(importCounts);

  return (
    <div className={styles.focusedWidth}>
      <h2 className={styles.screenHeading}>{copy.steps.results}</h2>
      <div className={styles.summaryGrid}>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>{copy.results.createdSubprojects}</span>
          <span className={styles.summaryCardValue}>{importCounts.createdSubprojects}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>{copy.results.createdParents}</span>
          <span className={styles.summaryCardValue}>{importCounts.createdParents}</span>
        </div>
        <div className={styles.summaryCard}>
          <span className={styles.summaryCardLabel}>{copy.results.failedRows}</span>
          <span className={styles.summaryCardValue}>{failedCount}</span>
        </div>
      </div>
      <p className={styles.notice}>{copy.results.statusLabel(importStatus)}</p>
      {importStatus === 'partially_completed' ? (
        <p className={styles.hint}>
          <LuCircleAlert size={14} aria-hidden /> {copy.interview.importExecution.bodyPaused}
        </p>
      ) : null}
    </div>
  );
}
