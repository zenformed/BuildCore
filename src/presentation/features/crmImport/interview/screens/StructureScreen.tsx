'use client';

import type { ReactElement } from 'react';
import {
  LuCheck,
  LuCircle,
  LuCircleCheck,
  LuFolder,
  LuSearch,
  LuSparkles,
  LuUser,
} from 'react-icons/lu';
import type { CrmImportStructureRecommendation } from '@/domain/crm/spreadsheetImportStructureAnalysis';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { CrmImportStructureChoice } from '@/presentation/features/crmImport/interview/interviewState';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type StructureScreenProps = {
  readonly value: CrmImportStructureChoice | null;
  readonly disabled?: boolean;
  readonly onSelect: (choice: CrmImportStructureChoice) => void;
};

/** One folder on top, two below — matches the multi-structure card icon in the design. */
function StructureMultiFoldersIcon(): ReactElement {
  return (
    <span className={styles.structureMultiFoldersIcon} aria-hidden>
      <LuFolder className={styles.structureMultiFoldersTop} size={22} strokeWidth={2.25} fill="currentColor" />
      <span className={styles.structureMultiFoldersBottom}>
        <LuFolder size={18} strokeWidth={2.25} fill="currentColor" />
        <LuFolder size={18} strokeWidth={2.25} fill="currentColor" />
      </span>
    </span>
  );
}

