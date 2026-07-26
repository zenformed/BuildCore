'use client';

import { useEffect, useId, useMemo, useState, type ReactElement } from 'react';
import {
  LuBuilding2,
  LuCheck,
  LuCircleCheck,
  LuPlus,
  LuSearch,
  LuX,
} from 'react-icons/lu';
import type { CrmImportParentCandidate } from '@/domain/crm/spreadsheetImportParentSearch';
import { CRM_IMPORT_PARENT_LIST_PAGE_SIZE } from '@/domain/crm/spreadsheetImportParentSearch';
import { normalizeImportText } from '@/domain/crm/spreadsheetImportGrouping';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  chooseParentRowClassName,
  filterChooseParentCandidates,
  nextChooseParentVisibleLimit,
  pageChooseParentCandidates,
  resolveChooseParentEmptyKind,
} from '@/presentation/features/crmImport/interview/chooseParentPresentation';
import type { WorksheetProjectConfig } from '@/presentation/features/crmImport/interview/worksheetProjectsPresentation';
import {
  buildWorksheetProgressItems,
  includedWorksheetConfigs,
  isCurrentWorksheetResolutionSavable,
  updateWorksheetResolutionAttach,
  updateWorksheetResolutionKind,
  validateCurrentWorksheetResolution,
  worksheetIndexAmongIncluded,
  type WorksheetResolutionDraft,
  type WorksheetResolveValidationCode,
} from '@/presentation/features/crmImport/interview/worksheetResolvePresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export type WorksheetResolveScreenProps = {
  readonly configs: readonly WorksheetProjectConfig[];
  readonly resolutions: Readonly<Record<string, WorksheetResolutionDraft>>;
  readonly activeWorksheetId: string | null;
  readonly parentCandidates: readonly CrmImportParentCandidate[];
  readonly disabled?: boolean;
  readonly onChangeConfigs: (configs: readonly WorksheetProjectConfig[]) => void;
  readonly onChangeResolutions: (
    resolutions: Readonly<Record<string, WorksheetResolutionDraft>>
  ) => void;
  readonly onSelectWorksheet: (worksheetId: string) => void;
  readonly onPrevious: () => void;
  readonly onSaveAndContinue: () => void;
  readonly isFirstWorksheet: boolean;
  readonly isLastWorksheet: boolean;
};

function validationMessage(
  code: WorksheetResolveValidationCode,
  copy: (typeof content.crm.spreadsheetImport.interview)['worksheetResolve'],
  projectName: string
): string | null {
  switch (code) {
    case 'missing_name':
      return copy.errorMissingName;
    case 'needs_project':
      return copy.errorNeedsProject;
    case 'duplicate_name':
      return copy.errorDuplicateName(projectName.trim() || 'this name');
    default:
      return null;
  }
}

/**
 * One-worksheet-at-a-time Project resolution interview.
 */
