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
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    setToast,
  } = useProjectDetailShell();

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={handleTaskDocumentDrop}>
      <div className={styles.tasksWorkArea}>
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
    </WorkflowTaskFileDragProvider>
  );
}
