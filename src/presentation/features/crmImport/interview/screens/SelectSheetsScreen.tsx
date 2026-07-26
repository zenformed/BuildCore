'use client';

import { useId, type ReactElement } from 'react';
import Image from 'next/image';
import { LuCheck, LuFileSpreadsheet, LuLightbulb } from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  updateWorksheetProjectIncluded,
  worksheetHasImportableData,
  type WorksheetProjectConfig,
  type WorksheetSheetInput,
} from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import { includedWorksheetConfigs } from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

const SELECT_SHEETS_ILLUSTRATION = '/images/import/spreadsheet-select-sheets-illustration.svg';

export type SelectSheetsScreenProps = {
  readonly sheets: readonly WorksheetSheetInput[];
  readonly configs: readonly WorksheetProjectConfig[];
  readonly disabled?: boolean;
  readonly onChangeConfigs: (configs: readonly WorksheetProjectConfig[]) => void;
};

export function canContinueSelectSheets(
  configs: readonly WorksheetProjectConfig[],
  sheetsById: ReadonlyMap<string, WorksheetSheetInput>
): boolean {
  return includedWorksheetConfigs(configs).some((config) => {
    const sheet = sheetsById.get(config.worksheetId);
    return sheet != null && worksheetHasImportableData(sheet.matrix);
  });
}

/** One-project path: pick which worksheets to import (no Project assignment yet). */
export function SelectSheetsScreen({
  sheets,
  configs,
  disabled = false,
  onChangeConfigs,
}: SelectSheetsScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.selectSheets;
  const rootId = useId();
  const sheetsById = new Map(sheets.map((sheet) => [sheet.worksheetId, sheet]));
  const selectedCount = includedWorksheetConfigs(configs).length;

  return (
    <div className={styles.selectSheetsScreen}>
      <div className={styles.selectSheetsVisual}>
        <Image
          className={styles.selectSheetsIllustration}
          src={SELECT_SHEETS_ILLUSTRATION}
          alt={copy.illustrationAlt}
          width={480}
          height={400}
          priority
          unoptimized
        />
      </div>

      <div className={styles.selectSheetsContent}>
        <div className={styles.selectSheetsMain}>
          <header className={styles.selectSheetsIntro}>
            <h2 id={`${rootId}-heading`} className={styles.selectSheetsHeading}>
              {copy.heading}
            </h2>
            <p className={styles.selectSheetsSubheading}>{copy.subheading}</p>
          </header>

          <div className={styles.selectSheetsPanel} aria-labelledby={`${rootId}-heading`}>
            <p className={styles.selectSheetsListMeta} aria-live="polite">
              {copy.selectedCount(selectedCount, configs.length)}
            </p>
            <ul className={styles.selectSheetsList}>
              {configs.map((config) => {
                const sheet = sheetsById.get(config.worksheetId);
                const importable =
                  sheet != null && worksheetHasImportableData(sheet.matrix);
                return (
                  <li key={config.worksheetId}>
                    <label
                      className={[
                        styles.selectSheetsRow,
                        config.included ? styles.selectSheetsRowSelected : '',
                        !importable ? styles.selectSheetsRowDisabled : '',
                      ]
                        .filter(Boolean)
                        .join(' ')}
                    >
                      <input
                        type="checkbox"
                        className={styles.selectSheetsCheckbox}
                        checked={config.included && importable}
                        disabled={disabled || !importable}
                        aria-label={copy.selectSheetAria(config.worksheetName)}
                        onChange={(event) =>
                          onChangeConfigs(
                            updateWorksheetProjectIncluded(
                              configs,
                              config.worksheetId,
                              event.target.checked
                            )
                          )
                        }
                      />
                      <span className={styles.selectSheetsCheckboxFace} aria-hidden>
                        {config.included && importable ? (
                          <LuCheck size={12} strokeWidth={3} />
                        ) : null}
                      </span>
                      <LuFileSpreadsheet
                        className={styles.selectSheetsSheetIcon}
                        size={20}
                        aria-hidden
                      />
                      <span className={styles.selectSheetsRowCopy}>
                        <span className={styles.selectSheetsSheetName}>
                          {config.worksheetName}
                        </span>
                        <span className={styles.selectSheetsSheetMeta}>
                          {importable
                            ? copy.sheetMeta(config.dataRowCount, config.columnCount)
                            : copy.noData}
                        </span>
                      </span>
                    </label>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        <div className={styles.selectSheetsTip} role="note">
          <LuLightbulb className={styles.selectSheetsTipIcon} size={16} aria-hidden />
          <p className={styles.selectSheetsTipText}>{copy.nextStepTip(selectedCount)}</p>
        </div>
      </div>
    </div>
  );
}
