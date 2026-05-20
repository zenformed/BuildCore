'use client';

import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  DEFAULT_PIPELINE_STAGES,
  projectHasPaymentMilestones,
  type CrmPriority,
  type CrmProjectDetail,
  type PipelineStageSlug,
} from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatPhoneDisplay,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { centsToUsdInput } from '@/presentation/features/crmProjectDetail/workflowTaskFormModel';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

const PRIORITY_OPTIONS: readonly CrmPriority[] = ['low', 'normal', 'high', 'urgent'];

function priorityClass(priority: string): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

type SummaryMetricProps = {
  label: string;
  fieldKey?: SummaryEditableField;
  savingField: SummaryEditableField | null;
  children: ReactNode;
};

function SummaryMetric({
  label,
  fieldKey,
  savingField,
  children,
}: SummaryMetricProps): ReactElement {
  const isSaving = fieldKey != null && savingField === fieldKey;

  return (
    <div
      className={`${styles.summaryMetric}${isSaving ? ` ${styles.summaryMetric_saving}` : ''}`}
      role="group"
      aria-label={label}
      aria-busy={isSaving || undefined}
    >
      <div className={styles.summaryValue}>{children}</div>
      <span className={styles.summaryLabel}>
        {label}
        {isSaving ? <span className={styles.summarySavingHint}> · Saving…</span> : null}
      </span>
    </div>
  );
}

