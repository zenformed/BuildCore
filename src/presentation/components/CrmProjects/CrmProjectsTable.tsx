'use client';

import { useState, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  resolveDashboardChildRowFinancials,
  resolveDashboardRootRowFinancials,
} from '@/presentation/features/crmProjects/projectPaymentFinancials';
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
  paymentTasksIndex?: CrmProjectPaymentTasksIndex;
  workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  isWorkflowProgressLoading?: boolean;
  enableSubprojectExpansion?: boolean;
  isLoading?: boolean;
  isPaymentFinancialsLoading?: boolean;
  onRowClick: (project: CrmProjectSummary) => void;
  onSubprojectRowClick?: (parent: CrmProjectSummary, child: CrmProjectSummary) => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  deletingProjectId?: string | null;
  busyProjectId?: string | null;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  onRequestCompletionChange?: (project: CrmProjectSummary) => void;
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
  paymentTasksIndex,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  enableSubprojectExpansion = false,
  isLoading = false,
  isPaymentFinancialsLoading = false,
  onRowClick,
  onSubprojectRowClick,
  isMemberRole = false,
  canDelete = false,
  deletingProjectId = null,
  busyProjectId = null,
  onRequestDelete,
  onTogglePriority,
  onRequestCompletionChange,
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
  const resolvedPaymentTasksIndex = paymentTasksIndex ?? new Map<string, never>();
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
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
              <span role="columnheader">{COLUMNS.address}</span>
              <span role="columnheader">{COLUMNS.notes}</span>
              {!isMemberRole ? (
                <>
                  <span role="columnheader" className={styles.gridHeaderFinancial}>
                    {COLUMNS.value}
                  </span>
                  <span role="columnheader" className={styles.gridHeaderFinancial}>
                    {COLUMNS.collected}
                  </span>
                  <span role="columnheader" className={styles.gridHeaderFinancial}>
                    {COLUMNS.balance}
                  </span>
                </>
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
                  const isStandaloneChild =
                    !enableSubprojectExpansion && project.parentProjectId != null;
                  const rowFinancials = isStandaloneChild
                    ? resolveDashboardChildRowFinancials(project, resolvedPaymentTasksIndex)
                    : resolveDashboardRootRowFinancials(
                        project,
                        visibleChildren,
                        resolvedPaymentTasksIndex
                      );
                  const rowVariant = isStandaloneChild ? 'child' : 'root';
                  const rowValueLabel = isStandaloneChild
                    ? valueLabels.subValueLabel
                    : valueLabels.projectValueLabel;

                  const rootRow = (
                    <CrmProjectTableRow
                      key={project.id}
                      project={project}
                      variant={rowVariant}
                      financials={rowFinancials}
                      valueLabel={rowValueLabel}
                      financialsLoading={isPaymentFinancialsLoading}
                      onRowClick={() => onRowClick(project)}
                      isMemberRole={isMemberRole}
                      canDelete={canDelete && showActions}
                      showActions={showActions}
                      busy={busyProjectId === project.id}
                      deleting={deletingProjectId === project.id}
                      onRequestDelete={onRequestDelete}
                      onTogglePriority={onTogglePriority}
                      onRequestCompletionChange={onRequestCompletionChange}
                      hasChildren={hasChildren}
                      isExpanded={isExpanded}
                      onToggleExpand={hasChildren ? () => toggleExpanded(project.id) : undefined}
                      workflowProgressInputIndex={workflowProgressInputIndex}
                      isWorkflowProgressLoading={isWorkflowProgressLoading}
                    />
                  );

                  if (!enableSubprojectExpansion || !isExpanded || visibleChildren.length === 0) {
                    return [rootRow];
                  }

                  const childRows = visibleChildren.map((child) => {
                    const childFinancials = resolveDashboardChildRowFinancials(
                      child,
                      resolvedPaymentTasksIndex
                    );
                    return (
                    <CrmProjectTableRow
                      key={child.id}
                      project={child}
                      variant="child"
                      financials={childFinancials}
                      valueLabel={valueLabels.subValueLabel}
                      financialsLoading={isPaymentFinancialsLoading}
                      onRowClick={() =>
                        onSubprojectRowClick
                          ? onSubprojectRowClick(project, child)
                          : onRowClick(child)
                      }
                      isMemberRole={isMemberRole}
                      canDelete={canDelete && showActions}
                      showActions={showActions}
                      busy={busyProjectId === child.id}
                      deleting={deletingProjectId === child.id}
                      onRequestDelete={onRequestDelete}
                      onTogglePriority={onTogglePriority}
                      onRequestCompletionChange={onRequestCompletionChange}
                      workflowProgressInputIndex={workflowProgressInputIndex}
                      isWorkflowProgressLoading={isWorkflowProgressLoading}
                    />
                    );
                  });

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
