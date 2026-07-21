'use client';

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type KeyboardEvent,
  type ReactElement,
  type ReactNode,
  type Ref,
} from 'react';
import { projectHasPaymentMilestones, type CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CreateCrmProjectModal } from '@/presentation/components/CrmProjects/CreateCrmProjectModal';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import type { SummaryEditableField } from '@/presentation/features/crmProjectDetail/projectDetailFormModel';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useProjectDetailPaymentFinancials } from '@/presentation/features/crmProjectDetail/useProjectDetailPaymentFinancials';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { ProjectSummaryAddress } from './ProjectSummaryAddress';
import { ProjectSummaryMobileCard } from './ProjectSummaryMobileCard';
import {
  useSummaryContactValuesPopover,
  type SummaryContactValuesPopoverKind,
} from './SummaryContactValuesPopover';
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
  contactPopoverValues?: readonly string[];
  contactPopoverKind?: SummaryContactValuesPopoverKind;
  formatContactPopoverValue?: (value: string) => string;
  getContactCopyValue?: (value: string) => string;
  onContactCopied?: (message: string) => void;
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
  contactPopoverValues,
  contactPopoverKind,
  formatContactPopoverValue,
  getContactCopyValue,
  onContactCopied,
}: SummaryInlineTextProps): ReactElement {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const isSaving = savingField === fieldKey;
  const isMobileLayout = useDashboardMobileLayout();

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

  const popoverValues =
    contactPopoverKind != null &&
    contactPopoverValues != null &&
    formatContactPopoverValue != null &&
    getContactCopyValue != null &&
    onContactCopied != null
      ? nonEmptyContactValues(contactPopoverValues)
      : [];

  const hasContactPopover =
    popoverValues.length > 0 &&
    contactPopoverKind != null &&
    formatContactPopoverValue != null &&
    getContactCopyValue != null &&
    onContactCopied != null;

  const contactPopover = useSummaryContactValuesPopover({
    kind: contactPopoverKind ?? 'email',
    values: popoverValues,
    formatDisplayValue: formatContactPopoverValue ?? ((value) => value),
    getCopyValue: getContactCopyValue ?? ((value) => value),
    onCopied: onContactCopied ?? (() => undefined),
    enabled: hasContactPopover && !editing && !disabled && !isSaving,
    interactionMode: isMobileLayout ? 'tap' : 'hover',
  });

  const valueSlotClassName = [
    styles.summaryValueSlot,
    hasContactPopover && isMobileLayout ? styles.summaryContactValueSlot_mobile : '',
  ]
    .filter(Boolean)
    .join(' ');

  const displayOverlayClassName = [
    styles.summaryInlineDisplayOverlay,
    resolvedValueClassName,
    hasContactPopover && isMobileLayout ? styles.summaryInlineDisplayOverlay_withContactToggle : '',
  ]
    .filter(Boolean)
    .join(' ');

  const toggleIconClassName = [
    styles.summaryContactValuesToggleIcon,
    contactPopover.open ? styles.summaryContactValuesToggleIcon_open : '',
  ]
    .filter(Boolean)
    .join(' ');

  const valueSlot = (
    <>
      <div
        ref={contactPopover.anchorRef as Ref<HTMLDivElement>}
        className={valueSlotClassName}
        {...(hasContactPopover && !isMobileLayout ? contactPopover.anchorHandlers : {})}
      >
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
          <>
            <button
              type="button"
              className={displayOverlayClassName}
              disabled={disabled || isSaving}
              onClick={() => setEditing(true)}
            >
              {displayText}
            </button>
            {contactPopover.toggleButtonProps ? (
              <button
                className={styles.summaryContactValuesToggle}
                {...contactPopover.toggleButtonProps}
              >
                <span className={toggleIconClassName} aria-hidden />
              </button>
            ) : null}
          </>
        )}
      </div>
      {contactPopover.menu}
    </>
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
  /** When true, show View/Edit even if fields are read-only (e.g. inactive project). */
  showEditAction?: boolean;
  savingField: SummaryEditableField | null;
  patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

