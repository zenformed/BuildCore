'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useCrmProjectRowPresentation } from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './ProjectDetail.module.css';

export type SubprojectMobileCardProps = {
  readonly project: CrmProjectSummary;
  readonly financials: ProjectPaymentFinancials;
  readonly financialsLoading?: boolean;
  readonly onRowClick: () => void;
  readonly isMemberRole?: boolean;
  readonly canDelete?: boolean;
  readonly showActions?: boolean;
  readonly deleting?: boolean;
  readonly busy?: boolean;
  readonly onRequestDelete?: (project: CrmProjectSummary) => void;
  readonly onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly isWorkflowProgressLoading?: boolean;
};

export function SubprojectMobileCard({
  project,
  financials,
  financialsLoading = false,
  onRowClick,
  isMemberRole = false,
  deleting = false,
  busy = false,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
}: SubprojectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const fields = content.projectDetail.fields;
  const { industrySubtitle, derivedStageSlug, catalog } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading
  );
  const displayEmail = formatContactEmailDisplay(project.contact.email, { maskForMember: isMemberRole });
  const displayPhone = formatPhoneDisplay(project.contact.phone);
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick();
    }
  };

  return (
    <article
      className={`${styles.card} ${styles.subprojectMobileCard}`}
      aria-label={tableCopy.subprojectRowAriaLabel(project.name)}
      aria-busy={busy || deleting || undefined}
    >
      <div className={styles.subprojectMobileCardContent}>
        <div
          role="button"
          tabIndex={0}
          className={styles.subprojectMobileCardBody}
          onClick={onRowClick}
          onKeyDown={handleKeyDown}
        >
          <div className={styles.subprojectMobileCardGrid}>
            <div className={styles.subprojectMobileCardCol}>
              <span className={styles.subprojectMobileCardNameRow}>
                {isProjectPriorityUrgent(project.priority) ? (
                  <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
                ) : null}
                {isCrmProjectComplete(project) ? (
                  <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
                ) : null}
                <span className={styles.subprojectMobileCardName}>{project.name}</span>
              </span>
              {industrySubtitle ? (
                <span className={styles.subprojectMobileCardMeta}>{industrySubtitle}</span>
              ) : (
                <span className={styles.subprojectMobileCardMeta}>—</span>
              )}
              {derivedStageSlug != null ? (
                <span
                  className={`${shared.stagePill} ${styles.subprojectMobileCardStagePill}`}
                  title={formatStageLabel(derivedStageSlug, catalog)}
                >
                  {formatStageLabel(derivedStageSlug, catalog)}
                </span>
              ) : (
                <span className={styles.subprojectMobileCardMeta}>—</span>
              )}
            </div>
            <div className={`${styles.subprojectMobileCardCol} ${styles.subprojectMobileCardColRight}`}>
              <span className={styles.subprojectMobileCardValue}>
                {project.contact.name || '—'}
              </span>
              <span className={styles.subprojectMobileCardValue} title={displayEmail}>
                {displayEmail || '—'}
              </span>
              <span className={styles.subprojectMobileCardValue}>{displayPhone || '—'}</span>
            </div>
          </div>
        </div>
      </div>
      {isMemberRole ? null : (
        <div className={styles.subprojectMobileCardFinancials} aria-label={content.projectDetail.sections.financials}>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.subValue}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.value}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.valueCents)}
            </span>
          </span>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.collected}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.collected}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.collectedCents)}
            </span>
          </span>
          <span className={styles.subprojectMobileCardFinancialItem} title={fields.balance}>
            <span className={styles.subprojectMobileCardFinancialLabel}>{fields.balance}</span>
            <span className={styles.subprojectMobileCardFinancialValue} aria-busy={financialsLoading || undefined}>
              {financialDisplay(financials.balanceCents)}
            </span>
          </span>
        </div>
      )}
    </article>
  );
}
