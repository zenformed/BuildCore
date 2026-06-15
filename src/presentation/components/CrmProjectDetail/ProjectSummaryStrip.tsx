'use client';

import type { KeyboardEvent, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';
import { projectHasPaymentMilestones, type CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectDetailPaymentFinancials } from '@/presentation/features/crmProjectDetail/useProjectDetailPaymentFinancials';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { ProjectSummaryAddress } from './ProjectSummaryAddress';
import { ProjectSummaryMobileCard } from './ProjectSummaryMobileCard';
import styles from './ProjectDetail.module.css';

type SummaryMetricProps = {
  label: string;
  fieldKey?: SummaryEditableField;
  savingField: SummaryEditableField | null;
  className?: string;
  children: ReactNode;
};

function SummaryMetric({
  label,
  fieldKey,
  savingField,
  className,
  children,
}: SummaryMetricProps): ReactElement {
  const isSaving = fieldKey != null && savingField === fieldKey;

  return (
    <div
      className={`${styles.summaryMetric}${className ? ` ${className}` : ''}${
        isSaving ? ` ${styles.summaryMetric_saving}` : ''
      }`}
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
  hideLabel?: boolean;
  valueClassName?: string;
  onPatch: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

export function SummaryInlineText({
  fieldKey,
  label,
  value,
  displayValue,
  savingField,
  disabled = false,
  inputType = 'text',
  displayClassName = styles.summaryText,
  hideLabel = false,
  valueClassName,
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
  const resolvedValueClassName = valueClassName ?? displayClassName;

  const valueSlot = (
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
          className={`${styles.summaryInlineDisplayOverlay} ${resolvedValueClassName}`}
          disabled={disabled || isSaving}
          onClick={() => setEditing(true)}
        >
          {displayText}
        </button>
      )}
    </div>
  );

  if (hideLabel) {
    return (
      <div
        className={`${styles.summaryValueOnly}${isSaving ? ` ${styles.summaryMetric_saving}` : ''}`}
        role="group"
        aria-label={label}
        aria-busy={isSaving || undefined}
      >
        {valueSlot}
        {isSaving ? (
          <span className={styles.summarySavingHint} aria-live="polite">
            Saving…
          </span>
        ) : null}
      </div>
    );
  }

  return (
    <SummaryMetric label={label} fieldKey={fieldKey} savingField={savingField}>
      {valueSlot}
    </SummaryMetric>
  );
}

export type ProjectSummaryStripProps = {
  project: CrmProjectDetail;
  memberView?: boolean;
  readOnly?: boolean;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  onEditClick?: () => void;
};

export function ProjectSummaryStrip({
  project,
  memberView = false,
  readOnly = false,
  savingField,
  patchField,
  onEditClick,
}: ProjectSummaryStripProps): ReactElement {
  const { summary } = project;
  const { childSummaries } = useProjectDetailShell();
  const paymentFinancials = useProjectDetailPaymentFinancials({
    project,
    childSummaries: childSummaries?.allRows ?? null,
  });
  const fields = content.projectDetail.fields;
  const edit = content.projectDetail.edit;
  const hasPaymentMilestones = projectHasPaymentMilestones(project);
  const isSubproject = summary.parentProjectId != null;
  const valueLabel = isSubproject ? fields.subValue : fields.value;
  const displayEmail = formatContactEmailDisplay(summary.contact.email, { maskForMember: memberView });
  const isMobileLayout = useDashboardMobileLayout();

  if (isMobileLayout) {
    return (
      <ProjectSummaryMobileCard
        project={project}
        memberView={memberView}
        readOnly={readOnly}
        savingField={savingField}
        patchField={patchField}
        onEditClick={onEditClick}
      />
    );
  }

  return (
    <section className={styles.summaryStrip} aria-label="Project summary">
      <div className={styles.summaryStripScroll}>
        <SummaryInlineText
          fieldKey="name"
          label={fields.customer}
          value={summary.name}
          savingField={savingField}
          disabled={readOnly}
          onPatch={patchField}
        />
        <SummaryInlineText
          fieldKey="contactName"
          label={fields.contact}
          value={summary.contact.name}
          savingField={savingField}
          disabled={readOnly}
          onPatch={patchField}
        />
        <SummaryInlineText
          fieldKey="email"
          label={fields.email}
          value={summary.contact.email}
          displayValue={displayEmail}
          savingField={savingField}
          disabled={readOnly}
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
          disabled={readOnly}
          inputType="tel"
          displayClassName={styles.summaryLink}
          onPatch={patchField}
        />
        <ProjectSummaryAddress address={summary.address} label={fields.address} />
        {memberView ? null : (
          <>
            <SummaryMetric
              label={valueLabel}
              savingField={savingField}
              className={styles.summaryMetricFinancial}
            >
              <span className={styles.summaryText}>
                {formatCentsAsUsd(paymentFinancials.valueCents)}
              </span>
            </SummaryMetric>
            <SummaryMetric
              label={fields.collected}
              savingField={savingField}
              className={styles.summaryMetricFinancial}
            >
              <span className={styles.summaryText}>
                {formatCentsAsUsd(paymentFinancials.collectedCents)}
              </span>
            </SummaryMetric>
            <SummaryMetric
              label={fields.balance}
              savingField={savingField}
              className={styles.summaryMetricFinancial}
            >
              <span
                className={styles.summaryText}
                title={hasPaymentMilestones ? edit.fields.balanceDerivedHint : undefined}
              >
                {formatCentsAsUsd(paymentFinancials.balanceCents)}
              </span>
            </SummaryMetric>
          </>
        )}
        {onEditClick ? (
          <div className={styles.summaryStripEditAction}>
            <button
              type="button"
              className={styles.summaryStripEditBtn}
              onClick={onEditClick}
              aria-label={edit.title}
            >
              <span className={styles.summaryStripEditIcon} aria-hidden />
            </button>
          </div>
        ) : null}
      </div>
    </section>
  );
}
