'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import { LuSearch } from 'react-icons/lu';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { listPaymentMilestones } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import {
  buildCrmAssigneeFilterOptionsFromTasks,
  filterPaymentMilestonesByListFilters,
  filterPaymentMilestonesBySearch,
} from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { WorkflowTaskRowSelectionProvider } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  isCrmProjectsListFiltersActive,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelHeaderMoreMenu } from './DetailPanelHeaderMoreMenu';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import { CrmDirectUploadStatusHost } from './CrmDirectUploadStatus';
import projectsStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import {
  WorkflowMobileHideWhenBulkActive,
  WorkflowMobileSearchToolsRow,
  WorkflowMobileSelectedFloatingPill,
} from './MobileBulkSelectionChrome';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { WorkflowTableBulkActions } from './WorkflowTableBulkActions';
import { BulkSelectCheckbox } from '@/presentation/components/BulkSelection/BulkSelectCheckbox';
import {
  isMemberCompletedWorkflowTask,
  MemberCompletedTasksSection,
} from './MemberCompletedTasksSection';
import { MemberNoActiveTasksRow } from './MemberNoActiveTasksRow';
import { useBuildCorePaymentTableColumns } from '@/presentation/providers/BuildCorePaymentTableColumnsProvider';
import { useWorkflowTaskRowSelection } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import styles from './ProjectDetail.module.css';

function PaymentsHeaderSelectCell(): ReactElement {
  const rowSelection = useWorkflowTaskRowSelection();
  if (rowSelection == null) return <span aria-hidden />;
  return (
    <BulkSelectCheckbox
      checked={rowSelection.allVisibleSelected}
      indeterminate={rowSelection.someVisibleSelected}
      ariaLabel={rowSelection.selectAllAriaLabel}
      onChange={() => rowSelection.onToggleAllVisible()}
    />
  );
}

function PaymentsHeaderPrimaryCell({
  label,
  collapsed,
  onToggle,
  taskCount,
}: {
  readonly label: string;
  readonly collapsed: boolean;
  readonly onToggle: () => void;
  readonly taskCount: number;
}): ReactElement {
  const rowSelection = useWorkflowTaskRowSelection();
  const showBulkActions = rowSelection != null && rowSelection.selectedCount > 0;
  const paymentTaskCountLabel = taskCount === 1 ? '1 task' : `${taskCount} tasks`;
  return (
    <span className={styles.stageGroupPrimary}>
      <span className={styles.stageGroupPrimaryCluster}>
        <button
          type="button"
          className={styles.stageGroupHeaderBtn}
          onClick={onToggle}
          aria-expanded={!collapsed}
          aria-label={`${collapsed ? 'Expand' : 'Collapse'} ${label}`}
        >
          <span className={styles.stageGroupTitle}>
            <span className={styles.stageGroupName}>{label}</span>
            {!showBulkActions ? <span className={styles.stageGroupCount}>{paymentTaskCountLabel}</span> : null}
            <span className={styles.stageGroupChevronWrap} aria-hidden>
              <span className={collapsed ? styles.stageGroupChevron : styles.stageGroupChevron_expanded} />
            </span>
          </span>
        </button>
        {showBulkActions ? (
          <span
            className={styles.stageGroupHeaderBulk}
            onClick={(event) => event.stopPropagation()}
            onKeyDown={(event) => event.stopPropagation()}
          >
            <WorkflowTableBulkActions />
          </span>
        ) : null}
      </span>
    </span>
  );
}

export type PaymentsRailProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
  onTaskCreated?: (task: CrmWorkflowTask) => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
  resolveTaskProjectSlug?: (taskId: string) => string;
  taskContextLineById?: ReadonlyMap<string, string>;
  onRefreshTasks?: () => Promise<void>;
  /** When true, header actions render in the shared folder tab bar. */
  embeddedInFolderTabs?: boolean;
};

