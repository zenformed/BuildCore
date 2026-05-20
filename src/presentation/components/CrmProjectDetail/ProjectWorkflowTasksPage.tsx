'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export function ProjectTasksContent(): ReactElement {
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
      <div className={styles.tasksWorkArea}>
        <WorkflowTasksTable
          layout="full"
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
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
