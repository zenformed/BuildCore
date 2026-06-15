'use client';

import { useMemo, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCrmProjectsDashboardRowModels } from '@/presentation/features/crmProjects/buildCrmProjectsDashboardRowModels';
import { useDashboardSubprojectExpansion } from '@/presentation/features/crmProjects/useDashboardSubprojectExpansion';
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
  /** When true, parents with subprojects are expanded (e.g. priority filter active). */
  autoExpandParentsWithSubprojects?: boolean;
  expandedParentIds?: ReadonlySet<string>;
  onExpandedParentIdsChange?: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
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
  autoExpandParentsWithSubprojects = false,
  expandedParentIds: expandedParentIdsProp,
  onExpandedParentIdsChange,
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
}: CrmProjectsTableProps): ReactElement {
  const displayRoots = useMemo(
    () => (enableSubprojectExpansion ? (rootRows ?? []) : (rows ?? [])),
    [enableSubprojectExpansion, rootRows, rows]
  );

  const { expandedParentIds, toggleExpanded } = useDashboardSubprojectExpansion({
    expandedParentIds: expandedParentIdsProp,
    onExpandedParentIdsChange,
    displayRoots,
    allChildrenByParentId,
    enableSubprojectExpansion,
    autoExpandParentsWithSubprojects,
  });

  const showTable = displayRoots.length > 0 || isLoading;
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const tableInnerClass = isMemberRole
    ? `${styles.tableInner} ${styles.tableInnerMember}`
    : styles.tableInner;
  const projectHeader = projectColumnLabel ?? COLUMNS.project;

  const rowModels = useMemo(() => {
    const resolvedPaymentTasksIndex = paymentTasksIndex ?? new Map<string, never>();
    return buildCrmProjectsDashboardRowModels({
      displayRoots,
      enableSubprojectExpansion,
      expandedParentIds,
      allChildrenByParentId,
      visibleChildrenByParentId,
      paymentTasksIndex: resolvedPaymentTasksIndex,
      projectValueLabel: valueLabels.projectValueLabel,
      subValueLabel: valueLabels.subValueLabel,
      onRowClick,
      onSubprojectRowClick,
      toggleExpanded,
    });
  }, [
    allChildrenByParentId,
    displayRoots,
    enableSubprojectExpansion,
    expandedParentIds,
    onRowClick,
    onSubprojectRowClick,
    paymentTasksIndex,
    toggleExpanded,
    valueLabels.projectValueLabel,
    valueLabels.subValueLabel,
    visibleChildrenByParentId,
  ]);

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
                rowModels.map((row) => (
                  <CrmProjectTableRow
                    key={row.key}
                    project={row.project}
                    variant={row.variant}
                    financials={row.financials}
                    valueLabel={row.valueLabel}
                    financialsLoading={isPaymentFinancialsLoading}
                    onRowClick={row.onRowClick}
                    isMemberRole={isMemberRole}
                    canDelete={canDelete && showActions}
                    showActions={showActions}
                    busy={busyProjectId === row.project.id}
                    deleting={deletingProjectId === row.project.id}
                    onRequestDelete={onRequestDelete}
                    onTogglePriority={onTogglePriority}
                    onRequestCompletionChange={onRequestCompletionChange}
                    hasChildren={row.hasChildren}
                    isExpanded={row.isExpanded}
                    onToggleExpand={row.onToggleExpand}
                    workflowProgressInputIndex={workflowProgressInputIndex}
                    isWorkflowProgressLoading={isWorkflowProgressLoading}
                  />
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
