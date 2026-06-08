'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { BudgetTable } from './BudgetTable';
import { PaymentsRail } from './PaymentsRail';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export function ProjectOverviewContent(): ReactElement {
  const {
    project,
    isApiSource,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    setToast,
  } = useProjectDetailShell();
  const { payment, budget } = useBuildCoreProjectSectionAccess();
  const guardedTaskDocumentDrop = useGuardedWorkflowTaskDocumentDrop(
    handleTaskDocumentDrop,
    (message) => setToast({ kind: 'error', message })
  );

  const showPayments = payment.isReady && payment.permissions.canView;
  const showBudget = budget.isReady && budget.permissions.canView;
  const showFinancialsRow = showPayments || showBudget;
  const financialsRowClass =
    showPayments && showBudget
      ? styles.detailFinancialsRow
      : styles.detailFinancialsRowSingle;

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
      <div className={styles.detailPanelsScroll}>
        <div className={styles.detailWorkflowSection}>
          <WorkflowTasksTable
            layout="full"
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskAdded={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        </div>
        {showFinancialsRow ? (
          <div className={financialsRowClass}>
            {showBudget ? <BudgetTable onError={(message) => setToast({ kind: 'error', message })} /> : null}
            {showPayments ? (
              <PaymentsRail
                project={project}
                isApiSource={isApiSource}
                onTaskUpdated={handleWorkflowTaskPatched}
                onTaskCreated={handleWorkflowTaskCreated}
                onTaskError={(message) => setToast({ kind: 'error', message })}
                onRequestArchiveTask={setArchiveConfirmTask}
              />
            ) : null}
          </div>
        ) : null}
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
