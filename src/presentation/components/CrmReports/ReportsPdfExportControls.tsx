'use client';

import type { ReactElement } from 'react';
import { useRef, useState } from 'react';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { UseCrmReportsPdfExportResult } from '@/presentation/features/crmReports/useCrmReportsPdfExport';
import { WorkflowInlineMenu } from '../CrmProjectDetail/WorkflowInlineMenu';
import projectStyles from '../CrmProjectDetail/ProjectDetail.module.css';
import styles from './CrmReports.module.css';

export type ReportsPdfExportControlsProps = {
  readonly exportState: UseCrmReportsPdfExportResult;
};

function isExportingCurrent(exportState: UseCrmReportsPdfExportResult): boolean {
  return exportState.exportingTarget?.kind === 'current';
}

function isExportingYear(
  exportState: UseCrmReportsPdfExportResult,
  year: number
): boolean {
  return exportState.exportingTarget?.kind === 'year' && exportState.exportingTarget.year === year;
}

export function ReportsPdfExportControls({
  exportState,
}: ReportsPdfExportControlsProps): ReactElement {
  const pdf = content.reports.pdfExport;
  const anchorRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const {
    availableYears,
    exportingTarget,
    exportCurrentReport,
    exportYear,
    canExport,
  } = exportState;
  const isBusy = exportingTarget != null;

  return (
    <div className={styles.reportsMenuWrap}>
      <button
        ref={anchorRef}
        type="button"
        className={`${projectStyles.stageChip} ${styles.reportsMenuTrigger}`}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        aria-label={pdf.menuLabel}
        disabled={!canExport}
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className={projectStyles.detailPanelHeaderBtnIcon_download} aria-hidden />
        {pdf.menuLabel}
      </button>

      <WorkflowInlineMenu
        open={menuOpen && canExport}
        onClose={() => setMenuOpen(false)}
        anchorRef={anchorRef}
        align="end"
        sizeToContent
        portalClassName={`${projectStyles.inlineMenu_portal} ${styles.reportsMenuPortal}`}
      >
        <p className={styles.reportsMenuHeading} id="reports-pdf-current-heading">
          {pdf.currentReport}
        </p>
        <ul
          className={styles.reportsMenuList}
          role="menu"
          aria-labelledby="reports-pdf-current-heading"
        >
          <li role="none">
            <button
              type="button"
              role="menuitem"
              className={styles.reportsMenuItem}
              disabled={isBusy}
              onClick={() => {
                setMenuOpen(false);
                void exportCurrentReport();
              }}
            >
              <span className={styles.reportsMenuItemLabel}>
                {isExportingCurrent(exportState)
                  ? content.reports.downloadPdfGenerating
                  : pdf.downloadCurrent}
              </span>
              <span
                className={projectStyles.detailPanelHeaderBtnIcon_download}
                aria-hidden
              />
            </button>
          </li>
        </ul>

        <p
          className={`${styles.reportsMenuHeading} ${styles.reportsMenuHeadingSpaced}`}
          id="reports-pdf-period-heading"
        >
          {pdf.reportPeriod}
        </p>
        <ul
          className={styles.reportsMenuList}
          role="menu"
          aria-labelledby="reports-pdf-period-heading"
        >
          {availableYears.map((year) => (
            <li key={year} role="none">
              <button
                type="button"
                role="menuitem"
                className={styles.reportsMenuItem}
                disabled={isBusy}
                onClick={() => {
                  setMenuOpen(false);
                  void exportYear(year);
                }}
              >
                <span className={styles.reportsMenuItemLabel}>
                  {isExportingYear(exportState, year)
                    ? content.reports.downloadPdfGenerating
                    : String(year)}
                </span>
                <span
                  className={projectStyles.detailPanelHeaderBtnIcon_download}
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      </WorkflowInlineMenu>
    </div>
  );
}
