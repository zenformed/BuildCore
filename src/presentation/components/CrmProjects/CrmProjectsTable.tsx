'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmPriority, CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
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

const COLUMNS = content.crm.table.columns;

function priorityClassName(priority: CrmPriority): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

export type CrmProjectsTableProps = {
  rows: readonly CrmProjectSummary[];
  isLoading?: boolean;
  onRowClick: (project: CrmProjectSummary) => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  deletingProjectId?: string | null;
  onRequestDelete?: (project: CrmProjectSummary) => void;
};

export function CrmProjectsTable({
  rows,
  isLoading = false,
  onRowClick,
  isMemberRole = false,
  canDelete = false,
  deletingProjectId = null,
  onRequestDelete,
}: CrmProjectsTableProps): ReactElement {
  const showTable = rows.length > 0 || isLoading;
  const gridClassName = isMemberRole
    ? `${styles.projectsGrid} ${styles.projectsGridMember}`
    : styles.projectsGrid;

  return (
    <div className={styles.tableWrap}>
      <div className={styles.scrollContainer} role="region" aria-label={content.crm.table.regionAriaLabel}>
        <div className={`${styles.tableInner} ${isMemberRole ? styles.tableInnerMember : ''}`}>
          <div className={`${gridClassName} ${styles.gridHeader}`} role="row">
            <span role="columnheader">{COLUMNS.project}</span>
            <span role="columnheader">{COLUMNS.contact}</span>
            <span role="columnheader">{COLUMNS.email}</span>
            <span role="columnheader">{COLUMNS.phone}</span>
            <span role="columnheader">{COLUMNS.priority}</span>
            {!isMemberRole ? <span role="columnheader">{COLUMNS.stage}</span> : null}
            <span role="columnheader">{COLUMNS.notes}</span>
            {!isMemberRole ? (
              <span role="columnheader" className={styles.gridHeaderDealValue}>
                {COLUMNS.dealValue}
              </span>
            ) : null}
            <span role="columnheader" className={styles.gridHeaderAssignee}>
              {COLUMNS.assigned}
            </span>
            {!isMemberRole ? (
              <span role="columnheader" className={styles.gridHeaderActions}>
                {COLUMNS.actions}
              </span>
            ) : null}
          </div>
          <div className={styles.gridBody} role="rowgroup">
            {!showTable ? (
              <p className={styles.emptyState}>{content.crm.table.empty}</p>
            ) : (
              rows.map((project) => (
                <ProjectRow
                  key={project.id}
                  project={project}
                  onRowClick={onRowClick}
                  isMemberRole={isMemberRole}
                  canDelete={canDelete}
                  deleting={deletingProjectId === project.id}
                  onRequestDelete={onRequestDelete}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function ProjectRow({
  project,
  onRowClick,
  isMemberRole,
  canDelete,
  deleting,
  onRequestDelete,
}: {
  project: CrmProjectSummary;
  onRowClick: (project: CrmProjectSummary) => void;
  isMemberRole: boolean;
  canDelete: boolean;
  deleting: boolean;
  onRequestDelete?: (project: CrmProjectSummary) => void;
}): ReactElement {
  const deleteCopy = content.crm.delete;
  const tradeSubtitle = getProjectTradeSubtitle(project.tradeType);
  const gridClassName = isMemberRole
    ? `${styles.projectsGrid} ${styles.projectsGridMember}`
    : styles.projectsGrid;

  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onRowClick(project);
    }
  };

  return (
    <div
      role="row"
      tabIndex={0}
      className={`${gridClassName} ${styles.gridRow}`}
      onClick={() => onRowClick(project)}
      onKeyDown={handleKeyDown}
      aria-label={content.crm.table.rowAriaLabel(project.name)}
    >
      <span className={styles.gridCellProject} role="cell">
        <span className={styles.projectNameRow}>
          {isCrmProjectComplete(project) ? (
            <CrmProjectCompleteIcon ariaLabel={content.crm.table.completionCheckAriaLabel} />
          ) : null}
          <span className={styles.projectName}>{project.name}</span>
        </span>
        {tradeSubtitle ? <span className={styles.projectMeta}>{tradeSubtitle}</span> : null}
      </span>
      <span className={styles.gridCell} role="cell">
        {project.contact.name}
      </span>
      <span className={styles.gridCell} role="cell" title={project.contact.email}>
        {project.contact.email || '—'}
      </span>
      <span className={styles.gridCell} role="cell">
        {formatPhoneDisplay(project.contact.phone) || '—'}
      </span>
      <span className={styles.gridCell} role="cell">
        <span className={priorityClassName(project.priority)}>{project.priority}</span>
      </span>
      {!isMemberRole ? (
        <span className={styles.gridCell} role="cell">
          <span className={shared.stagePill}>{formatStageLabel(project.currentStageSlug)}</span>
        </span>
      ) : null}
      <span className={`${styles.gridCell} ${styles.gridCellWrap}`} role="cell" title={project.notesPreview ?? undefined}>
        {project.notesPreview ?? '—'}
      </span>
      {!isMemberRole ? (
        <span className={`${styles.gridCell} ${styles.gridCellDealValue}`} role="cell">
          {formatCentsAsUsd(project.dealValueCents)}
        </span>
      ) : null}
      <span className={styles.gridCellAssignee} role="cell">
        {project.assignedTo ? (
          <TeamMemberAvatar member={project.assignedTo} />
        ) : (
          <span className={`${shared.avatar} ${shared.avatarUnassigned}`} title={content.crm.table.unassigned}>
            —
          </span>
        )}
      </span>
      {!isMemberRole ? (
        <span className={styles.gridCellActions} role="cell">
          {canDelete ? (
            <span className={shared.rowDeleteCell}>
              <button
                type="button"
                className={shared.rowDeleteBtn}
                disabled={deleting}
                title={deleteCopy.action}
                aria-label={deleteCopy.actionAriaLabel(project.name)}
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
