'use client';

import { useEffect, useMemo, useRef, useState, type ReactElement, type ReactNode } from 'react';
import {
  LuCircleCheck,
  LuCircleDollarSign,
  LuLightbulb,
  LuMail,
  LuMapPin,
  LuPhone,
  LuSparkles,
  LuStickyNote,
  LuTable2,
  LuTag,
  LuUser,
  LuUserRoundCheck,
} from 'react-icons/lu';
import type { CrmImportMode } from '@/domain/crm/spreadsheetImportTypes';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import type { ExistingCustomFieldDefinition } from '@/presentation/features/crmImport/suggestColumnMappings';
import type {
  CrmImportFieldPlacement,
  CrmImportRemainingFieldDraft,
} from '@/presentation/features/crmImport/interview/interviewState';
import {
  UNSET_DESTINATION_KEY,
  buildFieldsDestinationGroups,
  disableFieldForImport,
  enableFieldForImport,
  fieldNeedsDestinationAttention,
  fieldsMappingSummary,
  fieldsRowClassName,
  iconForDestinationKey,
  isDestinationTakenByOtherRow,
  isRemainingFieldEnabled,
  resolveFieldsSelectValue,
  shouldConfirmAutoMatch,
  type FieldsDestinationOption,
} from '@/presentation/features/crmImport/interview/fieldsPresentation';
import styles from '@/presentation/components/CrmImport/SpreadsheetImportWizard.module.css';

export { LOCKED_STANDARD_KEYS } from '@/presentation/features/crmImport/interview/fieldsPresentation';

export type FieldsScreenProps = {
  readonly effectiveMode: CrmImportMode;
  readonly headers: readonly string[];
  readonly remainingIndexes: readonly number[];
  readonly fields: readonly CrmImportRemainingFieldDraft[];
  readonly lockedHeaders: readonly string[];
  readonly sampleValuesByIndex?: ReadonlyMap<number, readonly string[]>;
  readonly existingCustomFields: readonly ExistingCustomFieldDefinition[];
  readonly disabled?: boolean;
  readonly contactPrompt?: {
    readonly firstHeader: string;
    readonly lastHeader: string;
    readonly sampleName: string;
  } | null;
  readonly onCombineContact?: () => void;
  readonly onKeepContactSeparate?: () => void;
  readonly suggestedFields: readonly CrmImportRemainingFieldDraft[];
  readonly onReplaceFields: (next: readonly CrmImportRemainingFieldDraft[]) => void;
  readonly onFieldChange: (
    sourceIndex: number,
    next: { readonly destinationKey: string; readonly placement: CrmImportFieldPlacement }
  ) => void;
};

function DestinationIcon({
  icon,
}: {
  readonly icon: FieldsDestinationOption['icon'];
}): ReactElement | null {
  const size = 14;
  switch (icon) {
    case 'user':
      return <LuUser size={size} aria-hidden />;
    case 'mail':
      return <LuMail size={size} aria-hidden />;
    case 'phone':
      return <LuPhone size={size} aria-hidden />;
    case 'pin':
      return <LuMapPin size={size} aria-hidden />;
    case 'note':
      return <LuStickyNote size={size} aria-hidden />;
    case 'money':
      return <LuCircleDollarSign size={size} aria-hidden />;
    case 'assignee':
      return <LuUserRoundCheck size={size} aria-hidden />;
    case 'custom':
      return <LuTag size={size} aria-hidden />;
    default:
      return null;
  }
}

function formatSamples(samples: readonly string[]): ReactNode {
  const sample = samples[0];
  if (!sample) return <span className={styles.fieldsSampleEmpty}>—</span>;
  return (
    <span className={styles.fieldsSampleValue} title={sample}>
      {sample}
    </span>
  );
}

