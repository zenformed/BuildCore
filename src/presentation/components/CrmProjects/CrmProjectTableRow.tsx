'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmPriority, CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import { resolveProjectSummaryProgressDisplay } from '@/domain/buildcore/projectPipelineProgress';
import { ProjectProgressPercent } from '@/presentation/components/CrmProjectDetail/ProjectProgressPercent';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatPhoneDisplay,
  formatStageLabel,
  getProjectTradeSubtitle,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import styles from './CrmProjects.module.css';

export type CrmProjectTableRowDeleteLabels = {
  readonly action: string;
  readonly actionAriaLabel: (name: string) => string;
};

export type CrmProjectTableRowProps = {
  project: CrmProjectSummary;
  variant?: 'root' | 'child';
  onRowClick: () => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  showActions?: boolean;
  deleting?: boolean;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  deleteLabels?: CrmProjectTableRowDeleteLabels;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
};

function priorityClassName(priority: CrmPriority): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

export function CrmProjectTableRow({
  project,
  variant = 'root',
  onRowClick,
  isMemberRole = false,
  canDelete = false,
  showActions = true,
  deleting = false,
  onRequestDelete,
  deleteLabels,
  hasChildren = false,
  isExpanded = false,
  onToggleExpand,
}: CrmProjectTableRowProps): ReactElement {
  const deleteCopy = content.crm.delete;
  const tableCopy = content.crm.table;
  const deleteAction = deleteLabels?.action ?? deleteCopy.action;
  const deleteAriaLabel = deleteLabels?.actionAriaLabel ?? deleteCopy.actionAriaLabel;
  const tradeSubtitle = getProjectTradeSubtitle(project.tradeType);
  const progress = resolveProjectSummaryProgressDisplay(project);
  const isChild = variant === 'child';
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
        {tradeSubtitle ? <span className={styles.projectMeta}>{tradeSubtitle}</span> : null}
        <ProjectProgressPercent variant="compact" progress={progress} />
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        {project.contact.name}
      </span>
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={project.contact.email}
      >
        {project.contact.email || '—'}
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        {formatPhoneDisplay(project.contact.phone) || '—'}
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
        <span className={priorityClassName(project.priority)}>{project.priority}</span>
      </span>
      {!isMemberRole ? (
        <span className={`${styles.gridCell} ${styles.gridCellAlignCenter}`} role="cell">
          <span className={shared.stagePill}>{formatStageLabel(project.currentStageSlug)}</span>
        </span>
      ) : null}
      <span
        className={`${styles.gridCell} ${styles.gridCellAlignCenter}`}
        role="cell"
        title={project.notesPreview ?? undefined}
      >
        <span className={styles.gridCellWrap}>{project.notesPreview ?? '—'}</span>
      </span>
      {!isMemberRole ? (
        <span
          className={`${styles.gridCell} ${styles.gridCellDealValue} ${styles.gridCellAlignCenter}`}
          role="cell"
        >
          {formatCentsAsUsd(project.dealValueCents)}
        </span>
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
          {canDelete ? (
            <span className={shared.rowDeleteCell}>
              <button
                type="button"
                className={shared.rowDeleteBtn}
                disabled={deleting}
                title={deleteAction}
                aria-label={deleteAriaLabel(project.name)}
                onClick={(event) => {
                  event.stopPropagation();
                  onRequestDelete?.(project);
                }}
              >
                <span aria-hidden>🗑️</span>
              </button>
            </span>
          ) : null}
        </span>
      ) : null}
    </div>
  );
}
