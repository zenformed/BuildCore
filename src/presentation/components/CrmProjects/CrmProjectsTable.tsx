'use client';

import type { KeyboardEvent, ReactElement } from 'react';
import type { CrmPriority, CrmProjectSummary } from '@/domain/crm';
import { isCrmProjectComplete } from '@/domain/crm';
import { CrmProjectCompleteIcon } from '@/presentation/components/crmShared/CrmProjectCompleteIcon';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  formatCentsAsUsd,
  formatStageLabel,
  getProjectTradeSubtitle,
} from '@/presentation/features/crmProjects/crmProjectFormatters';
import { TeamMemberAvatar } from '@/presentation/components/CrmProjectDetail/TeamMemberAvatar';
import shared from '@/presentation/components/crmShared/crmShared.module.css';
import { CrmProjectDraftRow } from './CrmProjectDraftRow';
import styles from './CrmProjects.module.css';

const COLUMNS = content.crm.table.columns;

function priorityClassName(priority: CrmPriority): string {
  return shared[`priority_${priority}`] ?? shared.priority_normal;
}

export type CrmProjectsTableProps = {
  rows: readonly CrmProjectSummary[];
  isLoading?: boolean;
  draftOpen: boolean;
  onDraftOpenChange: (open: boolean) => void;
  onProjectCreated: () => void | Promise<void>;
  onRowClick: (project: CrmProjectSummary) => void;
};

export function CrmProjectsTable({
  rows,
  isLoading = false,
  draftOpen,
  onDraftOpenChange,
  onProjectCreated,
  onRowClick,
}: CrmProjectsTableProps): ReactElement {
  const showTable = draftOpen || rows.length > 0 || isLoading;

  return (
    <div className={styles.tableWrap}>
      <div className={styles.scrollContainer} role="region" aria-label={content.crm.table.regionAriaLabel}>
        <div className={styles.tableInner}>
          <div className={`${styles.projectsGrid} ${styles.gridHeader}`} role="row">
            <span role="columnheader">{COLUMNS.project}</span>
            <span role="columnheader">{COLUMNS.contact}</span>
            <span role="columnheader">{COLUMNS.email}</span>
            <span role="columnheader">{COLUMNS.phone}</span>
            <span role="columnheader">{COLUMNS.priority}</span>
            <span role="columnheader">{COLUMNS.stage}</span>
            <span role="columnheader">{COLUMNS.waitingOn}</span>
            <span role="columnheader">{COLUMNS.notes}</span>
            <span role="columnheader">{COLUMNS.dealValue}</span>
            <span role="columnheader" className={styles.gridHeaderAssignee}>
              {COLUMNS.assigned}
            </span>
            <span role="columnheader" className={styles.gridHeaderActions} aria-hidden />
          </div>
          <div className={styles.gridBody} role="rowgroup">
            {!showTable ? (
              <p className={styles.emptyState}>{content.crm.table.empty}</p>
            ) : (
              <>
                {draftOpen ? (
                  <CrmProjectDraftRow
                    onSaved={onProjectCreated}
                    onCancel={() => onDraftOpenChange(false)}
                  />
                ) : null}
                {rows.map((project) => (
                  <ProjectRow key={project.id} project={project} onRowClick={onRowClick} />
                ))}
              </>
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
}: {
  project: CrmProjectSummary;
  onRowClick: (project: CrmProjectSummary) => void;
}): ReactElement {
  const tradeSubtitle = getProjectTradeSubtitle(project.tradeType);

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
      className={`${styles.projectsGrid} ${styles.gridRow}`}
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
        {project.contact.phone || '—'}
      </span>
      <span className={styles.gridCell} role="cell">
        <span className={priorityClassName(project.priority)}>{project.priority}</span>
      </span>
      <span className={styles.gridCell} role="cell">
        <span className={shared.stagePill}>{formatStageLabel(project.currentStageSlug)}</span>
      </span>
      <span className={styles.gridCell} role="cell" title={project.waitingOn ?? undefined}>
        {project.waitingOn ?? '—'}
      </span>
      <span className={`${styles.gridCell} ${styles.gridCellWrap}`} role="cell" title={project.notesPreview ?? undefined}>
        {project.notesPreview ?? '—'}
      </span>
      <span className={styles.gridCell} role="cell">
        {formatCentsAsUsd(project.dealValueCents)}
      </span>
      <span className={styles.gridCellAssignee} role="cell">
        {project.assignedTo ? (
          <TeamMemberAvatar member={project.assignedTo} />
        ) : (
          <span className={`${shared.avatar} ${shared.avatarUnassigned}`} title={content.crm.table.unassigned}>
            —
          </span>
        )}
      </span>
      <span className={styles.gridCellActions} role="cell" aria-hidden />
    </div>
  );
}
