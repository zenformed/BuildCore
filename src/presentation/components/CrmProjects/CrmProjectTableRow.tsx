'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import { isCrmProjectComplete } from '@/domain/crm';
import { isProjectPriorityUrgent } from '@/domain/crm/projectPriorityToggle';
import { resolveProjectSummaryProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { CrmProjectPriorityIcon } from '@/presentation/components/crmShared/CrmProjectPriorityIcon';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatContactEmailDisplay,
  formatPhoneDisplay,
  formatStageLabel,
  getProjectIndustrySubtitle,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { CrmProjectTableRowActionsMenu } from './CrmProjectTableRowActionsMenu';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectTableRowDeleteLabels = {
  readonly action: string;
  readonly actionAriaLabel: (name: string) => string;
};

export type CrmProjectTableRowProps = {
  project: CrmProjectSummary;
  variant?: 'root' | 'child';
  financials?: ProjectPaymentFinancials;
  valueLabel?: string;
  financialsLoading?: boolean;
  onRowClick: () => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
  deleting?: boolean;
  busy?: boolean;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

export function CrmProjectTableRow({
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
}: CrmProjectTableRowProps): ReactElement {
  const tableCopy = content.crm.table;
  const { catalog } = useBuildCorePipelineStages();
  const industrySubtitle = getProjectIndustrySubtitle(
    project.industry,
    project.customIndustry
  );
  const progress = resolveProjectSummaryProgressDisplay(project, catalog);
  const isChild = variant === 'child';
  const displayFinancials = financials ?? { valueCents: 0, collectedCents: 0, balanceCents: 0 };
  const financialDisplay = (cents: number): string =>
    financialsLoading ? '…' : formatCentsAsUsd(cents);
  const valueLabels = tableCopy.columns;
  const displayValueLabel =
    valueLabel ?? (isChild ? valueLabels.subValueLabel : valueLabels.projectValueLabel);
  const displayEmail = formatContactEmailDisplay(project.contact.email, { maskForMember: isMemberRole });
  const rowAriaLabel = isChild
    ? tableCopy.subprojectRowAriaLabel(project.name)
    : tableCopy.rowAriaLabel(project.name);

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick();
    }
  };

  const rowClass = isChild ? `${styles.gridRow} ${styles.gridRowChild}` : styles.gridRow;
  const projectCellClass = isChild
    ? `${styles.gridCellProject} ${styles.gridCellProject_child}`
    : styles.gridCellProject;

  return (
    <div
      role="row"
      tabIndex={0}
      className={rowClass}
      onClick={onRowClick}
      onKeyDown={handleKeyDown}
      aria-label={rowAriaLabel}
    >
      <span className={projectCellClass} role="cell">
        <span className={styles.projectNameRow}>
          {isProjectPriorityUrgent(project.priority) ? (
            <CrmProjectPriorityIcon ariaLabel={tableCopy.priorityMarkAriaLabel} />
          ) : null}
          {isCrmProjectComplete(project) ? (
            <CrmProjectCompleteIcon ariaLabel={tableCopy.completionCheckAriaLabel} />
          ) : null}
          <span className={styles.projectName}>{project.name}</span>
          {!isChild && hasChildren ? (
            <button
              type="button"
              className={styles.expandToggle}
              aria-expanded={isExpanded}
              aria-label={
                isExpanded ? tableCopy.collapseSubprojects : tableCopy.expandSubprojects
              }
              onClick={(event) => {
                event.stopPropagation();
                onToggleExpand?.();
              }}
            >
              <span className={styles.expandChevronWrap} aria-hidden>
                <span
                  className={
                    isExpanded ? styles.expandChevron_expanded : styles.expandChevron
                  }
                />
              </span>
            </button>
          ) : null}
        </span>
        {industrySubtitle ? <span className={styles.projectMeta}>{industrySubtitle}</span> : null}
        {!isMemberRole ? (
          <span className={styles.projectProgressRow}>
            <ProjectProgressPercent variant="compact" progress={progress} />
            <span className={`${shared.stagePill} ${styles.projectMetaStagePill}`}>
              {formatStageLabel(project.currentStageSlug, catalog)}
            </span>
          </span>
        ) : null}
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        {project.contact.name}
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={displayEmail}
      >
        {displayEmail || '—'}
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        {formatPhoneDisplay(project.contact.phone) || '—'}
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={project.notesPreview ?? undefined}
      >
        <span className={styles.gridCellWrap}>{project.notesPreview ?? '—'}</span>
      </span>
      {!isMemberRole ? (
        <>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={displayValueLabel}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.valueCents)}
          </span>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={valueLabels.collected}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.collectedCents)}
          </span>
          <span
            className={`${styles.gridCell} ${styles.gridCellFinancial} ${styles.gridCellAlignCenter}`}
            role="cell"
            title={valueLabels.balance}
            aria-busy={financialsLoading || undefined}
          >
            {financialDisplay(displayFinancials.balanceCents)}
          </span>
        </>
      ) : null}
      <span className={styles.gridCellAssignee} role="cell">
        {project.assignedTo ? (
          <TeamMemberAvatar member={project.assignedTo} />
        ) : (
          <span className={`${shared.avatar} ${shared.avatarUnassigned}`} title={tableCopy.unassigned}>
            —
          </span>
        )}
      </span>
      {!isMemberRole && showActions ? (
        <span className={styles.gridCellActions} role="cell">
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
  );
}
