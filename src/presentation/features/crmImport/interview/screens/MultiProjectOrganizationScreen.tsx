'use client';

import type { ReactElement } from 'react';
import {
  LuCheck,
  LuColumns3,
  LuFileSpreadsheet,
  LuLayers,
  LuSparkles,
} from 'react-icons/lu';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { CrmImportMultiProjectOrganization } from '@/presentation/features/crmImport/interview/interviewState';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type MultiProjectOrganizationScreenProps = {
  readonly value: CrmImportMultiProjectOrganization | null;
  readonly disabled?: boolean;
  readonly onSelect: (choice: CrmImportMultiProjectOrganization) => void;
};

function RepeatingColumnVisual({
  header,
  rows,
}: {
  readonly header: string;
  readonly rows: readonly string[];
}): ReactElement {
  return (
    <div className={styles.multiOrgVisual} aria-hidden>
      <div className={styles.multiOrgVisualSheet}>
        <div className={styles.multiOrgVisualHeader}>{header}</div>
        {rows.map((row, index) => (
          <div key={`${row}-${index}`} className={styles.multiOrgVisualRow}>
            {row}
          </div>
        ))}
      </div>
    </div>
  );
}

function HeaderRowsVisual({
  sections,
}: {
  readonly sections: readonly { readonly title: string; readonly rows: readonly string[] }[];
}): ReactElement {
  return (
    <div className={styles.multiOrgVisual} aria-hidden>
      <div className={styles.multiOrgVisualSections}>
        {sections.map((section) => (
          <div key={section.title} className={styles.multiOrgVisualSection}>
            <div className={styles.multiOrgVisualSectionTitle}>{section.title}</div>
            {section.rows.map((row) => (
              <div key={`${section.title}-${row}`} className={styles.multiOrgVisualSectionRow}>
                {row}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

function WorksheetVisual({ sheets }: { readonly sheets: readonly string[] }): ReactElement {
  return (
    <div className={styles.multiOrgVisual} aria-hidden>
      <div className={styles.multiOrgVisualWorkbook}>
        <div className={styles.multiOrgVisualWorkbookLabel}>Workbook</div>
        <div className={styles.multiOrgVisualTabs}>
          {sheets.map((sheet) => (
            <span key={sheet} className={styles.multiOrgVisualTab}>
              {sheet}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export function MultiProjectOrganizationScreen({
  value,
  disabled,
  onSelect,
}: MultiProjectOrganizationScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.multiProjectOrganization;

  const layoutOptions: {
    readonly key: CrmImportMultiProjectOrganization;
    readonly title: string;
    readonly description: string;
    readonly accent: 'repeat' | 'headers' | 'sheets';
    readonly recommended: boolean;
    readonly icon: ReactElement;
    readonly visual: ReactElement;
  }[] = [
    {
      key: 'repeating_column',
      title: copy.repeating.title,
      description: copy.repeating.description,
      accent: 'repeat',
      recommended: true,
      icon: <LuColumns3 size={30} strokeWidth={2.1} />,
      visual: (
        <RepeatingColumnVisual header={copy.repeating.visualHeader} rows={copy.repeating.visualRows} />
      ),
    },
    {
      key: 'header_rows',
      title: copy.headerRows.title,
      description: copy.headerRows.description,
      accent: 'headers',
      recommended: false,
      icon: <LuLayers size={30} strokeWidth={2.1} />,
      visual: <HeaderRowsVisual sections={copy.headerRows.visualSections} />,
    },
    {
      key: 'worksheet_per_project',
      title: copy.worksheets.title,
      description: copy.worksheets.description,
      accent: 'sheets',
      recommended: false,
      icon: <LuFileSpreadsheet size={30} strokeWidth={2.1} />,
      visual: <WorksheetVisual sheets={copy.worksheets.visualSheets} />,
    },
  ];

  const unsureSelected = value === 'unsure';

  return (
    <div className={styles.multiOrgScreen}>
      <div className={styles.multiOrgIntro}>
        <h2 className={styles.multiOrgHeading}>{copy.heading}</h2>
        <p className={styles.multiOrgSubheading}>{copy.subheading}</p>
      </div>

      <div className={styles.multiOrgChoices} role="radiogroup" aria-label={copy.heading}>
        <div className={styles.multiOrgCardGrid}>
          {layoutOptions.map((option) => {
            const selected = value === option.key;
            return (
              <button
                key={option.key}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                className={[
                  styles.multiOrgCard,
                  styles[`multiOrgCardAccent_${option.accent}`],
                  selected ? styles.multiOrgCardSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => onSelect(option.key)}
              >
                {option.recommended ? (
                  <span className={styles.multiOrgMostCommonBadge}>{copy.mostCommonBadge}</span>
                ) : null}
                {selected ? (
                  <span className={styles.multiOrgCardBadge} aria-hidden>
                    <LuCheck size={14} strokeWidth={3} />
                  </span>
                ) : null}

                <span className={styles.multiOrgCardIcon} aria-hidden>
                  {option.icon}
                </span>
                <span className={styles.multiOrgCardTitle}>{option.title}</span>
                <span className={styles.multiOrgCardDescription}>{option.description}</span>
                <div className={styles.multiOrgCardVisual}>{option.visual}</div>
                <span className={styles.srOnly}>
                  {selected ? copy.selectedLabel : copy.selectOptionLabel}
                </span>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          role="radio"
          aria-checked={unsureSelected}
          disabled={disabled}
          className={[
            styles.multiOrgUnsureBar,
            unsureSelected ? styles.multiOrgUnsureBarSelected : '',
          ]
            .filter(Boolean)
            .join(' ')}
          onClick={() => onSelect('unsure')}
        >
          <span className={styles.multiOrgUnsureBarIcon} aria-hidden>
            <LuSparkles size={22} strokeWidth={2.1} />
          </span>
          <span className={styles.multiOrgUnsureBarCopy}>
            <span className={styles.multiOrgUnsureBarTitle}>{copy.unsure.title}</span>
            <span className={styles.multiOrgUnsureBarDescription}>{copy.unsure.description}</span>
          </span>
          <span className={styles.multiOrgUnsureBarCta}>{copy.decideCta}</span>
          <span className={styles.srOnly}>
            {unsureSelected ? copy.selectedLabel : copy.decideLabel}
          </span>
        </button>
      </div>
    </div>
  );
}

export type ComingSoonImportScreenProps = {
  readonly kind: 'header_rows' | 'worksheet_per_project';
};

export function ComingSoonImportScreen({ kind }: ComingSoonImportScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.comingSoon;
  const block = kind === 'header_rows' ? copy.headerRows : copy.worksheets;

  return (
    <div className={styles.comingSoonScreen}>
      <div className={styles.comingSoonCard}>
        <span className={styles.comingSoonIcon} aria-hidden>
          {kind === 'header_rows' ? <LuLayers size={28} /> : <LuFileSpreadsheet size={28} />}
        </span>
        <h2 className={styles.comingSoonHeading}>{block.title}</h2>
        <p className={styles.comingSoonBody}>{block.body}</p>
      </div>
    </div>
  );
}