export function FieldsScreen({
  effectiveMode,
  headers,
  remainingIndexes,
  fields,
  lockedHeaders,
  sampleValuesByIndex,
  existingCustomFields,
  disabled = false,
  contactPrompt = null,
  onCombineContact,
  onKeepContactSeparate,
  suggestedFields,
  onReplaceFields,
  onFieldChange,
}: FieldsScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport;
  const screenCopy = copy.interview.fields;
  const draftByIndex = useMemo(
    () => new Map(fields.map((field) => [field.sourceIndex, field])),
    [fields]
  );
  const rememberedRef = useRef(
    new Map<number, { destinationKey: string; placement: CrmImportFieldPlacement }>()
  );
  const [confirmAutoMatch, setConfirmAutoMatch] = useState(false);

  const groups = useMemo(
    () =>
      buildFieldsDestinationGroups({
        mode: effectiveMode,
        existingCustomFields,
        labels: {
          standardFields: copy.standardFields as Record<string, string>,
          contactGroup: screenCopy.groupContact,
          subprojectGroup: screenCopy.groupSubproject,
          projectGroup: screenCopy.groupProject,
          customGroup: screenCopy.groupCustom,
          newCustomField: copy.destinations.newCustomFieldSubproject,
          chooseDestination: screenCopy.chooseDestination,
        },
      }),
    [effectiveMode, existingCustomFields, copy.standardFields, copy.destinations, screenCopy]
  );

  const visibleFields = useMemo(
    () =>
      remainingIndexes.map(
        (sourceIndex) =>
          draftByIndex.get(sourceIndex) ?? {
            sourceIndex,
            destinationKey: UNSET_DESTINATION_KEY,
            placement: 'subproject' as const,
          }
      ),
    [remainingIndexes, draftByIndex]
  );

  const summary = fieldsMappingSummary(visibleFields, groups);

  // Heal stale destination keys that no longer appear in the dropdown (orphaned
  // custom fields, project-scoped keys in one-project mode, etc.).
  useEffect(() => {
    for (const draft of visibleFields) {
      if (!isRemainingFieldEnabled(draft)) continue;
      if (!fieldNeedsDestinationAttention(draft, groups)) continue;
      if (draft.destinationKey === UNSET_DESTINATION_KEY || draft.destinationKey === '') continue;
      onFieldChange(draft.sourceIndex, {
        destinationKey: UNSET_DESTINATION_KEY,
        placement: 'subproject',
      });
    }
  }, [visibleFields, groups, onFieldChange]);

  const applyAutoMatch = () => {
    onReplaceFields(suggestedFields);
    setConfirmAutoMatch(false);
  };

  const requestAutoMatch = () => {
    if (disabled) return;
    if (shouldConfirmAutoMatch({ current: visibleFields, suggested: suggestedFields })) {
      setConfirmAutoMatch(true);
      return;
    }
    applyAutoMatch();
  };

  const toggleEnabled = (sourceIndex: number) => {
    if (disabled) return;
    const draft =
      draftByIndex.get(sourceIndex) ??
      ({
        sourceIndex,
        destinationKey: UNSET_DESTINATION_KEY,
        placement: 'subproject' as const,
      } satisfies CrmImportRemainingFieldDraft);
    if (isRemainingFieldEnabled(draft)) {
      if (draft.destinationKey !== 'ignored' && draft.destinationKey !== UNSET_DESTINATION_KEY) {
        rememberedRef.current.set(sourceIndex, {
          destinationKey: draft.destinationKey,
          placement: draft.placement,
        });
      }
      const next = disableFieldForImport(draft);
      onFieldChange(sourceIndex, {
        destinationKey: next.destinationKey,
        placement: next.placement,
      });
      return;
    }
    const next = enableFieldForImport(draft, rememberedRef.current.get(sourceIndex) ?? null);
    onFieldChange(sourceIndex, {
      destinationKey: next.destinationKey,
      placement: next.placement,
    });
  };

  const changeDestination = (sourceIndex: number, destinationKey: string) => {
    if (disabled) return;
    if (
      isDestinationTakenByOtherRow({
        fields: visibleFields,
        sourceIndex,
        destinationKey,
      })
    ) {
      return;
    }
    const placement: CrmImportFieldPlacement = destinationKey.startsWith('standard:project:')
      ? 'project'
      : 'subproject';
    onFieldChange(sourceIndex, { destinationKey, placement });
  };

  if (remainingIndexes.length === 0) {
    return (
      <div className={styles.fieldsScreen}>
        <div className={styles.fieldsIntro}>
          <span className={styles.fieldsIntroIcon} aria-hidden>
            <LuTable2 size={20} />
          </span>
          <div>
            <h2 className={styles.fieldsHeading}>{screenCopy.heading}</h2>
            <p className={styles.fieldsSubheading}>{screenCopy.subheading}</p>
          </div>
        </div>
        <div className={styles.fieldsEmptyState}>
          <p className={styles.fieldsEmptyTitle}>{screenCopy.allConfiguredTitle}</p>
          <p className={styles.fieldsEmptyBody}>{screenCopy.allConfiguredBody}</p>
          {lockedHeaders.length > 0 ? (
            <p className={styles.fieldsLockedNote}>
              {screenCopy.alreadyUsedLabel}: {lockedHeaders.join(', ')}
            </p>
          ) : null}
        </div>
      </div>
    );
  }

  return (
    <div className={styles.fieldsScreen}>
      <div className={styles.fieldsIntroRow}>
        <div className={styles.fieldsIntro}>
          <span className={styles.fieldsIntroIcon} aria-hidden>
            <LuTable2 size={20} />
          </span>
          <div>
            <h2 className={styles.fieldsHeading}>{screenCopy.heading}</h2>
            <p className={styles.fieldsSubheading}>{screenCopy.subheading}</p>
          </div>
        </div>
        <button
          type="button"
          className={styles.fieldsAutoMatchButton}
          disabled={disabled}
          onClick={requestAutoMatch}
        >
          <LuSparkles size={16} aria-hidden />
          {screenCopy.autoMatch}
        </button>
      </div>

      {contactPrompt != null ? (
        <div className={styles.fieldsContactBanner} role="region" aria-label={screenCopy.contactRecommendation}>
          <div className={styles.fieldsContactBannerBody}>
            <p className={styles.fieldsContactEyebrow}>{screenCopy.contactRecommendation}</p>
            <p className={styles.fieldsContactQuestion}>
              {screenCopy.contactQuestion(contactPrompt.firstHeader, contactPrompt.lastHeader)}
            </p>
            <p className={styles.fieldsContactSample}>
              {screenCopy.contactSampleLabel}{' '}
              <strong>{contactPrompt.sampleName}</strong>
            </p>
          </div>
          <div className={styles.fieldsContactActions}>
            <button
              type="button"
              className={styles.fieldsContactSecondary}
              disabled={disabled}
              onClick={onKeepContactSeparate}
            >
              {content.crm.spreadsheetImport.interview.contactPrompt.decline}
            </button>
            <button
              type="button"
              className={styles.fieldsContactPrimary}
              disabled={disabled}
              onClick={onCombineContact}
            >
              {content.crm.spreadsheetImport.interview.contactPrompt.accept}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.fieldsTip}>
        <LuLightbulb className={styles.fieldsTipIcon} size={16} aria-hidden />
        <p className={styles.fieldsTipText}>{screenCopy.tip}</p>
      </div>

      {confirmAutoMatch ? (
        <div className={styles.fieldsConfirmBanner} role="alertdialog" aria-label={screenCopy.autoMatchConfirmTitle}>
          <div>
            <p className={styles.fieldsConfirmTitle}>{screenCopy.autoMatchConfirmTitle}</p>
            <p className={styles.fieldsConfirmBody}>{screenCopy.autoMatchConfirmBody}</p>
          </div>
          <div className={styles.fieldsConfirmActions}>
            <button
              type="button"
              className={styles.fieldsContactSecondary}
              onClick={() => setConfirmAutoMatch(false)}
            >
              {screenCopy.autoMatchCancel}
            </button>
            <button type="button" className={styles.fieldsContactPrimary} onClick={applyAutoMatch}>
              {screenCopy.autoMatchReplace}
            </button>
          </div>
        </div>
      ) : null}

      <div className={styles.fieldsTableWrap}>
        <table className={styles.fieldsTable}>
          <thead>
            <tr>
              <th scope="col" className={styles.fieldsColUse}>
                {screenCopy.useHeader}
              </th>
              <th scope="col" className={styles.fieldsColColumn}>
                {screenCopy.columnHeader}
              </th>
              <th scope="col" className={styles.fieldsColSample}>
                {screenCopy.sampleHeader}
              </th>
              <th scope="col" className={styles.fieldsColDestination}>
                {screenCopy.destinationHeader}
              </th>
            </tr>
          </thead>
          <tbody>
            {visibleFields.map((draft) => {
              const header = headers[draft.sourceIndex] ?? `Column ${draft.sourceIndex + 1}`;
              const enabled = isRemainingFieldEnabled(draft);
              const needsAttention = fieldNeedsDestinationAttention(draft, groups);
              const samples = sampleValuesByIndex?.get(draft.sourceIndex) ?? [];
              const selectValue = resolveFieldsSelectValue(draft, groups);
              const selectedIcon = enabled
                ? iconForDestinationKey(
                    needsAttention ? UNSET_DESTINATION_KEY : draft.destinationKey,
                    groups
                  )
                : 'none';

              return (
                <tr
                  key={draft.sourceIndex}
                  className={fieldsRowClassName({
                    enabled,
                    needsAttention,
                    styles: {
                      row: styles.fieldsRow,
                      muted: styles.fieldsRowMuted,
                      attention: styles.fieldsRowAttention,
                    },
                  })}
                >
                  <td className={styles.fieldsColUse}>
                    <label className={styles.fieldsUseLabel}>
                      <span className={styles.srOnly}>{screenCopy.importAria(header)}</span>
                      <input
                        type="checkbox"
                        className={styles.fieldsUseCheckbox}
                        checked={enabled}
                        disabled={disabled}
                        onChange={() => toggleEnabled(draft.sourceIndex)}
                      />
                    </label>
                  </td>
                  <td className={styles.fieldsColColumn}>
                    <span className={styles.fieldsColumnName}>{header}</span>
                  </td>
                  <td className={styles.fieldsColSample} data-label={screenCopy.sampleHeader}>
                    <div className={styles.fieldsSampleList}>{formatSamples(samples)}</div>
                  </td>
                  <td className={styles.fieldsColDestination} data-label={screenCopy.destinationHeader}>
                    <div className={styles.fieldsDestinationControl}>
                      <span className={styles.fieldsDestinationIcon} aria-hidden>
                        <DestinationIcon icon={selectedIcon} />
                      </span>
                      <label className={styles.srOnly} htmlFor={`field-dest-${draft.sourceIndex}`}>
                        {screenCopy.destinationAria(header)}
                      </label>
                      <select
                        id={`field-dest-${draft.sourceIndex}`}
                        className={styles.fieldsDestinationSelect}
                        value={selectValue}
                        disabled={disabled || !enabled}
                        onClick={(event) => event.stopPropagation()}
                        onMouseDown={(event) => event.stopPropagation()}
                        onChange={(event) => changeDestination(draft.sourceIndex, event.target.value)}
                      >
                        {enabled ? (
                          <>
                            <option value={UNSET_DESTINATION_KEY}>{screenCopy.chooseDestination}</option>
                            {groups.map((group) => (
                              <optgroup key={group.id} label={group.label}>
                                {group.options.map((option) => {
                                  const taken = isDestinationTakenByOtherRow({
                                    fields: visibleFields,
                                    sourceIndex: draft.sourceIndex,
                                    destinationKey: option.value,
                                  });
                                  return (
                                    <option
                                      key={option.value}
                                      value={option.value}
                                      disabled={taken}
                                    >
                                      {taken
                                        ? `${option.label} (${screenCopy.alreadyUsedDestination})`
                                        : option.label}
                                    </option>
                                  );
                                })}
                              </optgroup>
                            ))}
                          </>
                        ) : (
                          <option value="ignored">{screenCopy.ignoredStatus}</option>
                        )}
                      </select>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div
        className={[
          styles.fieldsSummaryBar,
          summary.needsAttentionCount > 0
            ? styles.fieldsSummaryBarWarning
            : summary.enabledCount === 0
              ? styles.fieldsSummaryBarMuted
              : styles.fieldsSummaryBarSuccess,
        ].join(' ')}
        aria-live="polite"
      >
        <div className={styles.fieldsSummaryLeft}>
          <LuCircleCheck size={16} aria-hidden />
          <span>
            {summary.needsAttentionCount > 0
              ? screenCopy.needsAttention(summary.needsAttentionCount)
              : summary.enabledCount === 0
                ? screenCopy.noneWillImport
                : screenCopy.willImport(summary.enabledCount, summary.total)}
          </span>
        </div>
        <span className={styles.fieldsSummaryRight}>{screenCopy.summaryHint}</span>
      </div>
    </div>
  );
}
