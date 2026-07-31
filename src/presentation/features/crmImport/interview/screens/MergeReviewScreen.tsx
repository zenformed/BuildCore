'use client';

import { useEffect, useMemo, useState, type ReactElement } from 'react';
import { LuArrowRight, LuBuilding2, LuCheck, LuChevronLeft, LuChevronRight, LuFileSpreadsheet } from 'react-icons/lu';
import type { CrmDuplicateCandidate } from '@/domain/crm/identity';
import type { ImportDuplicateReviewItem } from '@/domain/crm/importDuplicateDecisions';
import {
  replaceMergeReviewField,
  resolveContactCollectionResult,
  resolveCustomResult,
  resolveFilesResult,
  resolveNotesResult,
  resolveScalarResult,
  setContactCollectionPrimary,
  toggleContactCollectionOption,
  type ImportMergeContactOption,
  type ImportMergeDecisionMap,
  type ImportMergeFieldContactCollection,
  type ImportMergeFieldCustom,
  type ImportMergeFieldNotes,
  type ImportMergeFieldScalar,
  type ImportMergeFieldState,
  type ImportMergeGroupDecision,
  type ImportMergeMultiValue,
  type ImportMergeRecordAction,
} from '@/domain/crm/importMergeReview';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import sharedStyles from '@/presentation/components/crmShared/crmShared.module.css';
import {
  ensureMergeGroupDecision,
  hiddenCustomFieldCount,
  identicalMergeFieldCount,
  resolveMergeReviewCandidate,
  visibleMergeReviewFields,
  type MergeReviewFieldLabels,
} from '@/presentation/features/crmImport/interview/mergeReviewPresentation';
import { reviewItemIdentifier } from '@/presentation/features/crmImport/interview/duplicateReviewTablePresentation';
import styles from './MergeReviewScreen.module.css';

type MergeReviewCopy = (typeof content.crm.spreadsheetImport.interview)['mergeReview'];

function fieldLabelsFromCopy(copy: MergeReviewCopy): MergeReviewFieldLabels {
  return {
    name: copy.fieldName,
    contact: copy.fieldContact,
    email: copy.fieldEmail,
    phone: copy.fieldPhone,
    address: copy.fieldAddress,
    stage: copy.fieldStage,
    notes: copy.fieldNotes,
    photos: copy.fieldPhotos,
    documents: copy.fieldDocuments,
  };
}

function ValueList({
  values,
  empty,
}: {
  readonly values: readonly ImportMergeMultiValue[] | readonly string[];
  readonly empty: string;
}): ReactElement {
  if (values.length === 0) {
    return <span className={styles.emptyDash}>{empty}</span>;
  }
  return (
    <ul className={styles.valueList}>
      {values.map((entry) => {
        const value = typeof entry === 'string' ? entry : entry.value;
        const isPrimary = typeof entry === 'string' ? false : entry.isPrimary;
        return (
          <li key={value}>
            <span>{value}</span>
            {isPrimary ? <span className={styles.primaryPill}>Primary</span> : null}
          </li>
        );
      })}
    </ul>
  );
}

function SideContactValues({
  options,
  side,
  empty,
}: {
  readonly options: readonly ImportMergeContactOption[];
  readonly side: 'existing' | 'imported';
  readonly empty: string;
}): ReactElement {
  const values = options
    .filter((option) => (side === 'existing' ? option.fromExisting : option.fromImported))
    .map((option) => option.value);
  return <ValueList values={values} empty={empty} />;
}

