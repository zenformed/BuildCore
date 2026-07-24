'use client';

import type { ReactElement } from 'react';
import { LuCircleCheck, LuColumns3, LuTriangleAlert } from 'react-icons/lu';
import { SPREADSHEET_IMPORT_LIMITS } from '@/domain/crm/spreadsheetImportLimits';
import { toUserFacingSpreadsheetRowNumber } from '@/domain/crm/spreadsheetImportHeaderDetection';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildHeaderConfirmationPanelViewModel } from '@/presentation/features/crmImport/interview/headerConfirmationPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type HeaderScreenProps = {
  readonly busy: boolean;
  readonly sheetMatrix: readonly (readonly string[])[];
  readonly headerRowIndex: number;
  readonly detectedHeaderRowIndex: number;
  readonly truncated: boolean;
  readonly onHeaderRowChange: (index: number) => void;
};

export function HeaderScreen({
  busy,
  sheetMatrix,
  headerRowIndex,
  detectedHeaderRowIndex,
  truncated,
  onHeaderRowChange,
}: HeaderScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const header = copy.interview.header;
  const colCount = Math.min(
    Math.max(...sheetMatrix.map((row) => row.length), 0),
    SPREADSHEET_IMPORT_LIMITS.maxColumns
  );
  const selectedHeaderCells = sheetMatrix[headerRowIndex] ?? [];
  const panel = buildHeaderConfirmationPanelViewModel({
    selectedZeroBasedIndex: headerRowIndex,
    detectedZeroBasedIndex: detectedHeaderRowIndex,
    matrix: sheetMatrix,
    copy: {
      autoFoundTitle: header.autoFoundTitle,
      autoReviewTitle: header.autoReviewTitle,
      autoRowLabel: header.autoRowLabel,
      manualTitle: header.manualTitle,
      confidenceHigh: header.confidenceHigh,
      confidenceMedium: header.confidenceMedium,
      confidenceLow: header.confidenceLow,
    },
  });

  const PanelIcon =
    panel.tone === 'success' ? LuCircleCheck : panel.tone === 'warning' ? LuTriangleAlert : LuColumns3;

  return (
    <div className={styles.headerScreen}>
      <div className={styles.headerScreenIntro}>
        <h2 className={styles.headerScreenHeading}>
          <LuColumns3 className={styles.headerScreenHeadingIcon} aria-hidden size={22} />
          <span>{header.heading}</span>
        </h2>
        <p className={styles.headerScreenHint}>{header.hint}</p>
      </div>

      <div
        className={[
          styles.headerDetectPanel,
          panel.tone === 'success' ? styles.headerDetectPanelSuccess : '',
          panel.tone === 'warning' ? styles.headerDetectPanelWarning : '',
          panel.tone === 'neutral' ? styles.headerDetectPanelNeutral : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <PanelIcon className={styles.headerDetectPanelIcon} size={20} aria-hidden />
        <div className={styles.headerDetectPanelBody}>
          <p className={styles.headerDetectPanelTitle}>{panel.title}</p>
          {panel.detail ? <p className={styles.headerDetectPanelDetail}>{panel.detail}</p> : null}
        </div>
        {panel.confidenceLabel ? (
          <span className={styles.headerDetectConfidence}>{panel.confidenceLabel}</span>
        ) : null}
      </div>

      <div
        className={styles.headerPreviewWrap}
        role="radiogroup"
        aria-label={header.previewAriaLabel}
      >
        <table className={styles.headerPreviewTable}>
          <thead>
            <tr>
              <th className={styles.stickySelectCol} scope="col">
                <span className={styles.srOnly}>{copy.upload.selectColumnAria}</span>
              </th>
              <th className={styles.stickyRowCol} scope="col">
                {copy.upload.rowColumnLabel}
              </th>
              {Array.from({ length: colCount }, (_, index) => {
                const value = (selectedHeaderCells[index] ?? '').trim();
                const label = value || header.columnFallback(index);
                return (
                  <th key={`col-${index}`} scope="col" title={label}>
                    <span className={styles.cellClamp}>{label}</span>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {sheetMatrix.slice(0, 20).map((row, zeroBasedIndex) => {
              const selected = zeroBasedIndex === headerRowIndex;
              const userRow = toUserFacingSpreadsheetRowNumber(zeroBasedIndex);
              return (
                <tr
                  key={`preview-row-${zeroBasedIndex}`}
                  className={[
                    styles.previewRowButton,
                    selected ? styles.headerRowSelected : styles.headerRowUnselected,
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-selected={selected}
                  onClick={() => {
                    if (!busy) onHeaderRowChange(zeroBasedIndex);
                  }}
                  onKeyDown={(event) => {
                    if (event.key === ' ' || event.key === 'Enter') {
                      event.preventDefault();
                      if (!busy) onHeaderRowChange(zeroBasedIndex);
                    }
                  }}
                >
                  <td className={styles.stickySelectCol}>
                    <input
                      type="radio"
                      className={styles.headerRowRadio}
                      name="spreadsheet-import-header-row"
                      checked={selected}
                      disabled={busy}
                      aria-label={copy.upload.useRowAsHeaders(userRow)}
                      onChange={() => onHeaderRowChange(zeroBasedIndex)}
                    />
                  </td>
                  <td className={styles.stickyRowCol}>
                    <span className={styles.headerRowNumber}>{userRow}</span>
                    {selected ? (
                      <span className={styles.headerSelectedBadge}>{header.selectedAsHeader}</span>
                    ) : null}
                  </td>
                  {Array.from({ length: colCount }, (_, colIndex) => {
                    const value = row[colIndex] ?? '';
                    return (
                      <td key={`cell-${zeroBasedIndex}-${colIndex}`} title={value}>
                        <span className={styles.cellClamp}>{value}</span>
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {truncated ? <p className={styles.notice}>{copy.interview.upload.truncatedNotice}</p> : null}
    </div>
  );
}
