'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import { AccountabilityPanel } from './AccountabilityPanel';
import { PaymentsRail } from './PaymentsRail';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export function ProjectOverviewContent(): ReactElement {
  const {
    project,
    isApiSource,
    isMemberRole,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    setToast,
  } = useProjectDetailShell();
  const guardedTaskDocumentDrop = useGuardedWorkflowTaskDocumentDrop(
    handleTaskDocumentDrop,
    (message) => setToast({ kind: 'error', message })
  );

  if (isMemberRole) {
    return (
      <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
        <div className={styles.detailPanelsScroll}>
          <div className={styles.detailMiddleMember}>
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
        </div>
      </WorkflowTaskFileDragProvider>
    );
  }

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
      <div className={styles.detailPanelsScroll}>
        <div className={styles.detailMiddle}>
          <WorkflowTasksTable
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskAdded={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
          <PaymentsRail
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleWorkflowTaskPatched}
            onTaskCreated={handleWorkflowTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        </div>
        <AccountabilityPanel project={project} />
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