function FinalResultCell({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldState;
  readonly copy: MergeReviewCopy;
  readonly disabled?: boolean;
  readonly onChange?: (next: ImportMergeFieldState) => void;
}): ReactElement {
  if (field.kind === 'identical') {
    return <span className={styles.resultValue}>{field.value}</span>;
  }
  if (field.kind === 'scalar') {
    const value = resolveScalarResult(field);
    if (field.fieldKey === 'stage') {
      return <span className={`${sharedStyles.stagePill} ${styles.resultStage}`}>{value}</span>;
    }
    return <span className={styles.resultValue}>{value}</span>;
  }
  if (field.kind === 'contact_collection') {
    const selected = resolveContactCollectionResult(field);
    if (selected.length === 0) {
      return <span className={styles.emptyDash}>{copy.emptyValue}</span>;
    }
    return (
      <ul className={styles.resultContactList}>
        {selected.map((entry) => (
          <li key={entry.value}>
            <label className={styles.resultPrimaryOption}>
              <input
                type="checkbox"
                checked={entry.isPrimary}
                disabled={disabled || onChange == null}
                aria-label={copy.choosePrimary}
                onChange={(event) => {
                  if (onChange == null) return;
                  if (!event.target.checked) return;
                  onChange(setContactCollectionPrimary(field, entry.value));
                }}
              />
              <span className={styles.resultValue}>{entry.value}</span>
              {entry.isPrimary ? (
                <span className={styles.primaryPill}>{copy.choosePrimary}</span>
              ) : null}
            </label>
          </li>
        ))}
      </ul>
    );
  }
  if (field.kind === 'notes') {
    const result = resolveNotesResult(field);
    return (
      <div className={styles.notesResult}>
        <span className={styles.resultValue}>{result}</span>
        {field.action === 'append' ? (
          <span className={styles.appendedTag}>{copy.notesAppendedTag}</span>
        ) : null}
      </div>
    );
  }
  if (field.kind === 'custom') {
    return <span className={styles.resultValue}>{resolveCustomResult(field)}</span>;
  }
  const total = resolveFilesResult(field);
  return (
    <span className={styles.resultValue}>
      {field.fieldKey === 'photos' ? copy.photosResult(total) : copy.documentsResult(total)}
    </span>
  );
}

function ScalarAction({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldScalar;
  readonly copy: MergeReviewCopy;
  readonly disabled: boolean;
  readonly onChange: (next: ImportMergeFieldScalar) => void;
}): ReactElement {
  const name = `scalar-${field.fieldKey}`;
  const useImportedLabel =
    field.fieldKey === 'stage'
      ? copy.actionUpdateStage(field.importedValue)
      : copy.actionReplaceImported;
  return (
    <fieldset className={styles.actionFieldset} disabled={disabled}>
      <legend className={styles.srOnly}>{field.label}</legend>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'keep_existing'}
          onChange={() => onChange({ ...field, action: 'keep_existing' })}
        />
        <span>{copy.actionKeepExisting}</span>
      </label>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'use_imported'}
          onChange={() => onChange({ ...field, action: 'use_imported' })}
        />
        <span>{useImportedLabel}</span>
      </label>
    </fieldset>
  );
}

function ContactCollectionAction({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldContactCollection;
  readonly copy: MergeReviewCopy;
  readonly disabled: boolean;
  readonly onChange: (next: ImportMergeFieldContactCollection) => void;
}): ReactElement {
  const selected = field.options.filter((option) => option.selected);
  return (
    <div className={styles.multiAction}>
      <p className={styles.mergeBadge}>{copy.actionMerged(selected.length)}</p>
      <div className={styles.optionChecks}>
        {field.options.map((option) => (
          <label key={option.normalizedKey} className={styles.actionOption}>
            <input
              type="checkbox"
              checked={option.selected}
              disabled={disabled}
              onChange={() =>
                onChange(toggleContactCollectionOption(field, option.normalizedKey))
              }
            />
            <span>{option.value}</span>
          </label>
        ))}
      </div>
      {field.requiresDecision ? (
        <p className={styles.fieldError}>
          {selected.length > field.maxSelected
            ? copy.contactLimitError(field.maxSelected)
            : copy.contactPrimaryRequired}
        </p>
      ) : null}
    </div>
  );
}

function NotesAction({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldNotes;
  readonly copy: MergeReviewCopy;
  readonly disabled: boolean;
  readonly onChange: (next: ImportMergeFieldNotes) => void;
}): ReactElement {
  const name = `notes-${field.fieldKey}`;
  return (
    <fieldset className={styles.actionFieldset} disabled={disabled}>
      <legend className={styles.srOnly}>{field.label}</legend>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'append'}
          onChange={() => onChange({ ...field, action: 'append' })}
        />
        <span>{copy.actionAppendNotes}</span>
      </label>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'replace'}
          onChange={() => onChange({ ...field, action: 'replace' })}
        />
        <span>{copy.actionReplaceNotes}</span>
      </label>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'keep_existing'}
          onChange={() => onChange({ ...field, action: 'keep_existing' })}
        />
        <span>{copy.actionKeepNotes}</span>
      </label>
    </fieldset>
  );
}

