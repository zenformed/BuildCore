'use client';

import type { ReactElement } from 'react';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { ProjectDetailShell } from './ProjectDetailShell';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectWorkflowTasksPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

function ProjectTasksContent(): ReactElement {
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

export function ProjectWorkflowTasksPage({
  project,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectWorkflowTasksPageProps): ReactElement {
  return (
    <ProjectDetailShell
      pageContext="workflowTasks"
      project={project}
      isApiSource={isApiSource}
      onBack={onBack}
      onOpenProject={onOpenProject}
      onRefresh={onRefresh}
    >
      <ProjectTasksContent />
    </ProjectDetailShell>
  );
}
