'use client';

import { useMemo, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex, ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmProjectsListV2PageSummary } from '@/domain/crm/projectsListV2';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCrmProjectsDashboardRowModels } from '@/presentation/features/crmProjects/buildCrmProjectsDashboardRowModels';
import { useDashboardSubprojectExpansion } from '@/presentation/features/crmProjects/useDashboardSubprojectExpansion';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { CrmProjectMobileCard } from './CrmProjectMobileCard';
import styles from './CrmProjects.module.css';

export type CrmProjectsMobileListProps = {
  rows?: readonly CrmProjectSummary[];
  rootRows?: readonly CrmProjectSummary[];
  allChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  visibleChildrenByParentId?: ReadonlyMap<string, readonly CrmProjectSummary[]>;
  parentById?: ReadonlyMap<string, CrmProjectSummary>;
  paymentTasksIndex?: CrmProjectPaymentTasksIndex;
  workflowProgressInputIndex?: CrmProjectWorkflowProgressInputIndex;
  isWorkflowProgressLoading?: boolean;
  pageSummariesByProjectId?: ReadonlyMap<string, CrmProjectsListV2PageSummary>;
  childCountByParentId?: ReadonlyMap<string, number>;
  enableSubprojectExpansion?: boolean;
  autoExpandParentsWithSubprojects?: boolean;
  expandedParentIds?: ReadonlySet<string>;
  onExpandedParentIdsChange?: React.Dispatch<React.SetStateAction<ReadonlySet<string>>>;
  isLoading?: boolean;
  isPaymentFinancialsLoading?: boolean;
  onRowClick: (project: CrmProjectSummary) => void;
  onSubprojectRowClick?: (parent: CrmProjectSummary, child: CrmProjectSummary) => void;
  isMemberRole?: boolean;
  canDelete?: boolean;
  bulkSelection?: BulkSelectionBindings;
  deletingProjectId?: string | null;
  busyProjectId?: string | null;
  onRequestDelete?: (project: CrmProjectSummary) => void;
  onTogglePriority?: (project: CrmProjectSummary) => void | Promise<void>;
  onRequestCompletionChange?: (project: CrmProjectSummary) => void;
  onRequestMarkInactive?: (project: CrmProjectSummary) => void;
  onRequestMarkActive?: (project: CrmProjectSummary) => void | Promise<void>;
  showActions?: boolean;
  emptyMessage?: string;
};

export function CrmProjectsMobileList({
  rows,
  rootRows = [],
  allChildrenByParentId,
  visibleChildrenByParentId,
  parentById,
  paymentTasksIndex,
  workflowProgressInputIndex,
  isWorkflowProgressLoading = false,
  pageSummariesByProjectId,
  childCountByParentId: childCountByParentIdProp,
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
  bulkSelection,
  deletingProjectId = null,
  busyProjectId = null,
  onRequestDelete,
  onTogglePriority,
  onRequestCompletionChange,
  onRequestMarkInactive,
  onRequestMarkActive,
  showActions = true,
  emptyMessage,
}: CrmProjectsMobileListProps): ReactElement {
  const displayRoots = useMemo(
    () => (enableSubprojectExpansion ? rootRows : (rows ?? [])),
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

  const showList = displayRoots.length > 0 || isLoading;
  const valueLabels = content.crm.table.columns;

  const rowModels = useMemo(() => {
    const resolvedPaymentTasksIndex = paymentTasksIndex ?? new Map<string, never>();
    const financialsByProjectId =
      pageSummariesByProjectId == null
        ? undefined
        : new Map<string, ProjectPaymentFinancials>(
            [...pageSummariesByProjectId.entries()].map(([id, summary]) => [
              id,
              summary.payment,
            ])
          );
    const childCountByParentId = (() => {
      if (childCountByParentIdProp != null) return childCountByParentIdProp;
      if (pageSummariesByProjectId == null) return undefined;
      return new Map(
        [...pageSummariesByProjectId.entries()].map(([id, summary]) => [
          id,
          summary.childCount ?? 0,
        ])
      );
    })();
    return buildCrmProjectsDashboardRowModels({
      displayRoots,
      enableSubprojectExpansion,
      expandedParentIds,
      allChildrenByParentId,
      visibleChildrenByParentId,
      parentById,
      paymentTasksIndex: resolvedPaymentTasksIndex,
      financialsByProjectId,
      childCountByParentId,
      projectValueLabel: valueLabels.projectValueLabel,
      subValueLabel: valueLabels.subValueLabel,
      onRowClick,
      onSubprojectRowClick,
      toggleExpanded,
    });
  }, [
    allChildrenByParentId,
    childCountByParentIdProp,
    displayRoots,
    enableSubprojectExpansion,
    expandedParentIds,
    onRowClick,
    onSubprojectRowClick,
    pageSummariesByProjectId,
    parentById,
    paymentTasksIndex,
    toggleExpanded,
    valueLabels.projectValueLabel,
    valueLabels.subValueLabel,
    visibleChildrenByParentId,
  ]);

  return (
    <div className={styles.mobileListWrap} role="region" aria-label={content.crm.table.regionAriaLabel}>
      {!showList ? (
        <p className={styles.mobileEmptyState}>{emptyMessage ?? content.crm.table.empty}</p>
      ) : (
        <ul className={styles.mobileList}>
          {rowModels.map((row) => (
            <li key={row.key} className={styles.mobileListItem}>
              <CrmProjectMobileCard
                project={row.project}
                variant={row.variant}
                financials={row.financials}
                valueLabel={row.valueLabel}
                financialsLoading={isPaymentFinancialsLoading}
                onRowClick={row.onRowClick}
                isMemberRole={isMemberRole}
                canDelete={canDelete && showActions}
                bulkSelection={bulkSelection}
                showActions={showActions}
                busy={busyProjectId === row.project.id}
                deleting={deletingProjectId === row.project.id}
                onRequestDelete={onRequestDelete}
                onTogglePriority={onTogglePriority}
                onRequestCompletionChange={onRequestCompletionChange}
                onRequestMarkInactive={onRequestMarkInactive}
                onRequestMarkActive={onRequestMarkActive}
                hasChildren={row.hasChildren}
                isExpanded={row.isExpanded}
                onToggleExpand={row.onToggleExpand}
                parentProjectName={row.parentProjectName}
                showContactInfo
                workflowProgressInputIndex={
                  pageSummariesByProjectId != null ? undefined : workflowProgressInputIndex
                }
                isWorkflowProgressLoading={
                  pageSummariesByProjectId != null
                    ? isPaymentFinancialsLoading
                    : isWorkflowProgressLoading
                }
                presentationOverrides={
                  pageSummariesByProjectId == null
                    ? null
                    : {
                        progress:
                          pageSummariesByProjectId.get(row.project.id)?.progress ?? null,
                        derivedStageSlug:
                          pageSummariesByProjectId.get(row.project.id)?.derivedStageSlug ??
                          null,
                      }
                }
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
