'use client';

import { useMemo, useState, type ReactElement, type ReactNode } from 'react';
import { LuArrowUpDown, LuBuilding2, LuLayers3, LuMoveUpRight, LuTriangleAlert } from 'react-icons/lu';
import type { CrmProjectSummary } from '@/domain/crm';
import type { CrmProjectPaymentTasksIndex, ProjectPaymentFinancials } from '@/domain/crm/projectPaymentValue';
import type { CrmProjectWorkflowProgressInputIndex } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmProjectsListV2PageSummary } from '@/domain/crm/projectsListV2';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCrmProjectsDashboardRowModels } from '@/presentation/features/crmProjects/buildCrmProjectsDashboardRowModels';
import { useDashboardSubprojectExpansion } from '@/presentation/features/crmProjects/useDashboardSubprojectExpansion';
import type { BulkSelectionBindings } from '@/presentation/features/bulkSelection/BulkSelectionBindings';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection';
import { WorkflowTableStatusRefresh } from '@/presentation/components/CrmProjectDetail/WorkflowTableStatusRefresh';
import { formatCentsAsUsd } from '@/presentation/features/crmProjects/crmProjectFormatters';
import { resolveProjectWorkflowProgressDisplayFromIndex } from '@/domain/buildcore/projectPipelineProgress';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { CrmProjectTableRow } from './CrmProjectTableRow';
import styles from './CrmProjects.module.css';

const COLUMNS = content.crm.table.columns;
type DashboardSortKey = 'project' | 'progress' | 'value' | 'balance' | 'assigned';
type DashboardSortDirection = 'asc' | 'desc';

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
  /** Phase 1B: bounded page summaries (skips org-wide rollup Maps when set). */
  pageSummariesByProjectId?: ReadonlyMap<string, CrmProjectsListV2PageSummary>;
  /** Phase 1B: Subproject pill counts from page items (available before summaries hydrate). */
  childCountByParentId?: ReadonlyMap<string, number>;
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
  showActions?: boolean;
  projectColumnLabel?: string;
  emptyMessage?: string;
  deleteLabels?: CrmProjectsTableDeleteLabels;
  bulkSelection?: BulkSelectionBindings;
  onContactCopied?: (message: string) => void;
  /**
   * Flat subprojects list: show parent project name under the subproject title
   * (same column count as projects view — no separate Project column).
   */
  showParentProjectColumn?: boolean;
  parentById?: ReadonlyMap<string, CrmProjectSummary>;
  /** `progress` = calm light-blue (default); `success` = legacy green. */
  progressTone?: 'success' | 'progress';
  /**
   * Always-on Gmail-style chrome: select | unlabeled primary (filter/refresh/bulk) | Contact…
   * Hides the project/subproject column header label.
   */
  readonly inlineSelectionChrome?: boolean;
  readonly leadingFilter?: ReactNode;
  readonly onRefresh?: () => Promise<void>;
  readonly onRefreshError?: (message: string) => void;
  /** Shown in the primary header instead of refresh when rows are selected. */
  readonly bulkHeaderActions?: ReactNode;
  /** Apply workflow-stage-like table shell/cell chrome (used in detail tabs). */
  readonly workflowLikeTableChrome?: boolean;
  /** Desktop dashboard: keep table header fixed and scroll only row body. */
  readonly rowsScrollOnly?: boolean;
  /** Optional inline-header collapse state/toggle (used by detail tab tables). */
  readonly headerCollapsed?: boolean;
  readonly onToggleHeaderCollapse?: () => void;
  readonly showHeaderCollapseToggle?: boolean;
  /** Optional extra metric appended to the inline header count pill. */
  readonly inlineHeaderCountSuffix?: string | null;
  /** Optional centered first-run empty state (e.g. no projects in DB yet). */
  readonly firstRunEmptyTitle?: string | null;
  readonly firstRunEmptyActionLabel?: string | null;
  readonly onFirstRunEmptyAction?: (() => void) | null;
  /** BuildCore dashboard desktop-only compact financial pipeline presentation. */
  readonly dashboardCompactLayout?: boolean;
  /** Optional controls anchored in the final dashboard KPI cell. */
  readonly dashboardTableToolbar?: ReactNode;
};

