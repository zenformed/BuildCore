'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
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
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import {
  WorkflowMobileBulkSelectAllRow,
  WorkflowMobileBulkToolbar,
  WorkflowMobileSearchToolsRow,
} from './MobileBulkSelectionChrome';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import {
  isMemberCompletedWorkflowTask,
  MemberCompletedTasksSection,
} from './MemberCompletedTasksSection';
import { MemberNoActiveTasksRow } from './MemberNoActiveTasksRow';
import { useBuildCorePaymentTableColumns } from '@/presentation/providers/BuildCorePaymentTableColumnsProvider';
import styles from './ProjectDetail.module.css';

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

  const searchInput = (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={payments.searchPlaceholder}
      ariaLabel={payments.searchAriaLabel}
    />
  );

  const refreshButton = (
    <DetailPanelSectionRefresh
      sectionLabel={paymentsPanelTitle}
      onRefresh={onRefreshTasks ?? refreshWorkflowTasks}
      onError={(message) => setToast({ kind: 'error', message })}
    />
  );

  const addButton = canCreate ? (
    <DetailPanelHeaderButton
      variant="add"
      title={payments.addMilestone}
      onClick={() => openCreateWorkflowTask({ context: 'payment' })}
    />
  ) : null;

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
          <div className={styles.detailPanelTableCard}>
            <div
              className={[styles.paymentsList, styles.paymentsUnifiedTable, shellClassName]
                .filter(Boolean)
                .join(' ')}
            >
              {completedMilestones.map((task) => renderPaymentRow(task, 'table'))}
            </div>
          </div>
        )}
      </MemberCompletedTasksSection>
    ) : null;

  const activePaymentsEmpty =
    isMemberRole && activeMilestones.length === 0 && completedMilestones.length > 0;

  return (
    <WorkflowTaskRowSelectionProvider
      visibleTaskIds={visibleTaskIds}
      bulkActions={selectionBulkActions}
    >
      <section
        className={`${styles.paymentsPanel} ${styles.workflowPanelFull}`}
        aria-labelledby="payments-rail-heading"
      >
        {isMobileLayout ? (
          <div
            className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
              .filter(Boolean)
              .join(' ')}
          >
            <div className={styles.detailPanelHeaderRow}>
              <div className={styles.detailPanelHeaderTitleGroup}>
                <h3 id="payments-rail-heading" className={styles.detailPanelTitle}>
                  {paymentsPanelTitle}
                </h3>
                {statusFilterCaret}
              </div>
              <div className={styles.detailPanelHeaderRowActions}>
                {refreshButton}
                <WorkflowMobileBulkToolbar />
              </div>
            </div>
            <WorkflowMobileSearchToolsRow searchInput={searchInput} trailingActions={addButton} />
          </div>
        ) : (
          <DetailPanelHeader title={paymentsPanelTitle} titleId="payments-rail-heading">
            <DetailPanelHeaderActions>
              {searchInput}
              {addButton}
            </DetailPanelHeaderActions>
          </DetailPanelHeader>
        )}
        {isLoading && !isReady ? (
          <p className={styles.subtitle}>{paymentPermissionsCopy.loading}</p>
        ) : !canView ? (
          <p className={styles.subtitle}>{wf.noViewPermission}</p>
        ) : !showTable ? (
          <p className={styles.subtitle}>{payments.empty}</p>
        ) : isMobileLayout ? (
          <div className={styles.paymentsMobileList}>
            <WorkflowMobileBulkSelectAllRow />
            {activePaymentsEmpty ? (
              <MemberNoActiveTasksRow gridClassName={styles.paymentsAlignedGrid} variant="mobile" />
            ) : activeMilestones.length === 0 ? (
              <p className={styles.subtitle}>{payments.empty}</p>
            ) : (
              activeMilestones.map((task) => renderPaymentRow(task, 'mobile'))
            )}
            {memberCompletedSection}
          </div>
        ) : (
          <>
            <div className={styles.detailPanelTableCard}>
              <div className={styles.paymentsTableScroll}>
                <div
                  className={[styles.paymentsList, styles.paymentsUnifiedTable, shellClassName]
                    .filter(Boolean)
                    .join(' ')}
                >
                  <WorkflowTaskTableHeaderRow
                    context="payments"
                    showAmount
                    enablePaymentCustomColumns
                    showStatusRefresh
                    leadingFilter={statusFilterCaret}
                    onRefreshTasks={onRefreshTasks}
                    rowClassName={styles.paymentsTableHeader}
                    gridClassName={styles.paymentsAlignedGrid}
                    trailingHeaders={
                      <>
                        <span
                          role="columnheader"
                          className={styles.workflowColumnHeaderAlignCenter}
                        >
                          {payCols.invoiced}
                        </span>
                        <span
                          role="columnheader"
                          className={styles.workflowColumnHeaderAlignCenter}
                        >
                          {payCols.paid}
                        </span>
                      </>
                    }
                  />
                  {activePaymentsEmpty ? (
                    <MemberNoActiveTasksRow
                      gridClassName={styles.paymentsAlignedGrid}
                      wrapInSection={false}
                    />
                  ) : activeMilestones.length === 0 ? (
                    <div className={`${styles.tableRow} ${styles.paymentsAlignedGrid}`} role="row">
                      {isMemberRole ? null : (
                        <span className={styles.workflowSelectCell} aria-hidden />
                      )}
                      <span className={styles.workflowPrimaryCell}>
                        <span className={styles.workflowStageEmptyMessage}>{payments.empty}</span>
                      </span>
                    </div>
                  ) : (
                    activeMilestones.map((task) => renderPaymentRow(task, 'table'))
                  )}
                </div>
              </div>
            </div>
            {memberCompletedSection}
          </>
        )}
      </section>
    </WorkflowTaskRowSelectionProvider>
  );
}
