'use client';

import type { ReactElement } from 'react';
import { useMemo, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { listPaymentMilestones } from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { filterPaymentMilestonesBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { PaymentMilestoneDraftRow } from './PaymentMilestoneDraftRow';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderButton } from './DetailPanelHeaderButton';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { WorkflowTaskTableHeaderRow } from './WorkflowTaskTableHeaderRow';
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
  const { refreshWorkflowTasks, setToast } = useProjectDetailShell();
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
  const filteredMilestones = useMemo(
    () => filterPaymentMilestonesBySearch(milestones, searchQuery),
    [milestones, searchQuery]
  );
  const docCounts = countDocumentsByTaskId(project.documents);
  const payCols = content.projectDetail.payments.columns;
  const [draftOpen, setDraftOpen] = useState(false);
  const isMobileLayout = useDashboardMobileLayout();

  const showTable =
    canView && (filteredMilestones.length > 0 || draftOpen || permissions.canViewAllStages);

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
      disabled={draftOpen}
      title={payments.addMilestone}
      onClick={() => setDraftOpen(true)}
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
            </div>
          </div>
          <div className={styles.detailPanelHeaderRow}>
            <div className={styles.detailPanelSearchWrap}>{searchInput}</div>
            <div className={styles.detailPanelHeaderRowActions}>
              {refreshButton}
              {addButton}
            </div>
          </div>
        </div>
      ) : (
        <DetailPanelHeader title={payments.title} titleId="payments-rail-heading">
          <DetailPanelHeaderActions>
            {searchInput}
            {refreshButton}
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
          {draftOpen ? (
            <PaymentMilestoneDraftRow
              project={project}
              isApiSource={isApiSource}
              onSaved={onTaskCreated ?? onTaskUpdated}
              onCancel={() => setDraftOpen(false)}
            />
          ) : null}
        </div>
      ) : (
        <div className={styles.detailPanelTableCard}>
          <div className={styles.paymentsTableScroll}>
            <div className={styles.paymentsTableGridShell}>
            <WorkflowTaskTableHeaderRow
              context="payments"
              showAmount
              rowClassName={styles.paymentsTableHeader}
              gridClassName=""
              trailingHeaders={
                <>
                  <span role="columnheader">{payCols.invoiced}</span>
                  <span role="columnheader">{payCols.paid}</span>
                </>
              }
            />
            {filteredMilestones.map((task) => (
              <WorkflowTaskInlineRow
                key={task.id}
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
            {draftOpen ? (
              <PaymentMilestoneDraftRow
                project={project}
                isApiSource={isApiSource}
                onSaved={onTaskCreated ?? onTaskUpdated}
                onCancel={() => setDraftOpen(false)}
              />
            ) : null}
          </div>
        </div>
        </div>
      )}
    </section>
  );
}