function StructureDiagramOne({
  parentLabel,
  childLabels,
}: {
  readonly parentLabel: string;
  readonly childLabels: readonly string[];
}): ReactElement {
  return (
    <div className={styles.structureDiagram} aria-hidden>
      <div className={`${styles.structureDiagramParent} ${styles.structureDiagramParentOne}`}>
        {parentLabel}
      </div>
      <div className={styles.structureDiagramTrunk} />
      <div className={styles.structureDiagramBranchBar} />
      <div className={styles.structureDiagramBranchRow}>
        {childLabels.map((label) => (
          <div key={label} className={styles.structureDiagramChild}>
            <span className={styles.structureDiagramChildStem} />
            <span className={`${styles.structureDiagramAvatar} ${styles.structureDiagramAvatarOne}`}>
              <LuUser size={12} fill="currentColor" />
            </span>
            <span className={styles.structureDiagramChildLabel}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureDiagramMultiple({
  parentLabels,
  childGroups,
}: {
  readonly parentLabels: readonly string[];
  readonly childGroups: readonly (readonly string[])[];
}): ReactElement {
  return (
    <div className={styles.structureDiagram} aria-hidden>
      <div className={styles.structureDiagramMultiParents}>
        {parentLabels.map((label, index) => (
          <div key={label} className={styles.structureDiagramMultiGroup}>
            <div className={`${styles.structureDiagramParent} ${styles.structureDiagramParentMulti}`}>
              {label}
            </div>
            <div className={styles.structureDiagramTrunk} />
            <div className={styles.structureDiagramBranchBar} />
            <div className={styles.structureDiagramBranchRow}>
              {(childGroups[index] ?? []).map((child) => (
                <div key={`${label}-${child}`} className={styles.structureDiagramChild}>
                  <span className={styles.structureDiagramChildStem} />
                  <span
                    className={`${styles.structureDiagramAvatar} ${styles.structureDiagramAvatarMulti}`}
                  >
                    <LuUser size={11} fill="currentColor" />
                  </span>
                  <span className={styles.structureDiagramChildLabel}>{child}</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StructureDiagramUnsure(): ReactElement {
  return (
    <div className={`${styles.structureDiagram} ${styles.structureDiagramUnsure}`} aria-hidden>
      <div className={styles.structureDiagramSheet}>
        {Array.from({ length: 4 }, (_, row) => (
          <div key={`row-${row}`} className={styles.structureDiagramSheetRow}>
            {Array.from({ length: 4 }, (_, col) => (
              <span key={`cell-${row}-${col}`} className={styles.structureDiagramSheetCell} />
            ))}
          </div>
        ))}
      </div>
      <span className={styles.structureDiagramSearch}>
        <LuSearch size={28} strokeWidth={2.25} />
      </span>
    </div>
  );
}

export function StructureScreen({ value, disabled, onSelect }: StructureScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.structure;

  const options: {
    readonly key: CrmImportStructureChoice;
    readonly title: string;
    readonly description: string;
    readonly accent: 'one' | 'multi' | 'unsure';
    readonly footerLabel: string;
    readonly icon: ReactElement;
    readonly diagram: ReactElement;
  }[] = [
    {
      key: 'one_project',
      title: copy.one.title,
      description: copy.one.description,
      accent: 'one',
      footerLabel: value === 'one_project' ? copy.selectedLabel : copy.selectOptionLabel,
      icon: <LuFolder size={38} strokeWidth={2} fill="currentColor" />,
      diagram: (
        <StructureDiagramOne
          parentLabel={copy.one.parentSample}
          childLabels={copy.one.childSamples}
        />
      ),
    },
    {
      key: 'multiple_projects',
      title: copy.multiple.title,
      description: copy.multiple.description,
      accent: 'multi',
      footerLabel: value === 'multiple_projects' ? copy.selectedLabel : copy.selectOptionLabel,
      icon: <StructureMultiFoldersIcon />,
      diagram: (
        <StructureDiagramMultiple
          parentLabels={copy.multiple.parentSamples}
          childGroups={copy.multiple.childSamples}
        />
      ),
    },
    {
      key: 'unsure',
      title: copy.unsure.title,
      description: copy.unsure.description,
      accent: 'unsure',
      footerLabel: value === 'unsure' ? copy.selectedLabel : copy.decideLabel,
      icon: <LuSparkles size={38} strokeWidth={2} fill="currentColor" />,
      diagram: <StructureDiagramUnsure />,
    },
  ];

  return (
    <div className={styles.structureScreen}>
      <div className={styles.structureScreenIntro}>
        <h2 className={styles.structureScreenHeading}>{copy.heading}</h2>
        <p className={styles.structureScreenSubheading}>{copy.subheading}</p>
      </div>

      <div className={styles.structureCardGrid} role="radiogroup" aria-label={copy.heading}>
        {options.map((option) => {
          const selected = value === option.key;
          return (
            <button
              key={option.key}
              type="button"
              role="radio"
              aria-checked={selected}
              disabled={disabled}
              className={[
                styles.structureCard,
                styles[`structureCardAccent_${option.accent}`],
                selected ? styles.structureCardSelected : '',
              ]
                .filter(Boolean)
                .join(' ')}
              onClick={() => onSelect(option.key)}
            >
              {selected ? (
                <span className={styles.structureCardBadge} aria-hidden>
                  <LuCheck size={14} strokeWidth={3} />
                </span>
              ) : null}

              <span className={styles.structureCardIcon} aria-hidden>
                {option.icon}
              </span>

              <span className={styles.structureCardTitle}>{option.title}</span>
              <span className={styles.structureCardDescription}>{option.description}</span>

              <div className={styles.structureCardVisual}>{option.diagram}</div>

              <span className={styles.structureCardFooter}>
                {selected ? (
                  <LuCircleCheck className={styles.structureCardFooterIcon} size={18} aria-hidden />
                ) : (
                  <LuCircle className={styles.structureCardFooterIconMuted} size={18} aria-hidden />
                )}
                <span className={selected ? styles.structureCardFooterSelected : undefined}>
                  {option.footerLabel}
                </span>
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

export type RecommendScreenProps = {
  readonly recommendations: readonly CrmImportStructureRecommendation[];
  readonly selectedId: string | null;
  readonly manualSelected: boolean;
  readonly disabled?: boolean;
  readonly onSelectRecommendation: (recommendation: CrmImportStructureRecommendation) => void;
  readonly onSelectManual: () => void;
};

export function RecommendScreen({
  recommendations,
  selectedId,
  manualSelected,
  disabled,
  onSelectRecommendation,
  onSelectManual,
}: RecommendScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.recommend;

  return (
    <div className={styles.focusedWidth}>
      <h2 className={styles.screenHeading}>{copy.heading}</h2>
      <p className={styles.screenSubheading}>{copy.subheading}</p>
      <div className={styles.optionGrid}>
        {recommendations.map((recommendation) => (
          <button
            key={recommendation.id}
            type="button"
            disabled={disabled}
            className={[
              styles.optionCard,
              selectedId === recommendation.id && !manualSelected ? styles.optionCardSelected : '',
            ]
              .filter(Boolean)
              .join(' ')}
            onClick={() => onSelectRecommendation(recommendation)}
          >
            <span className={styles.optionCardTitle}>{recommendation.title}</span>
            <span className={styles.optionCardDescription}>{recommendation.reason}</span>
            <span className={styles.optionCardMeta}>
              {copy.estimate(recommendation.estimatedParentGroups, recommendation.estimatedSubprojects)}
            </span>
          </button>
        ))}
        <button
          type="button"
          disabled={disabled}
          className={[styles.optionCard, manualSelected ? styles.optionCardSelected : '']
            .filter(Boolean)
            .join(' ')}
          onClick={onSelectManual}
        >
          <span className={styles.optionCardTitle}>{copy.manualOption}</span>
          <span className={styles.optionCardDescription}>{copy.manualOptionDescription}</span>
        </button>
      </div>
    </div>
  );
}
