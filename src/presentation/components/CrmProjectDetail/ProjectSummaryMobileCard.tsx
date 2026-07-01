'use client';

import { useCallback, useState, type ReactElement, type ReactNode } from 'react';
import { projectHasPaymentMilestones, type CrmProjectDetail } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
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
import { ProjectSummaryAddress } from './ProjectSummaryAddress';
import { SubprojectMobileContactValue } from './SubprojectMobileContactValue';
import { SummaryInlineText } from './ProjectSummaryStrip';
import styles from './ProjectDetail.module.css';

export type ProjectSummaryMobileCardProps = {
  readonly project: CrmProjectDetail;
  readonly memberView?: boolean;
  readonly readOnly?: boolean;
  readonly savingField: SummaryEditableField | null;
  readonly patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
};

function ProjectInfoMobileFieldCell({
  label,
  align = 'left',
  children,
}: {
  readonly label: string;
  readonly align?: 'left' | 'right';
  readonly children: ReactNode;
}): ReactElement {
  const cellClass =
    align === 'right'
      ? `${styles.workflowTaskMobileCardCell} ${styles.workflowTaskMobileCardCell_right}`
      : styles.workflowTaskMobileCardCell;

  return (
    <div className={cellClass}>
      <span className={styles.projectInfoMobileLabel}>{label}</span>
      {children}
    </div>
  );
}

export function ProjectSummaryMobileCard({
  project,
  memberView = false,
  readOnly = false,
  savingField,
  patchField,
}: ProjectSummaryMobileCardProps): ReactElement {
  const { summary } = project;
  const { childSummaries, setToast, onProjectSaved } = useProjectDetailShell();
  const [editModalOpen, setEditModalOpen] = useState(false);
  const paymentFinancials = useProjectDetailPaymentFinancials({
    project,
    childSummaries: childSummaries?.allRows ?? null,
  });
  const fields = content.projectDetail.fields;
  const fullDetailsCopy = content.projectDetail.fullDetails;
  const edit = content.projectDetail.edit;
  const hasPaymentMilestones = projectHasPaymentMilestones(project);
  const isSubproject = summary.parentProjectId != null;
  const valueLabel = isSubproject ? fields.subValue : fields.value;
  const displayEmail = formatContactEmailDisplay(summary.contact.email, { maskForMember: memberView });
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
  const mobileValueClass = `${styles.summaryText} ${styles.projectInfoMobileValue}`;
  const mobileContactValueClass = `${styles.summaryLink} ${styles.projectInfoMobileContactValue}`;

  return (
    <>
      <article
        className={`${styles.card} ${styles.projectInfoMobileCard}`}
        aria-label={content.projectDetail.sections.projectInformation}
      >
        <div className={styles.projectInfoMobileCardBody}>
          <div className={styles.workflowTaskMobileCardGrid2}>
            <ProjectInfoMobileFieldCell label={fields.customer}>
              <SummaryInlineText
                hideLabel
                fieldKey="name"
                label={fields.customer}
                value={summary.name}
                savingField={savingField}
                disabled={readOnly}
                valueClassName={mobileValueClass}
                onPatch={patchField}
              />
            </ProjectInfoMobileFieldCell>
            <ProjectInfoMobileFieldCell label={fields.contact} align="right">
              <SummaryInlineText
                hideLabel
                fieldKey="contactName"
                label={fields.contact}
                value={summary.contact.name}
                savingField={savingField}
                disabled={readOnly}
                valueClassName={mobileValueClass}
                onPatch={patchField}
              />
            </ProjectInfoMobileFieldCell>
          </div>
          <div className={styles.workflowTaskMobileCardGrid2}>
            <ProjectInfoMobileFieldCell label={fields.email}>
              <SubprojectMobileContactValue
                kind="email"
                values={contactEmails}
                displayValue={displayEmail}
                formatDisplayValue={formatEmailPopoverValue}
                getCopyValue={getEmailCopyValue}
                onCopied={onContactCopied}
                isMemberRole={memberView}
                valueClassName={mobileContactValueClass}
              />
            </ProjectInfoMobileFieldCell>
            <ProjectInfoMobileFieldCell label={fields.phone} align="right">
              <SubprojectMobileContactValue
                kind="phone"
                values={contactPhones}
                displayValue={formatPhoneDisplay(summary.contact.phone)}
                formatDisplayValue={formatPhonePopoverValue}
                getCopyValue={getPhoneCopyValue}
                onCopied={onContactCopied}
                isMemberRole={memberView}
                valueClassName={mobileContactValueClass}
              />
            </ProjectInfoMobileFieldCell>
          </div>
          <ProjectSummaryAddress address={summary.address} label={fields.address} layout="mobile" />
        </div>
        {memberView ? null : (
          <div className={styles.projectInfoMobileFinancials} aria-label={content.projectDetail.sections.financials}>
            <span className={styles.projectInfoMobileFinancialItem} title={valueLabel}>
              <span className={styles.projectInfoMobileFinancialLabel}>{valueLabel}</span>
              <span className={styles.projectInfoMobileFinancialValue}>
                {formatCentsAsUsd(paymentFinancials.valueCents)}
              </span>
            </span>
            <span className={styles.projectInfoMobileFinancialItem} title={fields.collected}>
              <span className={styles.projectInfoMobileFinancialLabel}>{fields.collected}</span>
              <span className={styles.projectInfoMobileFinancialValue}>
                {formatCentsAsUsd(paymentFinancials.collectedCents)}
              </span>
            </span>
            <span
              className={styles.projectInfoMobileFinancialItem}
              title={hasPaymentMilestones ? edit.fields.balanceDerivedHint : fields.balance}
            >
              <span className={styles.projectInfoMobileFinancialLabel}>{fields.balance}</span>
              <span className={styles.projectInfoMobileFinancialValue}>
                {formatCentsAsUsd(paymentFinancials.balanceCents)}
              </span>
            </span>
          </div>
        )}
        {!readOnly ? (
          <footer className={styles.projectInfoMobileCardFooter}>
            <button
              type="button"
              className={styles.summaryStripViewEditBtn}
              onClick={() => setEditModalOpen(true)}
              aria-label={fullDetailsCopy.viewEdit}
            >
              {fullDetailsCopy.viewEdit}
            </button>
          </footer>
        ) : null}
      </article>
      <CreateCrmProjectModal
        open={editModalOpen}
        mode="edit"
        project={project}
        onClose={() => setEditModalOpen(false)}
        onUpdated={onProjectSaved}
      />
    </>
  );
}
