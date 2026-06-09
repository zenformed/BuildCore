'use client';

import { useState, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { CrmProjectTableRow } from './CrmProjectTableRow';
import styles from './CrmProjects.module.css';

const COLUMNS = content.crm.table.columns;

export type CrmProjectsTableDeleteLabels = {
  readonly action: string;
  readonly actionAriaLabel: (name: string) => string;
};

export type CrmProjectsTableProps = {
  rows?: readonly CrmProjectSummary[];
  rootRows?: readonly CrmProjectSummary[];
  allChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  visibleChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  enableSubprojectExpansion?: boolean;
  isLoading?: boolean;
  onRowClick: (project: CrmProjectSummary) => void;
  onSubprojectRowClick?: (parent: CrmProjectSummary, child: CrmProjectSummary) => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  deletingProjectId?: string | null;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  showActions?: boolean;
  projectColumnLabel?: string;
  emptyMessage?: string;
  deleteLabels?: CrmProjectsTableDeleteLabels;
};

export function CrmProjectsTable({
  rows,
  rootRows,
  allChildrenByParentId,
  visibleChildrenByParentId,
  enableSubprojectExpansion = false,
  isLoading = false,
  onRowClick,
  onSubprojectRowClick,
  isMemberRole = false,
  canDelete = false,
  deletingProjectId = null,
  onRequestDelete,
  showActions = true,
  projectColumnLabel,
  emptyMessage,
  deleteLabels,
}: CrmProjectsTableProps): ReactElement {
  const [expandedParentIds, setExpandedParentIds] = useState<ReadonlySet<string>>(() => new Set());

  const toggleExpanded = (parentId: string): void => {
    setExpandedParentIds((current) => {
      const next = new Set(current);
      if (next.has(parentId)) next.delete(parentId);
      else next.add(parentId);
      return next;
    });
  };

  const displayRoots = enableSubprojectExpansion ? (rootRows ?? []) : (rows ?? []);
  const showTable = displayRoots.length > 0 || isLoading;
  const tableInnerClass = isMemberRole
    ? `${styles.tableInner} ${styles.tableInnerMember}`
    : styles.tableInner;
  const projectHeader = projectColumnLabel ?? COLUMNS.project;

  return (
    <div className={styles.tableWrap}>
      <div className={styles.scrollContainer} role="region" aria-label={content.crm.table.regionAriaLabel}>
        <div className={tableInnerClass}>
          <div className={styles.tableGridShell}>
            <div className={styles.gridHeader} role="row">
              <span role="columnheader">{projectHeader}</span>
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
              {!isMemberRole && showActions ? (
                <span role="columnheader" className={styles.gridHeaderActions}>
                  {COLUMNS.actions}
                </span>
              ) : null}
            </div>
            <div className={styles.gridBody} role="rowgroup">
              {!showTable ? (
                <p className={styles.emptyState}>{emptyMessage ?? content.crm.table.empty}</p>
              ) : (
                displayRoots.flatMap((project) => {
                  const childCount = allChildrenByParentId?.get(project.id)?.length ?? 0;
                  const hasChildren = enableSubprojectExpansion && childCount > 0;
                  const isExpanded = expandedParentIds.has(project.id);
                  const visibleChildren = visibleChildrenByParentId?.get(project.id) ?? [];

                  const rootRow = (
                    <CrmProjectTableRow
                      key={project.id}
                      project={project}
                      variant="root"
                      onRowClick={() => onRowClick(project)}
                      isMemberRole={isMemberRole}
                      canDelete={canDelete && showActions}
                      showActions={showActions}
                      deleting={deletingProjectId === project.id}
                      onRequestDelete={onRequestDelete}
                      deleteLabels={deleteLabels}
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggleExpand={hasChildren ? () => toggleExpanded(project.id) : undefined}
                    />
                  );

                  if (!enableSubprojectExpansion || !isExpanded || visibleChildren.length === 0) {
                    return [rootRow];
                  }

                  const childRows = visibleChildren.map((child) => (
                    <CrmProjectTableRow
                      key={child.id}
                      project={child}
                      variant="child"
                      onRowClick={() =>
                        onSubprojectRowClick
                          ? onSubprojectRowClick(project, child)
                          : onRowClick(child)
                      }
                      isMemberRole={isMemberRole}
                      canDelete={canDelete && showActions}
                      showActions={showActions}
                      deleting={deletingProjectId === child.id}
                      onRequestDelete={onRequestDelete}
                      deleteLabels={deleteLabels}
                    />
                  ));

                  return [rootRow, ...childRows];
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
