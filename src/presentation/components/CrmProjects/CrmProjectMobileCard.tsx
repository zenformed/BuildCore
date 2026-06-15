'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { isCrmProjectComplete } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
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
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
}: CrmProjectMobileCardProps): ReactElement {
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const isChild = variant === 'child';
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

  const cardClass = isChild
    ? `${projectStyles.card} ${styles.mobileCard} ${styles.mobileCardChild}`
    : `${projectStyles.card} ${styles.mobileCard}`;

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
              {isProjectPriorityUrgent(project.priority) ? (
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
                />
              </span>
            ) : null}
          </div>
        </div>

        {!isMemberRole ? (
          <>
            <div className={styles.mobileCardMetaRow}>
              {progress != null ? (
                <ProjectProgressPercent variant="compact" progress={progress} />
              ) : null}
              {derivedStageSlug != null ? (
                <span className={`${shared.stagePill} ${styles.projectMetaStagePill}`}>
                  {formatStageLabel(derivedStageSlug, catalog)}
                </span>
              ) : null}
            </div>
            <div className={styles.mobileCardFinancials} aria-busy={financialsLoading || undefined}>
              <span className={styles.mobileCardFinancialItem} title={displayValueLabel}>
                <span className={styles.mobileCardFinancialLabel}>{valueLabels.value}</span>
                <span className={styles.mobileCardFinancialValue}>
                  {financialDisplay(displayFinancials.valueCents)}
                </span>
              </span>
              <span className={styles.mobileCardFinancialItem} title={valueLabels.collected}>
                <span className={styles.mobileCardFinancialLabel}>{valueLabels.collected}</span>
                <span className={styles.mobileCardFinancialValue}>
                  {financialDisplay(displayFinancials.collectedCents)}
                </span>
              </span>
              <span className={styles.mobileCardFinancialItem} title={valueLabels.balance}>
                <span className={styles.mobileCardFinancialLabel}>{valueLabels.balance}</span>
                <span className={styles.mobileCardFinancialValue}>
                  {financialDisplay(displayFinancials.balanceCents)}
                </span>
              </span>
            </div>
          </>
        ) : null}
      </div>

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
