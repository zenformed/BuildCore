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
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
import { useBuildCorePaymentTableColumns } from '@/presentation/providers/BuildCorePaymentTableColumnsProvider';
import styles from './ProjectDetail.module.css';

export type PaymentsRailProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
  onTaskCreated?: (task: CrmWorkflowTask) => Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function PaymentsRail({
  project,
  isApiSource,
  onTaskUpdated,
  onTaskCreated,
  onTaskError,
  onRequestArchiveTask,
}: PaymentsRailProps): ReactElement {
  const payments = content.projectDetail.payments;
  const paymentPermissionsCopy = content.teams.paymentPermissions;
  const wf = content.projectDetail.workflow;
  const { refreshWorkflowTasks, setToast, openCreateWorkflowTask } = useProjectDetailShell();
  const { payment } = useBuildCoreProjectSectionAccess();
  const { permissions, isLoading, isReady } = payment;
  const canView = isReady && permissions.canView;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete;
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
  const docCounts = countDocumentsByTaskId(project.documents);
  const payCols = content.projectDetail.payments.columns;
  const isMobileLayout = useDashboardMobileLayout();
  const { shellClassName } = useBuildCorePaymentTableColumns();
  const visibleTaskIds = useMemo(
    () => filteredMilestones.map((task) => task.id),
    [filteredMilestones]
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
      canApprove: permissions.canApprove,
      canChangeNonDoneStatus: permissions.canView,
      canAssign: permissions.canEdit,
      canNotifyAssigned: permissions.canEdit && isApiSource,
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
      sectionLabel={payments.title}
      onRefresh={refreshWorkflowTasks}
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

  return (
    <section className={styles.paymentsPanel} aria-labelledby="payments-rail-heading">
      {isMobileLayout ? (
        <div
          className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
            .filter(Boolean)
            .join(' ')}
        >
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelHeaderTitleGroup}>
              <h3 id="payments-rail-heading" className={styles.detailPanelTitle}>
                {payments.title}
              </h3>
              {statusFilterCaret}
            </div>
            <div className={styles.detailPanelHeaderRowActions}>{refreshButton}</div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>{addButton}</div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader title={payments.title} titleId="payments-rail-heading">
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
          {filteredMilestones.length === 0 ? (
            <p className={styles.subtitle}>{payments.empty}</p>
          ) : null}
          {filteredMilestones.map((task) => (
            <WorkflowTaskInlineRow
              key={task.id}
              variant="mobile"
              projectSlug={project.summary.slug}
              task={task}
              docCount={docCounts.get(task.id) ?? 0}
              taskDocuments={project.documents.filter((doc) => doc.workflowTaskId === task.id)}
              showAmountColumn
              permissionDomain="payments"
              isApiSource={isApiSource}
              onUpdated={onTaskUpdated}
              onTaskError={onTaskError}
              onRequestArchiveTask={canDelete ? onRequestArchiveTask : undefined}
            />
          ))}
        </div>
      ) : (
        <WorkflowTaskRowSelectionProvider
          visibleTaskIds={visibleTaskIds}
          bulkActions={selectionBulkActions}
        >
          <div className={styles.detailPanelTableCard}>
            <div className={styles.paymentsTableScroll}>
              <div
                className={[styles.paymentsTableGridShell, shellClassName]
                  .filter(Boolean)
                  .join(' ')}
              >
                <WorkflowTaskTableHeaderRow
                  context="payments"
                  showAmount
                  enablePaymentCustomColumns
                  showStatusRefresh
                  leadingFilter={statusFilterCaret}
                  rowClassName={styles.paymentsTableHeader}
                  gridClassName=""
                  trailingHeaders={
                    <>
                      <span role="columnheader">{payCols.invoiced}</span>
                      <span role="columnheader">{payCols.paid}</span>
                    </>
                  }
                />
                {filteredMilestones.length === 0 ? (
                  <div className={`${styles.tableRow} ${styles.workflowGrid}`} role="row">
                    <span className={styles.workflowSelectCell} aria-hidden />
                    <span className={styles.workflowPrimaryCell}>
                      <span className={styles.workflowStageEmptyMessage}>{payments.empty}</span>
                    </span>
                  </div>
                ) : null}
                {filteredMilestones.map((task) => (
                  <WorkflowTaskInlineRow
                    key={task.id}
                    projectSlug={project.summary.slug}
                    task={task}
                    docCount={docCounts.get(task.id) ?? 0}
                    taskDocuments={project.documents.filter(
                      (doc) => doc.workflowTaskId === task.id
                    )}
                    showAmountColumn
                    enablePaymentCustomColumns
                    permissionDomain="payments"
                    isApiSource={isApiSource}
                    onUpdated={onTaskUpdated}
                    onTaskError={onTaskError}
                    onRequestArchiveTask={canDelete ? onRequestArchiveTask : undefined}
                  />
                ))}
              </div>
            </div>
          </div>
        </WorkflowTaskRowSelectionProvider>
      )}
    </section>
  );
}
