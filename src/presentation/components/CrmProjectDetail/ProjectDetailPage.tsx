'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { AccountabilityPanel } from './AccountabilityPanel';
import { PaymentsRail } from './PaymentsRail';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export function ProjectOverviewContent(): ReactElement {
  const {
    project,
    isApiSource,
    onRefresh,
    setToast,
    handleTaskSaved,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    wf,
  } = useProjectDetailShell();

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={handleTaskDocumentDrop}>
      <div className={styles.detailPanelsScroll}>
        <div className={styles.detailMiddle}>
          <WorkflowTasksTable
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleTaskSaved}
            onTaskAdded={async () => {
              await onRefresh();
              setToast({ kind: 'success', message: wf.taskAddedSuccess });
            }}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
          <PaymentsRail
            project={project}
            isApiSource={isApiSource}
            onTaskUpdated={handleTaskSaved}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        </div>
        <AccountabilityPanel project={project} />
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
