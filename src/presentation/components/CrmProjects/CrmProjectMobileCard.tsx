'use client';

import { useCallback, type KeyboardEvent, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { nonEmptyContactValues } from '@/domain/crm/contactMultiValue';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { SubprojectMobileContactValue } from '@/presentation/components/CrmProjectDetail/SubprojectMobileContactValue';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useCrmProjectRowPresentation } from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import { CrmProjectTableRowActionsMenu } from './CrmProjectTableRowActionsMenu';
import { ProjectPreviewNameAnchor } from './ProjectPreviewNameAnchor';
import { CrmProjectInactiveIcon, CrmProjectInactiveInlineLabel } from './CrmProjectInactiveBadge';
import projectStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectMobileCardProps = {
  readonly project: CrmProjectSummary;
  readonly variant?: 'root' | 'child';
  readonly financials?: ProjectPaymentFinancials;
  readonly valueLabel?: string;
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
  readonly onRequestMarkInactive?: (project: CrmProjectSummary) => void;
  readonly onRequestMarkActive?: (project: CrmProjectSummary) => void | Promise<void>;
  readonly hasChildren?: boolean;
  readonly isExpanded?: boolean;
  readonly onToggleExpand?: () => void;
  readonly workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  readonly isWorkflowProgressLoading?: boolean;
  readonly parentProjectName?: string;
  readonly showContactInfo?: boolean;
};

