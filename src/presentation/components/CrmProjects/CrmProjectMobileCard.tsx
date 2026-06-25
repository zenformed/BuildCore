'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete, isCrmProjectInactive } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatStageLabel,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { useCrmProjectRowPresentation } from '@/presentation/features/crmProjects/useCrmProjectRowPresentation';
import { CrmProjectTableRowActionsMenu } from './CrmProjectTableRowActionsMenu';
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
}: CrmProjectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const isChild = variant === 'child';
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
            <span className={styles.mobileCardTitleRow}>
              {isInactive ? (
                <CrmProjectInactiveIcon ariaLabel={tableCopy.inactiveBadge} />
              ) : isProjectPriorityUrgent(project.priority) ? (
                <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
              ) : null}
              {isCrmProjectComplete(project) ? (
                <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
              ) : null}
              <span className={styles.mobileCardTitle}>{project.name}</span>
            </span>
            {industrySubtitle ? (
              <span className={styles.mobileCardIndustry}>{industrySubtitle}</span>
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

        {!isMemberRole && (isInactive || derivedStageSlug != null || progress != null) ? (
          <div className={styles.mobileCardMetaRow}>
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
        ) : null}
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