function CustomAction({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldCustom;
  readonly copy: MergeReviewCopy;
  readonly disabled: boolean;
  readonly onChange: (next: ImportMergeFieldCustom) => void;
}): ReactElement {
  const name = `custom-${field.fieldKey}`;
  return (
    <fieldset className={styles.actionFieldset} disabled={disabled}>
      <legend className={styles.srOnly}>{field.label}</legend>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'keep_existing'}
          onChange={() => onChange({ ...field, action: 'keep_existing' })}
        />
        <span>{copy.actionKeepExisting}</span>
      </label>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'use_imported'}
          onChange={() => onChange({ ...field, action: 'use_imported' })}
        />
        <span>{copy.actionReplaceImported}</span>
      </label>
      <label className={styles.actionOption}>
        <input
          type="radio"
          name={name}
          checked={field.action === 'ignore_imported'}
          onChange={() => onChange({ ...field, action: 'ignore_imported' })}
        />
        <span>{copy.actionIgnoreImported}</span>
      </label>
    </fieldset>
  );
}

function FieldActionCell({
  field,
  copy,
  disabled,
  onChange,
}: {
  readonly field: ImportMergeFieldState;
  readonly copy: MergeReviewCopy;
  readonly disabled: boolean;
  readonly onChange: (next: ImportMergeFieldState) => void;
}): ReactElement {
  if (field.kind === 'identical') {
    return (
      <span className={styles.sameAction}>
        <LuCheck size={14} aria-hidden /> {copy.sameNoAction}
      </span>
    );
  }
  if (field.kind === 'scalar') {
    return <ScalarAction field={field} copy={copy} disabled={disabled} onChange={onChange} />;
  }
  if (field.kind === 'contact_collection') {
    return (
      <ContactCollectionAction
        field={field}
        copy={copy}
        disabled={disabled}
        onChange={onChange}
      />
    );
  }
  if (field.kind === 'notes') {
    return <NotesAction field={field} copy={copy} disabled={disabled} onChange={onChange} />;
  }
  if (field.kind === 'custom') {
    return <CustomAction field={field} copy={copy} disabled={disabled} onChange={onChange} />;
  }
  return (
    <span className={styles.sameAction}>
      <LuCheck size={14} aria-hidden /> {copy.actionKeepBothFiles}
    </span>
  );
}

function ExistingOrImportedCell({
  field,
  side,
  copy,
}: {
  readonly field: ImportMergeFieldState;
  readonly side: 'existing' | 'imported';
  readonly copy: MergeReviewCopy;
}): ReactElement {
  if (field.kind === 'identical') {
    return <span>{field.value}</span>;
  }
  if (field.kind === 'scalar' || field.kind === 'custom') {
    const value = side === 'existing' ? field.existingValue : field.importedValue;
    if (field.kind === 'scalar' && field.fieldKey === 'stage' && value) {
      return <span className={sharedStyles.stagePill}>{value}</span>;
    }
    return <span>{value || copy.emptyValue}</span>;
  }
  if (field.kind === 'contact_collection') {
    return <SideContactValues options={field.options} side={side} empty={copy.emptyValue} />;
  }
  if (field.kind === 'notes') {
    const value = side === 'existing' ? field.existingValue : field.importedValue;
    return <span className={styles.notesPreview}>{value || copy.emptyValue}</span>;
  }
  const count = side === 'existing' ? field.existingCount : field.importedCount;
  return (
    <span>
      {field.fieldKey === 'photos' ? copy.photosCount(count) : copy.documentsCount(count)}
    </span>
  );
}

export type MergeReviewScreenProps = {
  readonly items: readonly ImportDuplicateReviewItem[];
  readonly decisions: ImportMergeDecisionMap;
  readonly disabled?: boolean;
  readonly onDecisionChange: (decision: ImportMergeGroupDecision) => void;
};