type SummaryInlineTextProps = {
  fieldKey: SummaryEditableField;
  label: string;
  value: string;
  /** When set, shown in read mode (e.g. currency formatting); `value` is still used while editing. */
  displayValue?: string;
  savingField: SummaryEditableField | null;
  disabled?: boolean;
  inputType?: 'text' | 'email' | 'tel';
  displayClassName?: string;
  onPatch: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

function SummaryInlineText({
  fieldKey,
  label,
  value,
  displayValue,
  savingField,
  disabled = false,
  inputType = 'text',
  displayClassName = styles.summaryText,
  onPatch,
}: SummaryInlineTextProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSaving = savingField === fieldKey;

  useEffect(() => {
    if (!editing) setDraft(value);
  }, [editing, value]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  const cancel = useCallback(() => {
    setDraft(value);
    setEditing(false);
  }, [value]);

  const save = useCallback(async () => {
    const next = draft.trim();
    setEditing(false);
    if (next === value.trim()) {
      setDraft(value);
      return;
    }
    const ok = await onPatch(fieldKey, draft);
    if (!ok) setDraft(value);
  }, [draft, fieldKey, onPatch, value]);

  const onKeyDown = useCallback(
    (e: KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        void save();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        cancel();
      }
    },
    [cancel, save]
  );

  const displayText = (displayValue ?? value) || '—';

  return (
    <SummaryMetric label={label} fieldKey={fieldKey} savingField={savingField}>
      <div className={styles.summaryValueSlot}>
        <span className={styles.summaryInlineGhost} aria-hidden>
          {displayText}
        </span>
        {editing ? (
          <input
            ref={inputRef}
            type={inputType}
            className={styles.summaryInlineInputOverlay}
            value={draft}
            disabled={isSaving}
            aria-label={label}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={() => void save()}
            onKeyDown={onKeyDown}
          />
        ) : (
          <button
            type="button"
            className={`${styles.summaryInlineDisplayOverlay} ${displayClassName}`}
            disabled={disabled || isSaving}
            onClick={() => setEditing(true)}
          >
            {displayText}
          </button>
        )}
      </div>
    </SummaryMetric>
  );
}

type SummaryInlineSelectProps = {
  fieldKey: 'currentStageSlug' | 'priority';
  label: string;
  value: string;
  savingField: SummaryEditableField | null;
  options: readonly { value: string; label: string }[];
  renderValue: (value: string) => ReactNode;
  onPatch: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

function SummaryInlineSelect({
  fieldKey,
  label,
  value,
  savingField,
  options,
  renderValue,
  onPatch,
}: SummaryInlineSelectProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const selectRef = useRef<HTMLSelectElement>(null);
  const isSaving = savingField === fieldKey;

  useEffect(() => {
    if (editing) selectRef.current?.focus();
  }, [editing]);

  const onChange = useCallback(
    async (next: string) => {
      setEditing(false);
      if (next === value) return;
      await onPatch(fieldKey, next);
    },
    [fieldKey, onPatch, value]
  );

  const displayNode = renderValue(value);

  return (
    <SummaryMetric label={label} fieldKey={fieldKey} savingField={savingField}>
      <div className={styles.summaryValueSlot}>
        <span className={styles.summaryInlineGhost} aria-hidden>
          {displayNode}
        </span>
        {editing ? (
          <select
            ref={selectRef}
            className={styles.summaryInlineSelectOverlay}
            value={value}
            disabled={isSaving}
            aria-label={label}
            onChange={(e) => void onChange(e.target.value)}
            onBlur={() => setEditing(false)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') {
                e.preventDefault();
                setEditing(false);
              }
            }}
          >
            {options.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        ) : (
          <button
            type="button"
            className={styles.summaryInlineDisplayOverlay}
            disabled={isSaving}
            onClick={() => setEditing(true)}
          >
            {displayNode}
          </button>
        )}
      </div>
    </SummaryMetric>
  );
}

export type ProjectSummaryStripProps = {
  project: CrmProjectDetail;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

export function ProjectSummaryStrip({
  project,
  savingField,
  patchField,
}: ProjectSummaryStripProps): ReactElement {
  const { summary } = project;
  const fields = content.projectDetail.fields;
  const edit = content.projectDetail.edit;
  const hasPaymentMilestones = projectHasPaymentMilestones(project);

  const stageOptions = DEFAULT_PIPELINE_STAGES.map((stage) => ({
    value: stage.slug,
    label: stage.label,
  }));

  const priorityOptions = PRIORITY_OPTIONS.map((p) => ({
    value: p,
    label: p,
  }));

  return (
    <section className={styles.summaryStrip} aria-label="Project summary">
      <SummaryInlineText
        fieldKey="name"
        label={fields.customer}
        value={summary.name}
        savingField={savingField}
        onPatch={patchField}
      />
      <SummaryInlineText
        fieldKey="contactName"
        label={fields.contact}
        value={summary.contact.name}
        savingField={savingField}
        onPatch={patchField}
      />
      <SummaryInlineText
        fieldKey="email"
        label={fields.email}
        value={summary.contact.email}
        savingField={savingField}
        inputType="email"
        displayClassName={styles.summaryLink}
        onPatch={patchField}
      />
      <SummaryInlineText
        fieldKey="phone"
        label={fields.phone}
        value={summary.contact.phone}
        displayValue={formatPhoneDisplay(summary.contact.phone)}
        savingField={savingField}
        inputType="tel"
        displayClassName={styles.summaryLink}
        onPatch={patchField}
      />
      <SummaryInlineSelect
        fieldKey="currentStageSlug"
        label={content.projectDetail.currentStage}
        value={summary.currentStageSlug}
        savingField={savingField}
        options={stageOptions}
        renderValue={(slug) => (
          <span className={shared.stagePill}>{formatStageLabel(slug as PipelineStageSlug)}</span>
        )}
        onPatch={patchField}
      />
      <SummaryInlineSelect
        fieldKey="priority"
        label={fields.priority}
        value={summary.priority}
        savingField={savingField}
        options={priorityOptions}
        renderValue={(p) => <span className={priorityClass(p)}>{p}</span>}
        onPatch={patchField}
      />
      <SummaryInlineText
        fieldKey="dealValueUsd"
        label={fields.dealValue}
        value={centsToUsdInput(summary.dealValueCents)}
        displayValue={formatCentsAsUsd(summary.dealValueCents)}
        savingField={savingField}
        onPatch={patchField}
      />
      <SummaryMetric label={fields.balance} savingField={savingField}>
        <span
          className={styles.summaryText}
          title={hasPaymentMilestones ? edit.fields.balanceDerivedHint : undefined}
        >
          {formatCentsAsUsd(summary.balanceRemainingCents)}
        </span>
      </SummaryMetric>
    </section>
  );
}
