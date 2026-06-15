'use client';

import type { ReactElement, ReactNode } from 'react';
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
import { ProjectSummaryAddress } from './ProjectSummaryAddress';
import { SummaryInlineText } from './ProjectSummaryStrip';
import styles from './ProjectDetail.module.css';

export type ProjectSummaryMobileCardProps = {
  readonly project: CrmProjectDetail;
  readonly memberView?: boolean;
  readonly readOnly?: boolean;
  readonly savingField: SummaryEditableField | null;
  readonly patchField: (field: SummaryEditableField, value: string) => Promise<boolean>;
  readonly onEditClick?: () => void;
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
  onEditClick,
}: ProjectSummaryMobileCardProps): ReactElement {
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
  const mobileValueClass = `${styles.summaryText} ${styles.projectInfoMobileValue}`;
  const editAction = onEditClick ? (
    <button
      type="button"
      className={styles.summaryStripEditBtn}
      onClick={onEditClick}
      aria-label={edit.title}
    >
      <span className={styles.summaryStripEditIcon} aria-hidden />
    </button>
  ) : null;

  return (
    <section
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
            <SummaryInlineText
              hideLabel
              fieldKey="email"
              label={fields.email}
              value={summary.contact.email}
              displayValue={displayEmail}
              savingField={savingField}
              disabled={readOnly}
              inputType="email"
              displayClassName={styles.summaryLink}
              valueClassName={`${styles.summaryLink} ${styles.projectInfoMobileValue}`}
              onPatch={patchField}
            />
          </ProjectInfoMobileFieldCell>
          <ProjectInfoMobileFieldCell label={fields.phone} align="right">
            <SummaryInlineText
              hideLabel
              fieldKey="phone"
              label={fields.phone}
              value={summary.contact.phone}
              displayValue={formatPhoneDisplay(summary.contact.phone)}
              savingField={savingField}
              disabled={readOnly}
              inputType="tel"
              displayClassName={styles.summaryLink}
              valueClassName={`${styles.summaryLink} ${styles.projectInfoMobileValue}`}
              onPatch={patchField}
            />
          </ProjectInfoMobileFieldCell>
        </div>
        <ProjectSummaryAddress
          address={summary.address}
          label={fields.address}
          layout="mobile"
          editAction={editAction}
        />
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
    </section>
  );
}