export function CrmProjectMobileCard({
  project,
  variant = 'root',
  financials,
  valueLabel,
  financialsLoading = false,
  onRowClick,
  isMemberRole = false,
  canDelete = false,
  showActions = true,
  deleting = false,
  busy = false,
  onRequestDelete,
  onTogglePriority,
  onRequestCompletionChange,
  onRequestMarkInactive,
  onRequestMarkActive,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  parentProjectName,
  showContactInfo = false,
}: CrmProjectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const isChild = variant === 'child' && parentProjectName == null;
  const isInactive = isCrmProjectInactive(project);
  const { catalog, industrySubtitle, progress, derivedStageSlug } = useCrmProjectRowPresentation(
    project,
    workflowProgressInputIndex,
    isWorkflowProgressLoading
  );
  const displayFinancials = financials ?? { valueCents: 0, collectedCents: 0, balanceCents: 0 };
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);
  const displayValueLabel =
    valueLabel ?? (isChild ? valueLabels.subValueLabel : valueLabels.projectValueLabel);
  const rowAriaLabel = isChild
    ? tableCopy.subprojectRowAriaLabel(project.name)
    : tableCopy.rowAriaLabel(project.name);
  const displayEmail = formatContactEmailDisplay(project.contact.email, { maskForMember: isMemberRole });
  const displayPhone = formatPhoneDisplay(project.contact.phone);
  const contactEmails = nonEmptyContactValues(project.contact.emails);
  const contactPhones = nonEmptyContactValues(project.contact.phones);
  const formatEmailPopoverValue = useCallback(
    (email: string) => formatContactEmailDisplay(email, { maskForMember: isMemberRole }),
    [isMemberRole]
  );
  const getEmailCopyValue = useCallback(
    (email: string) =>
      isMemberRole ? formatContactEmailDisplay(email, { maskForMember: true }) : email.trim(),
    [isMemberRole]
  );
  const formatPhonePopoverValue = useCallback((phone: string) => formatPhoneDisplay(phone), []);
  const getPhoneCopyValue = useCallback(
    (phone: string) => formatPhoneDisplay(phone) || phone.trim(),
    []
  );

  const stageMetaRow =
    !isMemberRole && (isInactive || derivedStageSlug != null || progress != null) ? (
      <div className={showContactInfo ? styles.mobileCardStageRow : styles.mobileCardMetaRow}>
        {isInactive ? (
          <CrmProjectInactiveInlineLabel project={project} />
        ) : (
          <span className={projectStyles.subprojectMobileCardStageRow}>
            {derivedStageSlug != null ? (
              <span
                className={`${shared.stagePill} ${styles.projectMetaStagePill}`}
                title={formatStageLabel(derivedStageSlug, catalog)}
              >
                {formatStageLabel(derivedStageSlug, catalog)}
              </span>
            ) : null}
            {progress != null ? (
              <span
                className={projectStyles.subprojectMobileCardProgressPercent}
                aria-label={`Project progress ${progress.textPercent}%`}
              >
                {progress.textPercent}%
              </span>
            ) : null}
          </span>
        )}
      </div>
    ) : null;

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onRowClick();
    }
  };

  const cardClass = [
    projectStyles.card,
    styles.mobileCard,
    isChild ? styles.mobileCardChild : '',
    isInactive ? styles.mobileCardInactive : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <article
      className={cardClass}
      aria-label={rowAriaLabel}
      aria-busy={busy || deleting || undefined}
    >
      <div
        role="button"
        tabIndex={0}
        className={styles.mobileCardBody}
        onClick={onRowClick}
        onKeyDown={handleKeyDown}
      >
        <div className={styles.mobileCardHeader}>
          <div className={styles.mobileCardTitleBlock}>
            <span
              className={[
                styles.mobileCardTitleRow,
                showContactInfo ? styles.mobileCardTitleRow_withContact : '',
              ]
                .filter(Boolean)
                .join(' ')}
            >
              {isInactive ? (
                <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
              ) : isProjectPriorityUrgent(project.priority) ? (
                <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
              ) : null}
              {isCrmProjectComplete(project) ? (
                <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
              ) : null}
              <ProjectPreviewNameAnchor
                project={project}
                financials={financials ?? null}
                stageLabel={
                  derivedStageSlug != null ? formatStageLabel(derivedStageSlug, catalog) : null
                }
                progressPercent={progress?.textPercent ?? null}
                className={showContactInfo ? styles.mobileCardPreviewAnchor : undefined}
              >
                <span className={styles.mobileCardTitle}>{project.name}</span>
              </ProjectPreviewNameAnchor>
            </span>
            {!showContactInfo && industrySubtitle ? (
              <span className={styles.mobileCardIndustry}>{industrySubtitle}</span>
            ) : null}
            {!showContactInfo && parentProjectName ? (
              <span className={styles.mobileCardParentProject}>{parentProjectName}</span>
            ) : null}
          </div>
          <div className={styles.mobileCardHeaderEnd}>
            <span className={styles.mobileCardAssignee}>
              {project.assignedTo ? (
                <TeamMemberAvatar member={project.assignedTo} />
              ) : (
                <span
                  className={`${shared.avatar} ${shared.avatarUnassigned}`}
                  title={tableCopy.unassigned}
                >
                  —
                </span>
              )}
            </span>
            {!isMemberRole && showActions ? (
              <span
                className={styles.mobileCardActions}
                onClick={(event) => event.stopPropagation()}
                onKeyDown={(event) => event.stopPropagation()}
              >
                <CrmProjectTableRowActionsMenu
                  project={project}
                  busy={busy || deleting}
                  canDelete={canDelete}
                  onRequestDelete={onRequestDelete}
                  onTogglePriority={onTogglePriority}
                  onRequestCompletionChange={onRequestCompletionChange}
                  onRequestMarkInactive={onRequestMarkInactive}
                  onRequestMarkActive={onRequestMarkActive}
                />
              </span>
            ) : null}
          </div>
        </div>

        {showContactInfo ? (
          <div className={styles.mobileCardDetailsGrid}>
            <div className={styles.mobileCardDetailsCol}>
              {industrySubtitle ? (
                <span className={styles.mobileCardIndustry}>{industrySubtitle}</span>
              ) : (
                <span className={styles.mobileCardIndustry}>—</span>
              )}
              {parentProjectName ? (
                <span className={styles.mobileCardParentProject}>{parentProjectName}</span>
              ) : null}
              {stageMetaRow}
            </div>
            <div className={styles.mobileCardDetailsColRight}>
              <span className={styles.mobileCardContactValue}>
                {project.contact.name || '—'}
              </span>
              <SubprojectMobileContactValue
                kind="email"
                values={contactEmails}
                displayValue={displayEmail}
                formatDisplayValue={formatEmailPopoverValue}
                getCopyValue={getEmailCopyValue}
                isMemberRole={isMemberRole}
                valueClassName={styles.mobileCardContactValue}
              />
              <SubprojectMobileContactValue
                kind="phone"
                values={contactPhones}
                displayValue={displayPhone}
                formatDisplayValue={formatPhonePopoverValue}
                getCopyValue={getPhoneCopyValue}
                isMemberRole={isMemberRole}
                valueClassName={styles.mobileCardContactValue}
              />
            </div>
          </div>
        ) : (
          stageMetaRow
        )}
      </div>

      {!isMemberRole ? (
        <div
          className={projectStyles.subprojectMobileCardFinancials}
          aria-label={content.projectDetail.sections.financials}
          aria-busy={financialsLoading || undefined}
        >
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={displayValueLabel}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.value}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.valueCents)}
            </span>
          </span>
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={valueLabels.collected}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.collected}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.collectedCents)}
            </span>
          </span>
          <span className={projectStyles.subprojectMobileCardFinancialItem} title={valueLabels.balance}>
            <span className={projectStyles.subprojectMobileCardFinancialLabel}>
              {valueLabels.balance}
            </span>
            <span
              className={projectStyles.subprojectMobileCardFinancialValue}
              aria-busy={financialsLoading || undefined}
            >
              {financialDisplay(displayFinancials.balanceCents)}
            </span>
          </span>
        </div>
      ) : null}

      {!isChild && hasChildren ? (
        <button
          type="button"
          className={styles.mobileCardExpandBtn}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? tableCopy.collapseSubprojects : tableCopy.expandSubprojects}
          onClick={(event) => {
            event.stopPropagation();
            onToggleExpand?.();
          }}
        >
          <span className={styles.expandChevronWrap} aria-hidden>
            <span
              className={isExpanded ? styles.expandChevron_expanded : styles.expandChevron}
            />
          </span>
        </button>
      ) : null}
    </article>
  );
}