export function ProjectSummaryStrip({
  project,
  memberView = false,
  readOnly = false,
  showEditAction = false,
  savingField,
  patchField,
}: ProjectSummaryStripProps): ReactElement {
  const { summary } = project;
  const { childSummaries, setToast, onProjectSaved, guardProjectEdit } = useProjectDetailShell();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const paymentFinancials = useProjectDetailPaymentFinancials({
    project,
    childSummaries: childSummaries?.allRows ?? null,
  });
  const fullDetailsCopy = content.projectDetail.fullDetails;
  const fields = content.projectDetail.fields;
  const hasPaymentMilestones = projectHasPaymentMilestones(project);
  const isSubproject = summary.parentProjectId != null;
  const valueLabel = isSubproject ? fields.subValue : fields.value;
  const displayEmail = formatContactEmailDisplay(summary.contact.email, { maskForMember: memberView });
  const isMobileLayout = useDashboardMobileLayout();
  const contactEmails = nonEmptyContactValues(summary.contact.emails);
  const contactPhones = nonEmptyContactValues(summary.contact.phones);
  const onContactCopied = useCallback(
    (message: string) => setToast({ kind: 'success', message }),
    [setToast]
  );
  const formatEmailPopoverValue = useCallback(
    (email: string) => formatContactEmailDisplay(email, { maskForMember: memberView }),
    [memberView]
  );
  const getEmailCopyValue = useCallback(
    (email: string) =>
      memberView ? formatContactEmailDisplay(email, { maskForMember: true }) : email.trim(),
    [memberView]
  );
  const formatPhonePopoverValue = useCallback(
    (phone: string) => formatPhoneDisplay(phone),
    []
  );
  const getPhoneCopyValue = useCallback(
    (phone: string) => formatPhoneDisplay(phone) || phone.trim(),
    []
  );

  if (isMobileLayout) {
    return (
      <div className={styles.projectInfoMobileCardHost}>
        <ProjectSummaryMobileCard
          project={project}
          memberView={memberView}
          readOnly={readOnly}
          showEditAction={showEditAction}
          savingField={savingField}
          patchField={patchField}
        />
      </div>
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
          contactPopoverValues={contactEmails}
          contactPopoverKind="email"
          formatContactPopoverValue={formatEmailPopoverValue}
          getContactCopyValue={getEmailCopyValue}
          onContactCopied={onContactCopied}
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
          contactPopoverValues={contactPhones}
          contactPopoverKind="phone"
          formatContactPopoverValue={formatPhonePopoverValue}
          getContactCopyValue={getPhoneCopyValue}
          onContactCopied={onContactCopied}
        />
        <ProjectSummaryAddress
          address={summary.address}
          latitude={summary.latitude}
          longitude={summary.longitude}
          label={fields.address}
        />
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
                title={hasPaymentMilestones ? content.projectDetail.edit.fields.balanceDerivedHint : undefined}
              >
                {formatCentsAsUsd(paymentFinancials.balanceCents)}
              </span>
            </SummaryMetric>
          </>
        )}
        {showEditAction ? (
          <div className={styles.summaryStripEditAction}>
            <button
              type="button"
              className={styles.summaryStripViewEditBtn}
              onClick={() => {
                guardProjectEdit(() => {
                  setEditModalOpen(true);
                });
              }}
              aria-label={fullDetailsCopy.viewEdit}
            >
              {fullDetailsCopy.viewEdit}
            </button>
          </div>
        ) : null}
      </div>
      <CreateCrmProjectModal
        open={editModalOpen}
        mode="edit"
        project={project}
        onClose={() => setEditModalOpen(false)}
        onUpdated={onProjectSaved}
      />
    </section>
  );
}