export function WorksheetResolveScreen({
  configs,
  resolutions,
  activeWorksheetId,
  parentCandidates,
  disabled = false,
  onChangeConfigs,
  onChangeResolutions,
  onSelectWorksheet,
  onPrevious,
  onSaveAndContinue,
  isFirstWorksheet,
  isLastWorksheet,
}: WorksheetResolveScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.worksheetResolve;
  const chooseParent = content.crm.spreadsheetImport.interview.chooseParent;
  const rootId = useId();
  const [query, setQuery] = useState('');
  const [visibleLimit, setVisibleLimit] = useState(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
  const [pickingProject, setPickingProject] = useState(true);
  const [showValidation, setShowValidation] = useState(false);

  const included = useMemo(() => includedWorksheetConfigs(configs), [configs]);
  const activeConfig =
    included.find((config) => config.worksheetId === activeWorksheetId) ?? included[0] ?? null;
  const activeId = activeConfig?.worksheetId ?? null;
  const resolution =
    activeId != null
      ? (resolutions[activeId] ?? {
          kind: 'create_new' as const,
          existingProjectId: null,
          existingProjectLabel: null,
          confirmed: false,
        })
      : null;

  const progressItems = useMemo(
    () => buildWorksheetProgressItems({ configs, resolutions }),
    [configs, resolutions]
  );

  const index = worksheetIndexAmongIncluded(configs, activeId);
  const displayName = (activeConfig?.projectName.trim() || activeConfig?.worksheetName || '—').trim();

  const validationCode =
    activeConfig != null && resolution != null
      ? validateCurrentWorksheetResolution({
          config: activeConfig,
          resolution,
          configs,
          resolutions,
        })
      : 'needs_project';
  const canSave =
    activeConfig != null &&
    resolution != null &&
    isCurrentWorksheetResolutionSavable({
      config: activeConfig,
      resolution,
      configs,
      resolutions,
    });

  const filtered = useMemo(
    () => filterChooseParentCandidates(parentCandidates, query),
    [parentCandidates, query]
  );
  const paged = useMemo(
    () => pageChooseParentCandidates(filtered, visibleLimit),
    [filtered, visibleLimit]
  );
  const emptyKind = resolveChooseParentEmptyKind({
    totalEligible: parentCandidates.length,
    filteredCount: filtered.length,
    query,
  });

  useEffect(() => {
    setQuery('');
    setVisibleLimit(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
    setShowValidation(false);
  }, [activeId]);

  useEffect(() => {
    setPickingProject(!(resolution?.kind === 'attach_existing' && resolution.existingProjectId));
  }, [activeId, resolution?.kind, resolution?.existingProjectId]);

  useEffect(() => {
    if (validationCode === 'ok') setShowValidation(false);
  }, [validationCode]);

  if (activeConfig == null || resolution == null || activeId == null) {
    return <div className={styles.worksheetResolveFocusScreen} />;
  }

  const selectedCandidate =
    resolution.existingProjectId != null
      ? parentCandidates.find((candidate) => candidate.id === resolution.existingProjectId)
      : null;

  const updateName = (projectName: string) => {
    onChangeConfigs(
      configs.map((config) =>
        config.worksheetId === activeId ? { ...config, projectName } : config
      )
    );
    if (resolutions[activeId]?.confirmed) {
      onChangeResolutions({
        ...resolutions,
        [activeId]: { ...resolutions[activeId]!, confirmed: false },
      });
    }
  };

  return (
    <div className={styles.worksheetResolveFocusScreen}>
      <nav className={styles.worksheetResolveProgressStrip} aria-label={copy.progressNavAria}>
        {progressItems.map((item) => {
          const current = item.worksheetId === activeId;
          const statusLabel =
            item.kind === 'complete'
              ? copy.progressComplete
              : item.kind === 'skipped'
                ? copy.progressSkipped
                : copy.progressNeedsReview;
          return (
            <button
              key={item.worksheetId}
              type="button"
              className={[
                styles.worksheetResolveProgressItem,
                current ? styles.worksheetResolveProgressItemCurrent : '',
                item.kind === 'complete' ? styles.worksheetResolveProgressItemComplete : '',
                item.kind === 'skipped' ? styles.worksheetResolveProgressItemSkipped : '',
              ]
                .filter(Boolean)
                .join(' ')}
              disabled={disabled}
              aria-current={current ? 'step' : undefined}
              aria-label={
                current
                  ? copy.progressCurrentAria(item.worksheetName)
                  : copy.progressSelectAria(item.worksheetName)
              }
              onClick={() => onSelectWorksheet(item.worksheetId)}
            >
              <span className={styles.worksheetResolveProgressName} title={item.worksheetName}>
                {item.worksheetName}
              </span>
              <span className={styles.worksheetResolveProgressStatus}>
                {item.kind === 'complete' ? <LuCircleCheck size={14} aria-hidden /> : null}
                {statusLabel}
              </span>
            </button>
          );
        })}
      </nav>

      <div className={styles.worksheetResolveFocusMain}>
        <header className={styles.worksheetResolveFocusIntro}>
          <h2 className={styles.worksheetResolveFocusHeading}>
            {copy.questionHeading(displayName)}
          </h2>
          <p className={styles.worksheetResolveFocusMeta}>
            {copy.worksheetMeta(
              index + 1,
              included.length,
              activeConfig.dataRowCount,
              activeConfig.columnCount
            )}
          </p>
          <p className={styles.worksheetResolveFocusSupporting}>{copy.supporting}</p>
        </header>

        <label className={styles.worksheetResolveNameLabel} htmlFor={`${rootId}-name`}>
          {copy.projectNameLabel}
          <input
            id={`${rootId}-name`}
            type="text"
            className={styles.worksheetResolveNameInput}
            value={activeConfig.projectName}
            disabled={disabled || resolution.kind === 'skip'}
            aria-label={copy.projectNameAria(activeConfig.worksheetName)}
            aria-invalid={showValidation && validationCode === 'missing_name' ? true : undefined}
            onChange={(event) => updateName(event.target.value)}
            onBlur={(event) => updateName(event.target.value.trim())}
          />
        </label>

        <div
          className={styles.worksheetResolveChoiceGrid}
          role="radiogroup"
          aria-label={copy.resolutionGroupAria(activeConfig.worksheetName)}
        >
          {(
            [
              {
                kind: 'create_new' as const,
                title: copy.createTitle,
                description: copy.createDescription(displayName),
                Icon: LuPlus,
                accent: styles.worksheetResolveChoiceIconCreate,
              },
              {
                kind: 'attach_existing' as const,
                title: copy.attachTitle,
                description: copy.attachDescription(activeConfig.dataRowCount),
                Icon: LuBuilding2,
                accent: styles.worksheetResolveChoiceIconAttach,
              },
              {
                kind: 'skip' as const,
                title: copy.skipTitle,
                description: copy.skipDescription(activeConfig.worksheetName),
                Icon: LuX,
                accent: styles.worksheetResolveChoiceIconSkip,
              },
            ] as const
          ).map((choice) => {
            const selected = resolution.kind === choice.kind;
            return (
              <button
                key={choice.kind}
                type="button"
                role="radio"
                aria-checked={selected}
                disabled={disabled}
                className={[
                  styles.worksheetResolveChoiceCard,
                  selected ? styles.worksheetResolveChoiceCardSelected : '',
                ]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() =>
                  onChangeResolutions(
                    updateWorksheetResolutionKind(resolutions, activeId, choice.kind)
                  )
                }
              >
                <span
                  className={[
                    styles.worksheetResolveChoiceCheck,
                    selected ? styles.worksheetResolveChoiceCheckOn : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-hidden
                >
                  {selected ? <LuCheck size={14} strokeWidth={3} /> : null}
                </span>
                <span className={[styles.worksheetResolveChoiceIcon, choice.accent].join(' ')}>
                  <choice.Icon size={16} aria-hidden />
                </span>
                <span className={styles.worksheetResolveChoiceCopy}>
                  <span className={styles.worksheetResolveChoiceTitle}>{choice.title}</span>
                  <span className={styles.worksheetResolveChoiceBody}>{choice.description}</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className={styles.worksheetResolveDetailPanel} aria-live="polite">
          {resolution.kind === 'create_new' ? (
            <div className={styles.worksheetResolveDetailConfirm}>
              <p className={styles.worksheetResolveDetailTitle}>{copy.createDetailTitle}</p>
              <p className={styles.worksheetResolveDetailName}>{displayName}</p>
              <p className={styles.worksheetResolveDetailBody}>
                {copy.createDetailBody(displayName, activeConfig.dataRowCount)}
              </p>
            </div>
          ) : null}

          {resolution.kind === 'skip' ? (
            <div className={styles.worksheetResolveDetailConfirm}>
              <p className={styles.worksheetResolveDetailTitle}>{copy.skipDetailTitle}</p>
              <p className={styles.worksheetResolveDetailBody}>
                {copy.skipDetailBody(activeConfig.dataRowCount)}
              </p>
            </div>
          ) : null}

          {resolution.kind === 'attach_existing' && !pickingProject && selectedCandidate ? (
            <div className={styles.worksheetResolveDetailConfirm}>
              <p className={styles.worksheetResolveDetailTitle}>{copy.attachSelectedTitle}</p>
              <p className={styles.worksheetResolveDetailName}>{selectedCandidate.name}</p>
              <p className={styles.worksheetResolveDetailBody}>
                {[selectedCandidate.clientName, selectedCandidate.locationLabel]
                  .filter(Boolean)
                  .join(' · ')}
                {` · ${copy.attachSubprojectCount(selectedCandidate.subprojectCount)}`}
              </p>
              <button
                type="button"
                className={styles.secondaryButton}
                disabled={disabled}
                onClick={() => setPickingProject(true)}
              >
                {copy.attachChange}
              </button>
            </div>
          ) : null}

          {resolution.kind === 'attach_existing' &&
          (pickingProject || !resolution.existingProjectId) ? (
            <div className={styles.worksheetResolvePicker}>
              <p className={styles.worksheetResolveDetailTitle}>{copy.attachPickerLabel}</p>
              <label className={styles.worksheetResolvePickerSearch} htmlFor={`${rootId}-search`}>
                <LuSearch size={16} aria-hidden />
                <input
                  id={`${rootId}-search`}
                  type="search"
                  value={query}
                  disabled={disabled}
                  placeholder={chooseParent.searchPlaceholder}
                  aria-label={chooseParent.searchAriaLabel}
                  onChange={(event) => {
                    setQuery(event.target.value);
                    setVisibleLimit(CRM_IMPORT_PARENT_LIST_PAGE_SIZE);
                  }}
                />
              </label>
              <div className={styles.worksheetResolvePickerList} role="listbox">
                {emptyKind === 'no_eligible' ? (
                  <p className={styles.worksheetResolvePickerEmpty}>{chooseParent.noEligibleTitle}</p>
                ) : null}
                {emptyKind === 'no_search_results' ? (
                  <p className={styles.worksheetResolvePickerEmpty}>{chooseParent.noResultsTitle}</p>
                ) : null}
                {paged.visible.map((candidate) => {
                  const selected = candidate.id === resolution.existingProjectId;
                  const suggested =
                    normalizeImportText(candidate.name) ===
                    normalizeImportText(activeConfig.projectName);
                  return (
                    <button
                      key={candidate.id}
                      type="button"
                      role="option"
                      aria-selected={selected}
                      disabled={disabled}
                      className={chooseParentRowClassName({
                        selected,
                        styles: {
                          row: styles.worksheetResolvePickerRow,
                          selected: styles.worksheetResolvePickerRowSelected,
                        },
                      })}
                      onClick={() => {
                        onChangeResolutions(
                          updateWorksheetResolutionAttach(
                            resolutions,
                            activeId,
                            candidate.id,
                            candidate.name
                          )
                        );
                        setPickingProject(false);
                      }}
                    >
                      <span className={styles.worksheetResolvePickerRowMain}>
                        <strong>
                          {candidate.name}
                          {suggested ? (
                            <span className={styles.worksheetResolvePickerSuggested}>
                              {' '}
                              suggested
                            </span>
                          ) : null}
                        </strong>
                        <span>
                          {[candidate.clientName, candidate.locationLabel]
                            .filter(Boolean)
                            .join(' · ') || '—'}
                        </span>
                      </span>
                      <span className={styles.worksheetResolvePickerRowMeta}>
                        {copy.attachSubprojectCount(candidate.subprojectCount)}
                      </span>
                    </button>
                  );
                })}
              </div>
              {paged.remainingCount > 0 ? (
                <button
                  type="button"
                  className={styles.secondaryButton}
                  disabled={disabled}
                  onClick={() => setVisibleLimit((limit) => nextChooseParentVisibleLimit(limit))}
                >
                  {chooseParent.showMore(paged.remainingCount)}
                </button>
              ) : null}
            </div>
          ) : null}

          {resolution.kind !== 'create_new' &&
          resolution.kind !== 'skip' &&
          !(resolution.kind === 'attach_existing') ? (
            <p className={styles.worksheetResolveDetailBody}>{copy.detailEmpty}</p>
          ) : null}

          {showValidation && validationCode !== 'ok' ? (
            <p className={styles.worksheetResolveValidation} role="alert">
              {validationMessage(validationCode, copy, activeConfig.projectName)}
            </p>
          ) : null}
        </div>

        <div className={styles.worksheetResolveFocusActions}>
          <span className={styles.worksheetResolveFocusPosition}>
            {copy.worksheetPosition(index + 1, included.length)}
          </span>
          <div className={styles.worksheetResolveFocusActionButtons}>
            <button
              type="button"
              className={styles.secondaryButton}
              disabled={disabled || isFirstWorksheet}
              onClick={onPrevious}
            >
              {copy.previousWorksheet}
            </button>
            <button
              type="button"
              className={styles.primaryButton}
              disabled={disabled}
              aria-disabled={!canSave}
              title={!canSave ? copy.continueBlockedAria : undefined}
              onClick={() => {
                if (!canSave) {
                  setShowValidation(true);
                  return;
                }
                onSaveAndContinue();
              }}
            >
              {isLastWorksheet ? copy.saveAndReview : copy.saveAndContinue}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