export function PaymentsRail({
  project,
  isApiSource,
  onTaskUpdated,
  onTaskCreated,
  onTaskError,
  onRequestArchiveTask,
  resolveTaskProjectSlug,
  taskContextLineById,
  onRefreshTasks,
  embeddedInFolderTabs = false,
}: PaymentsRailProps): ReactElement {
  const payments = content.projectDetail.payments;
  const paymentPermissionsCopy = content.teams.paymentPermissions;
  const wf = content.projectDetail.workflow;
  const { refreshWorkflowTasks, setToast, openCreateWorkflowTask, projectMutationsLocked, isMemberRole } =
    useProjectDetailShell();
  const paymentsPanelTitle = isMemberRole ? payments.memberTitle : payments.title;
  const { payment } = useBuildCoreProjectSectionAccess();
  const { permissions, isLoading, isReady } = payment;
  const canView = isReady && permissions.canView;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete && !projectMutationsLocked;
  const milestones = useMemo(
    () => listPaymentMilestones(project.workflowTasks),
    [project.workflowTasks]
  );
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [tableCollapsed, setTableCollapsed] = useState(false);
  const filtersActive = isCrmProjectsListFiltersActive(filters);
  const assigneeFilterOptions = useMemo(
    () =>
      buildCrmAssigneeFilterOptionsFromTasks(
        milestones,
        content.projectDetail.edit.assigneeUnassigned
      ),
    [milestones]
  );
  const filteredMilestones = useMemo(() => {
    const byFilters = filterPaymentMilestonesByListFilters(milestones, filters);
    return filterPaymentMilestonesBySearch(byFilters, searchQuery);
  }, [filters, milestones, searchQuery]);
  const activeMilestones = useMemo(() => {
    if (!isMemberRole) return filteredMilestones;
    return filteredMilestones.filter((task) => !isMemberCompletedWorkflowTask(task.status));
  }, [filteredMilestones, isMemberRole]);
  const completedMilestones = useMemo(() => {
    if (!isMemberRole) return [];
    return filteredMilestones.filter((task) => isMemberCompletedWorkflowTask(task.status));
  }, [filteredMilestones, isMemberRole]);
  const docCounts = countDocumentsByTaskId(project.documents);
  const payCols = content.projectDetail.payments.columns;
  const isMobileLayout = useDashboardMobileLayout();
  const { shellClassName } = useBuildCorePaymentTableColumns();
  const visibleTaskIds = useMemo(
    () => activeMilestones.map((task) => task.id),
    [activeMilestones]
  );
  const tasksById = useMemo(() => {
    const map = new Map<string, CrmWorkflowTask>();
    for (const task of filteredMilestones) {
      map.set(task.id, task);
    }
    return map;
  }, [filteredMilestones]);
  const selectionBulkActions = useMemo(
    () => ({
      canDelete,
      canApprove: permissions.canApprove && !projectMutationsLocked,
      canChangeNonDoneStatus: permissions.canView && !projectMutationsLocked,
      canAssign: permissions.canEdit && !projectMutationsLocked && !isMemberRole,
      canNotifyAssigned:
        permissions.canEdit && isApiSource && !projectMutationsLocked && !isMemberRole,
      tasksById,
      docCountByTaskId: docCounts,
      onTaskUpdated,
    }),
    [
      canDelete,
      docCounts,
      isApiSource,
      onTaskUpdated,
      permissions.canApprove,
      permissions.canEdit,
      permissions.canView,
      projectMutationsLocked,
      isMemberRole,
      tasksById,
    ]
  );

  const showTable =
    canView &&
    (milestones.length > 0 ||
      permissions.canViewAllStages ||
      filtersActive ||
      searchQuery.trim().length > 0);

  const statusFilterCaret = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      sections={['status', 'assigned', 'documentsRequired']}
      assigneeFilterOptions={assigneeFilterOptions}
      triggerVariant="caret"
      menuAlign="start"
    />
  );

  const statusFilterGhost = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      sections={['status', 'assigned', 'documentsRequired']}
      assigneeFilterOptions={assigneeFilterOptions}
      triggerVariant="ghost"
    />
  );

  const searchInput = isMobileLayout ? (
    <div className={styles.subprojectsSearchFieldWrap}>
      <LuSearch className={styles.subprojectsSearchIcon} size={14} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={payments.searchPlaceholder}
        aria-label={payments.searchAriaLabel}
        className={`${styles.subprojectsSearch} ${styles.subprojectsSearch_withIcon}`}
      />
    </div>
  ) : (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={payments.searchPlaceholder}
      ariaLabel={payments.searchAriaLabel}
    />
  );

  const addButton = canCreate ? (
    <div className={styles.detailPanelHeaderBtnWrap}>
      <DetailPanelHeaderButton
        variant="add"
        title={payments.addMilestone}
        onClick={() => openCreateWorkflowTask({ context: 'payment' })}
      />
      <CrmDirectUploadStatusHost />
    </div>
  ) : (
    <div className={styles.detailPanelHeaderBtnWrap}>
      <CrmDirectUploadStatusHost />
    </div>
  );
  const desktopMoreMenu = !isMobileLayout ? (
    <DetailPanelHeaderMoreMenu
      refreshAction={{
        sectionLabel: paymentsPanelTitle,
        onRefresh: onRefreshTasks ?? refreshWorkflowTasks,
        onError: (message) => setToast({ kind: 'error', message }),
      }}
    />
  ) : null;
  const desktopCreateActions = (
    <div className={projectsStyles.desktopCreateActions}>
      {addButton}
      {desktopMoreMenu}
    </div>
  );
  const mobileFloatingAddButton = canCreate ? (
    <button
      type="button"
      className={styles.subprojectsMobileCreateFloatingBtn}
      title={payments.addMilestone}
      aria-label={payments.addMilestone}
      onClick={() => openCreateWorkflowTask({ context: 'payment' })}
    >
      + Create
    </button>
  ) : null;
  const mobileSearchTrailingActions = (
    <div className={styles.workflowMobileSearchActions}>
      {statusFilterGhost}
    </div>
  );
  const mobileHeaderContent = (
    <>
      <WorkflowMobileSearchToolsRow
        searchInput={searchInput}
        trailingActions={mobileSearchTrailingActions}
      />
    </>
  );

  const renderPaymentRow = (task: CrmWorkflowTask, variant: 'table' | 'mobile') => (
    <WorkflowTaskInlineRow
      key={task.id}
      variant={variant}
      projectSlug={resolveTaskProjectSlug?.(task.id) ?? project.summary.slug}
      task={task}
      docCount={docCounts.get(task.id) ?? 0}
      taskDocuments={project.documents.filter((doc) => doc.workflowTaskId === task.id)}
      showAmountColumn
      enablePaymentCustomColumns={variant === 'table'}
      permissionDomain="payments"
      contextLine={taskContextLineById?.get(task.id) ?? null}
      isApiSource={isApiSource}
      onUpdated={onTaskUpdated}
      onTaskError={onTaskError}
      onRequestArchiveTask={canDelete ? onRequestArchiveTask : undefined}
    />
  );

  const memberCompletedSection =
    isMemberRole && completedMilestones.length > 0 ? (
      <MemberCompletedTasksSection taskCount={completedMilestones.length}>
        {isMobileLayout ? (
          <div className={styles.memberCompletedTasksCards}>
            {completedMilestones.map((task) => renderPaymentRow(task, 'mobile'))}
          </div>
        ) : (
          <div className={styles.stageGroup_unifiedTableSection}>
            <div className={styles.stageGroupTable}>
              {completedMilestones.map((task) => renderPaymentRow(task, 'table'))}
            </div>
          </div>
        )}
      </MemberCompletedTasksSection>
    ) : null;

  const activePaymentsEmpty =
    isMemberRole && activeMilestones.length === 0 && completedMilestones.length > 0;

  const paymentTableHeader = (
    <WorkflowTaskTableHeaderRow
      context="payments"
      showAmount
      enablePaymentCustomColumns
      showStatusRefresh={false}
      stageHeaderSelect={isMemberRole ? false : <PaymentsHeaderSelectCell />}
      stageHeaderPrimary={
        <PaymentsHeaderPrimaryCell
          label={paymentsPanelTitle}
          collapsed={tableCollapsed}
          onToggle={() => setTableCollapsed((current) => !current)}
          taskCount={activeMilestones.length}
        />
      }
      leadingFilter={embeddedInFolderTabs ? null : statusFilterCaret}
      onRefreshTasks={onRefreshTasks}
      rowClassName={`${styles.paymentsTableHeader} ${styles.stageGroupUnifiedHeaderRow}`}
      gridClassName={styles.paymentsAlignedGrid}
      trailingHeaders={
        <>
          <span role="columnheader" className={styles.workflowColumnHeaderAlignCenter}>
            {payCols.invoiced}
          </span>
          <span role="columnheader" className={styles.workflowColumnHeaderAlignCenter}>
            {payCols.paid}
          </span>
        </>
      }
    />
  );

  const paymentTableRows = activePaymentsEmpty ? (
    <MemberNoActiveTasksRow
      gridClassName={styles.paymentsAlignedGrid}
      wrapInSection={false}
    />
  ) : activeMilestones.length === 0 ? (
    <div className={`${styles.tableRow} ${styles.paymentsAlignedGrid}`} role="row">
      {isMemberRole ? null : <span className={styles.workflowSelectCell} aria-hidden />}
      <span className={styles.workflowPrimaryCell}>
        <span className={styles.workflowStageEmptyMessage}>{payments.empty}</span>
      </span>
    </div>
  ) : (
    activeMilestones.map((task) => renderPaymentRow(task, 'table'))
  );

  const paymentsUnifiedShellClass = [
    styles.paymentsList,
    styles.paymentsUnifiedTable,
    shellClassName,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <WorkflowTaskRowSelectionProvider
      visibleTaskIds={visibleTaskIds}
      bulkActions={selectionBulkActions}
    >
      <section
        className={`${styles.paymentsPanel} ${styles.workflowPanelFull}`}
        aria-label={embeddedInFolderTabs ? paymentsPanelTitle : undefined}
        aria-labelledby={embeddedInFolderTabs ? undefined : 'payments-rail-heading'}
      >
        {isMobileLayout && embeddedInFolderTabs ? (
          <FolderTabToolbarPortal>
            <div className={styles.workflowFolderToolbar}>{mobileHeaderContent}</div>
          </FolderTabToolbarPortal>
        ) : embeddedInFolderTabs ? (
          <FolderTabToolbarPortal>
            <DetailPanelHeaderActions>
              {statusFilterGhost}
              {searchInput}
              {desktopCreateActions}
            </DetailPanelHeaderActions>
          </FolderTabToolbarPortal>
        ) : isMobileLayout ? (
          <div
            className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
              .filter(Boolean)
              .join(' ')}
          >
            {mobileHeaderContent}
          </div>
        ) : (
          <DetailPanelHeader title={paymentsPanelTitle} titleId="payments-rail-heading">
            <DetailPanelHeaderActions>
              {searchInput}
              {desktopCreateActions}
            </DetailPanelHeaderActions>
          </DetailPanelHeader>
        )}
        {isMobileLayout ? (
          <>
            <WorkflowMobileSelectedFloatingPill />
            <WorkflowMobileHideWhenBulkActive>{mobileFloatingAddButton}</WorkflowMobileHideWhenBulkActive>
          </>
        ) : null}
        {isLoading && !isReady ? (
          <p className={styles.subtitle}>{paymentPermissionsCopy.loading}</p>
        ) : !canView ? (
          <p className={styles.subtitle}>{wf.noViewPermission}</p>
        ) : !showTable ? (
          <p className={styles.subtitle}>{payments.empty}</p>
        ) : isMobileLayout ? (
          <div className={styles.paymentsMobileList}>
            {activePaymentsEmpty ? (
              <MemberNoActiveTasksRow gridClassName={styles.paymentsAlignedGrid} variant="mobile" />
            ) : (
              activeMilestones.map((task) => renderPaymentRow(task, 'mobile'))
            )}
            {memberCompletedSection}
          </div>
        ) : isMemberRole ? (
          <>
            <div className={`${styles.paymentsMemberUnifiedTable} ${paymentsUnifiedShellClass}`}>
              {paymentTableHeader}
              {!tableCollapsed ? (
                <div className={styles.stageGroup_unifiedTableSection}>
                  <div className={styles.stageGroupTable}>{paymentTableRows}</div>
                </div>
              ) : null}
            </div>
            {memberCompletedSection}
          </>
        ) : (
          <>
            <div className={styles.paymentsTableScroll}>
              <div className={paymentsUnifiedShellClass}>
                {paymentTableHeader}
                {!tableCollapsed ? paymentTableRows : null}
              </div>
            </div>
            {memberCompletedSection}
          </>
        )}
      </section>
    </WorkflowTaskRowSelectionProvider>
  );
}