export function CrmProjectsTable({
  rows,
  rootRows,
  allChildrenByParentId,
  visibleChildrenByParentId,
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
  deletingProjectId = null,
  busyProjectId = null,
  onRequestDelete,
  onTogglePriority,
  showActions = true,
  projectColumnLabel,
  emptyMessage,
  bulkSelection,
  onContactCopied,
  showParentProjectColumn = false,
  parentById,
  progressTone = 'progress',
  inlineSelectionChrome = false,
  leadingFilter = null,
  onRefresh,
  onRefreshError,
  bulkHeaderActions = null,
  workflowLikeTableChrome = false,
  rowsScrollOnly = false,
  headerCollapsed = false,
  onToggleHeaderCollapse,
  showHeaderCollapseToggle = false,
  inlineHeaderCountSuffix = null,
  firstRunEmptyTitle = null,
  firstRunEmptyActionLabel = null,
  onFirstRunEmptyAction = null,
  dashboardCompactLayout = false,
  dashboardTableToolbar = null,
}: CrmProjectsTableProps): ReactElement {
  const { getCatalog } = useBuildCorePipelineStages();
  const [dashboardSort, setDashboardSort] = useState<{
    key: DashboardSortKey;
    direction: DashboardSortDirection;
  } | null>(null);
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
  const showFirstRunEmptyState = !showTable && firstRunEmptyTitle != null;
  const tableCopy = content.crm.table;
  const valueLabels = tableCopy.columns;
  const showSelectColumn = bulkSelection?.mode === true;
  const showInlineChrome = inlineSelectionChrome;
  const tableInnerClass = [
    isMemberRole ? `${styles.tableInner} ${styles.tableInnerMember}` : styles.tableInner,
    showSelectColumn ? styles.tableInnerWithBulkSelection : '',
    showInlineChrome ? styles.tableInnerWithInlineSelection : '',
    dashboardCompactLayout ? styles.tableInnerDashboardCompact : '',
  ]
    .filter(Boolean)
    .join(' ');
  const projectHeader = projectColumnLabel ?? COLUMNS.project;
  const inlineHeaderCountLabel = displayRoots.length === 1 ? '1 item' : `${displayRoots.length} items`;
  const inlineHeaderPillLabel =
    inlineHeaderCountSuffix != null && inlineHeaderCountSuffix.trim().length > 0
      ? `${inlineHeaderCountLabel} ${inlineHeaderCountSuffix}`
      : inlineHeaderCountLabel;

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
    paymentTasksIndex,
    toggleExpanded,
    valueLabels.projectValueLabel,
    valueLabels.subValueLabel,
    visibleChildrenByParentId,
    parentById,
  ]);

  const dashboardMetrics = useMemo(
    () =>
      rowModels.reduce(
        (totals, row) => {
          if (row.variant === 'child') return totals;
          totals.valueCents += row.financials.valueCents;
          totals.collectedCents += row.financials.collectedCents;
          totals.balanceCents += row.financials.balanceCents;
          if (row.project.priority === 'urgent') totals.needsAttention += 1;
          totals.projects += 1;
          return totals;
        },
        { valueCents: 0, collectedCents: 0, balanceCents: 0, needsAttention: 0, projects: 0 }
      ),
    [rowModels]
  );

  const sortedRowModels = useMemo(() => {
    if (!dashboardCompactLayout || dashboardSort == null) return rowModels;
    const groups = rowModels.reduce<typeof rowModels[]>((result, row) => {
      if (row.variant === 'root' || result.length === 0) result.push([row]);
      else result[result.length - 1]?.push(row);
      return result;
    }, []);
    const direction = dashboardSort.direction === 'asc' ? 1 : -1;
    const valueFor = (row: (typeof rowModels)[number]): string | number => {
      if (dashboardSort.key === 'project') return row.project.name.trim().toLocaleLowerCase();
      if (dashboardSort.key === 'value') return row.financials.valueCents;
      if (dashboardSort.key === 'balance') return row.financials.balanceCents;
      if (dashboardSort.key === 'assigned') {
        return row.project.assignedTo?.displayName.trim().toLocaleLowerCase() ?? '\uffff';
      }
      const summaryProgress = pageSummariesByProjectId?.get(row.project.id)?.progress?.textPercent;
      if (summaryProgress != null) return summaryProgress;
      if (workflowProgressInputIndex == null) return 0;
      return resolveProjectWorkflowProgressDisplayFromIndex({
        summary: row.project,
        workflowProgressInputIndex,
        stages: getCatalog(
          resolvePipelineStageScopeForProject({
            parentProjectId: row.project.parentProjectId,
          })
        ),
      }).textPercent;
    };
    groups.sort((left, right) => {
      const a = valueFor(left[0]!);
      const b = valueFor(right[0]!);
      return (typeof a === 'string' && typeof b === 'string'
        ? a.localeCompare(b)
        : Number(a) - Number(b)) * direction;
    });
    return groups.flat();
  }, [
    dashboardCompactLayout,
    dashboardSort,
    getCatalog,
    pageSummariesByProjectId,
    rowModels,
    workflowProgressInputIndex,
  ]);

  const toggleDashboardSort = (key: DashboardSortKey): void => {
    setDashboardSort((current) => {
      if (current?.key !== key) return { key, direction: 'asc' };
      if (current.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortableHeader = (key: DashboardSortKey, label: string): ReactElement => (
    <button
      type="button"
      className={styles.dashboardSortButton}
      onClick={() => toggleDashboardSort(key)}
      aria-label={
        dashboardSort?.key !== key
          ? `Sort ${label} ascending`
          : dashboardSort.direction === 'asc'
            ? `Sort ${label} descending`
            : `Clear ${label} sorting and restore default order`
      }
      aria-pressed={dashboardSort?.key === key}
    >
      <LuArrowUpDown aria-hidden />
      <span>{label}</span>
    </button>
  );

  const tableWrapClass = [
    styles.tableWrap,
    workflowLikeTableChrome ? styles.tableWrap_workflowLikeChrome : '',
    rowsScrollOnly ? styles.tableWrap_rowsScrollOnly : '',
    dashboardCompactLayout ? styles.tableWrapDashboardCompact : '',
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <div className={tableWrapClass}>
      {dashboardCompactLayout && !isMemberRole ? (
        <div className={styles.dashboardKpiStrip} aria-label="Project pipeline summary">
          <div className={`${styles.dashboardKpiItem} ${styles.dashboardKpiItemPipeline}`}>
            <span><LuBuilding2 aria-hidden />Pipeline value</span>
            <strong>{formatCentsAsUsd(dashboardMetrics.valueCents)}</strong>
            <small>{dashboardMetrics.projects} projects</small>
          </div>
          <div className={`${styles.dashboardKpiItem} ${styles.dashboardKpiItemCollected}`}>
            <span><LuLayers3 aria-hidden />Collected</span>
            <strong>{formatCentsAsUsd(dashboardMetrics.collectedCents)}</strong>
            <small>Received to date</small>
          </div>
          <div className={`${styles.dashboardKpiItem} ${styles.dashboardKpiItemOutstanding}`}>
            <span><LuMoveUpRight aria-hidden />Outstanding balance</span>
            <strong>{formatCentsAsUsd(dashboardMetrics.balanceCents)}</strong>
            <small>Awaiting collection</small>
          </div>
          <div className={`${styles.dashboardKpiItem} ${styles.dashboardKpiItemAttention}`}>
            <span><LuTriangleAlert aria-hidden />Needs attention</span>
            <strong>{dashboardMetrics.needsAttention}</strong>
            <small>Priority projects</small>
            {dashboardTableToolbar != null ? (
              <div className={styles.dashboardKpiPagination}>{dashboardTableToolbar}</div>
            ) : null}
          </div>
        </div>
      ) : null}
      <div className={styles.scrollContainer} role="region" aria-label={content.crm.table.regionAriaLabel}>
        <div className={tableInnerClass}>
          <div className={styles.tableGridShell}>
            <div className={styles.gridHeader} role="row">
              {showSelectColumn && bulkSelection != null ? (
                <span role="columnheader" className={styles.gridHeaderBulkSelect}>
                  <BulkSelectCheckbox
                    checked={bulkSelection.allVisibleSelected}
                    indeterminate={bulkSelection.someVisibleSelected}
                    ariaLabel={bulkSelection.selectAllAriaLabel}
                    onChange={() => {
                      bulkSelection.onToggleAllVisible();
                    }}
                  />
                </span>
              ) : null}
              {showInlineChrome ? (
                <span
                  role="columnheader"
                  className={[
                    styles.gridHeaderPrimary,
                    workflowLikeTableChrome ? styles.gridHeaderPrimary_workflowLike : '',
                  ]
                    .filter(Boolean)
                    .join(' ')}
                  aria-label={bulkHeaderActions != null ? undefined : projectHeader}
                >
                  {workflowLikeTableChrome ? (
                    <button
                      type="button"
                      className={styles.gridHeaderPrimaryWorkflowButton}
                      aria-expanded={!headerCollapsed}
                      aria-label={`${headerCollapsed ? 'Expand' : 'Collapse'} ${projectHeader}`}
                      onClick={(event) => {
                        event.stopPropagation();
                        onToggleHeaderCollapse?.();
                      }}
                    >
                      <span className={styles.gridHeaderPrimaryWorkflowTitle}>
                      <span className={styles.gridHeaderPrimaryWorkflowName}>
                        {dashboardCompactLayout ? sortableHeader('project', projectHeader) : projectHeader}
                      </span>
                        {bulkHeaderActions == null ? (
                          <span className={styles.gridHeaderPrimaryWorkflowCount}>
                            {inlineHeaderPillLabel}
                          </span>
                        ) : null}
                        {showHeaderCollapseToggle ? (
                          <span className={styles.projectsExpandAllChevronWrap} aria-hidden>
                            <span
                              className={
                                headerCollapsed
                                  ? styles.projectsExpandAllChevron
                                  : styles.projectsExpandAllChevron_expanded
                              }
                            />
                          </span>
                        ) : null}
                      </span>
                    </button>
                  ) : (
                    <span className={styles.gridHeaderPrimaryLabelWrap}>
                      <span className={styles.gridHeaderPrimaryLabel}>
                        {dashboardCompactLayout ? sortableHeader('project', projectHeader) : projectHeader}
                      </span>
                      {showHeaderCollapseToggle ? (
                        <button
                          type="button"
                          className={styles.gridHeaderCollapseBtn}
                          aria-expanded={!headerCollapsed}
                          aria-label={`${headerCollapsed ? 'Expand' : 'Collapse'} ${projectHeader}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            onToggleHeaderCollapse?.();
                          }}
                        >
                          <span className={styles.projectsExpandAllChevronWrap} aria-hidden>
                            <span
                              className={
                                headerCollapsed
                                  ? styles.projectsExpandAllChevron
                                  : styles.projectsExpandAllChevron_expanded
                              }
                            />
                          </span>
                        </button>
                      ) : null}
                    </span>
                  )}
                  {leadingFilter}
                  {bulkHeaderActions != null ? (
                    bulkHeaderActions
                  ) : onRefresh != null ? (
                    <WorkflowTableStatusRefresh
                      onRefresh={onRefresh}
                      onError={onRefreshError}
                    />
                  ) : null}
                </span>
              ) : (
                <span role="columnheader">{projectHeader}</span>
              )}
              {dashboardCompactLayout ? (
                <>
                  <span role="columnheader">Client</span>
                  <span role="columnheader">Stage</span>
                  <span role="columnheader">{sortableHeader('progress', 'Progress')}</span>
                </>
              ) : (
                <>
                  <span role="columnheader">{COLUMNS.contact}</span>
                  <span role="columnheader">{COLUMNS.email}</span>
                  <span role="columnheader">{COLUMNS.phone}</span>
                  <span role="columnheader">{COLUMNS.address}</span>
                  <span role="columnheader">{COLUMNS.notes}</span>
                </>
              )}
              {!isMemberRole ? (
                <>
                  <span role="columnheader" className={styles.gridHeaderFinancial}>
                    {dashboardCompactLayout ? sortableHeader('value', COLUMNS.value) : COLUMNS.value}
                  </span>
                  {dashboardCompactLayout ? (
                    <span role="columnheader" className={styles.gridHeaderFinancial}>{sortableHeader('balance', 'Balance')}</span>
                  ) : (
                    <>
                      <span role="columnheader" className={styles.gridHeaderFinancial}>{COLUMNS.collected}</span>
                      <span role="columnheader" className={styles.gridHeaderFinancial}>{COLUMNS.balance}</span>
                    </>
                  )}
                </>
              ) : null}
              <span role="columnheader" className={styles.gridHeaderAssignee}>
                {dashboardCompactLayout ? sortableHeader('assigned', COLUMNS.assigned) : COLUMNS.assigned}
              </span>
              {!isMemberRole && showActions ? (
                <span
                  role="columnheader"
                  className={styles.gridHeaderActions}
                  aria-label={workflowLikeTableChrome ? COLUMNS.actions : undefined}
                >
                  {workflowLikeTableChrome ? null : COLUMNS.actions}
                </span>
              ) : null}
            </div>
            <div
              className={[
                styles.gridBody,
                showFirstRunEmptyState ? styles.gridBodyWithCenteredEmpty : '',
              ]
                .filter(Boolean)
                .join(' ')}
              role="rowgroup"
            >
              {!showTable ? (
                showFirstRunEmptyState ? (
                  <div className={styles.emptyStateCenterWrap}>
                    {firstRunEmptyActionLabel != null && onFirstRunEmptyAction != null ? (
                      <button
                        type="button"
                        className={styles.emptyStateCardButton}
                        aria-label={firstRunEmptyActionLabel}
                        onClick={onFirstRunEmptyAction}
                      >
                        <span className={styles.emptyStateActionRow}>
                          <span className={styles.emptyStateActionPlus} aria-hidden>
                            +
                          </span>
                          <span className={styles.emptyStateActionText}>
                            {firstRunEmptyActionLabel}
                          </span>
                        </span>
                      </button>
                    ) : (
                      <div className={styles.emptyStateCardButtonStatic}>
                        <span className={styles.emptyStateTitle}>{firstRunEmptyTitle}</span>
                      </div>
                    )}
                  </div>
                ) : (
                  <p className={styles.emptyState}>{emptyMessage ?? content.crm.table.empty}</p>
                )
              ) : (
                sortedRowModels.map((row) => (
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
                    hasChildren={row.hasChildren}
                    isExpanded={row.isExpanded}
                    onToggleExpand={row.onToggleExpand}
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
                            progress: pageSummariesByProjectId.get(row.project.id)?.progress ?? null,
                            derivedStageSlug:
                              pageSummariesByProjectId.get(row.project.id)?.derivedStageSlug ??
                              null,
                          }
                    }
                    bulkSelection={bulkSelection}
                    onContactCopied={onContactCopied}
                    showParentProjectColumn={showParentProjectColumn}
                    parentProjectName={row.parentProjectName}
                    subprojectCount={row.subprojectCount}
                    progressTone={progressTone}
                    showContactIcons={workflowLikeTableChrome}
                    dashboardCompactLayout={dashboardCompactLayout}
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