export function MergeReviewScreen({
  items,
  decisions,
  disabled = false,
  onDecisionChange,
}: MergeReviewScreenProps): ReactElement {
  const copy = content.crm.spreadsheetImport.interview.mergeReview;
  const labels = useMemo(() => fieldLabelsFromCopy(copy), [copy]);
  const [activeIndex, setActiveIndex] = useState(0);

  useEffect(() => {
    if (activeIndex > items.length - 1) {
      setActiveIndex(Math.max(0, items.length - 1));
    }
  }, [activeIndex, items.length]);

  const item = items[activeIndex] ?? null;
  const matchedId =
    item != null
      ? (decisions[item.incomingId]?.matchedRecordId ??
        item.existingCandidates[0]?.record.id ??
        '')
      : '';
  const candidate: CrmDuplicateCandidate | null =
    item != null ? resolveMergeReviewCandidate(item, matchedId || undefined) : null;

  const decision = useMemo(() => {
    if (item == null || candidate == null || !matchedId) return null;
    return ensureMergeGroupDecision({
      item,
      matchedRecordId: matchedId,
      candidate,
      existing: decisions[item.incomingId],
      labels,
    });
  }, [item, candidate, matchedId, decisions, labels]);

  useEffect(() => {
    if (decision == null) return;
    if (decisions[decision.incomingId] != null) return;
    onDecisionChange(decision);
  }, [decision, decisions, onDecisionChange]);

  if (item == null || candidate == null || decision == null) {
    return (
      <div className={styles.screen}>
        <p className={styles.emptyState}>{copy.emptyState}</p>
      </div>
    );
  }

  const record = candidate.record;
  const identifier = reviewItemIdentifier(item);
  const visibleFields = visibleMergeReviewFields(decision);
  const identicalCount = identicalMergeFieldCount(decision);
  const hiddenCustomCount = hiddenCustomFieldCount(decision);
  const showFieldTable = decision.recordAction === 'merge_into_existing';

  const updateDecision = (next: ImportMergeGroupDecision) => {
    onDecisionChange(next);
  };

  const setRecordAction = (recordAction: ImportMergeRecordAction) => {
    updateDecision({
      ...decision,
      recordAction,
      replaceConfirmed: recordAction === 'replace_existing' ? decision.replaceConfirmed : false,
    });
  };

  const updateField = (next: ImportMergeFieldState) => {
    updateDecision({
      ...decision,
      fields: replaceMergeReviewField(decision.fields, next),
    });
  };

  return (
    <div className={styles.screen}>
      <header className={styles.header}>
        <div className={styles.groupNav}>
          <p className={styles.groupLabel}>
            {copy.groupOf(activeIndex + 1, items.length)}
          </p>
          <div className={styles.groupNavButtons}>
            <button
              type="button"
              className={styles.navIconButton}
              disabled={disabled || activeIndex <= 0}
              aria-label={copy.previousGroup}
              onClick={() => setActiveIndex((value) => Math.max(0, value - 1))}
            >
              <LuChevronLeft size={18} aria-hidden />
            </button>
            <button
              type="button"
              className={styles.navIconButton}
              disabled={disabled || activeIndex >= items.length - 1}
              aria-label={copy.nextGroup}
              onClick={() =>
                setActiveIndex((value) => Math.min(items.length - 1, value + 1))
              }
            >
              <LuChevronRight size={18} aria-hidden />
            </button>
          </div>
        </div>
        <h2 className={styles.title}>{identifier}</h2>
        <p className={styles.hint}>{copy.hint}</p>
      </header>

      <section className={styles.comparePanel} aria-label={copy.compareAriaLabel}>
        <article className={styles.comparePane}>
          <div className={styles.comparePaneHeader}>
            <LuBuilding2 size={18} className={styles.existingIcon} aria-hidden />
            <div className={styles.comparePaneCopy}>
              <p className={styles.compareTitle}>{copy.existingRecordKept}</p>
              <p className={styles.compareDetail}>
                <span className={styles.compareType}>{copy.recordTypeLabel}:</span>{' '}
                <span className={styles.compareNameHighlight}>{record.name}</span>
                {record.stageLabel ? (
                  <>
                    <span className={styles.compareSep} aria-hidden>
                      •
                    </span>
                    <span className={`${sharedStyles.stagePill} ${styles.compareStage}`}>
                      {record.stageLabel}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
            <LuArrowRight size={16} className={styles.compareFlowArrow} aria-hidden />
          </div>
        </article>

        <article className={styles.comparePane}>
          <div className={styles.comparePaneHeader}>
            <LuFileSpreadsheet size={18} className={styles.importedIcon} aria-hidden />
            <div className={styles.comparePaneCopy}>
              <p className={styles.compareTitle}>{copy.importedRecord}</p>
              <p className={styles.compareDetail}>
                <span className={styles.compareType}>{copy.recordTypeLabel}:</span>{' '}
                <span className={styles.compareNameHighlight}>{item.name}</span>
                {item.stage ? (
                  <>
                    <span className={styles.compareSep} aria-hidden>
                      •
                    </span>
                    <span className={`${sharedStyles.stagePill} ${styles.compareStage}`}>
                      {item.stage}
                    </span>
                  </>
                ) : null}
              </p>
            </div>
          </div>
        </article>

        <fieldset className={styles.recordActions} disabled={disabled}>
          <legend className={styles.recordActionsLegend}>{copy.whatShouldHappen}</legend>
          <p className={styles.recordActionsHint}>{copy.mergeDecisionHint}</p>
          <label className={styles.recordActionOption}>
            <input
              type="radio"
              name={`record-action-${item.incomingId}`}
              checked={decision.recordAction === 'merge_into_existing'}
              onChange={() => setRecordAction('merge_into_existing')}
            />
            <span>
              {copy.actionMergeIntoExisting}
              <span className={styles.recommended}>{copy.recommended}</span>
            </span>
          </label>
          <label className={styles.recordActionOption}>
            <input
              type="radio"
              name={`record-action-${item.incomingId}`}
              checked={decision.recordAction === 'keep_both'}
              onChange={() => setRecordAction('keep_both')}
            />
            <span>{copy.actionKeepBoth}</span>
          </label>
          <label className={styles.recordActionOption}>
            <input
              type="radio"
              name={`record-action-${item.incomingId}`}
              checked={decision.recordAction === 'replace_existing'}
              onChange={() => setRecordAction('replace_existing')}
            />
            <span>{copy.actionReplaceExisting}</span>
          </label>
        </fieldset>
      </section>

      {decision.recordAction === 'keep_both' ? (
        <p className={styles.branchNotice}>{copy.keepBothNotice}</p>
      ) : null}

      {decision.recordAction === 'replace_existing' ? (
        <div className={styles.replaceConfirm}>
          <p className={styles.branchNotice}>{copy.replaceNotice}</p>
          <label className={styles.replaceConfirmLabel}>
            <input
              type="checkbox"
              checked={decision.replaceConfirmed}
              disabled={disabled}
              onChange={(event) =>
                updateDecision({
                  ...decision,
                  replaceConfirmed: event.target.checked,
                })
              }
            />
            <span>{copy.replaceConfirmLabel}</span>
          </label>
        </div>
      ) : null}

      {showFieldTable ? (
        <>
          {identicalCount > 0 ? (
            <button
              type="button"
              className={styles.toggleIdentical}
              disabled={disabled}
              onClick={() =>
                updateDecision({
                  ...decision,
                  showIdenticalFields: !decision.showIdenticalFields,
                })
              }
            >
              {decision.showIdenticalFields
                ? copy.hideIdenticalFields(identicalCount)
                : copy.showIdenticalFields(identicalCount)}
            </button>
          ) : null}

          <div className={styles.tableWrap}>
            <table className={styles.table} aria-label={copy.tableAriaLabel}>
              <thead>
                <tr>
                  <th scope="col">{copy.colField}</th>
                  <th scope="col">{copy.colExisting}</th>
                  <th scope="col">{copy.colImported}</th>
                  <th scope="col">{copy.colAction}</th>
                  <th scope="col">
                    <span className={styles.resultHeader}>
                      {copy.colResult}
                      <span className={styles.livePill}>{copy.liveBadge}</span>
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {visibleFields.map((field) => (
                  <tr
                    key={field.fieldKey}
                    className={
                      field.kind === 'identical' ? styles.identicalRow : styles.decisionRow
                    }
                  >
                    <td data-label={copy.colField}>
                      <strong>{field.label}</strong>
                    </td>
                    <td data-label={copy.colExisting}>
                      <ExistingOrImportedCell field={field} side="existing" copy={copy} />
                    </td>
                    <td data-label={copy.colImported}>
                      <ExistingOrImportedCell field={field} side="imported" copy={copy} />
                    </td>
                    <td data-label={copy.colAction}>
                      <FieldActionCell
                        field={field}
                        copy={copy}
                        disabled={disabled}
                        onChange={updateField}
                      />
                    </td>
                    <td data-label={copy.colResult} className={styles.resultCell}>
                      <FinalResultCell
                        field={field}
                        copy={copy}
                        disabled={disabled}
                        onChange={updateField}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {hiddenCustomCount > 0 ? (
            <button
              type="button"
              className={styles.toggleIdentical}
              disabled={disabled}
              onClick={() =>
                updateDecision({
                  ...decision,
                  showAllCustomFields: true,
                })
              }
            >
              {copy.showMoreCustomFields(hiddenCustomCount)}
            </button>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
