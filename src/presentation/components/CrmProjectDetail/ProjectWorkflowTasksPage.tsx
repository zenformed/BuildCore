'use client';

import type { ReactElement } from 'react';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { DetailToast } from './DetailToast';
import { ProjectDetailActionsMenu } from './ProjectDetailActionsMenu';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { WorkflowTaskDrawer } from './WorkflowTaskDrawer';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import type { ProjectDetailPageProps } from './ProjectDetailPage';
import styles from './ProjectDetail.module.css';

export type ProjectWorkflowTasksPageProps = Pick<
  ProjectDetailPageProps,
  'project' | 'isApiSource' | 'onBack' | 'onRefresh'
> & {
  onOpenProject: () => void;
};

export function ProjectWorkflowTasksPage({
  project: initialProject,
  isApiSource,
  onBack,
  onOpenProject,
  onRefresh,
}: ProjectWorkflowTasksPageProps): ReactElement {
  const workspace = useProjectDetailWorkspace(initialProject, onRefresh);
  const {
    project,
    toast,
    setToast,
    taskDrawer,
    archiveConfirmTask,
    setArchiveConfirmTask,
    documentUploadConfirm,
    setDocumentUploadConfirm,
    savingField,
    patchField,
    handleTaskSaved,
    handleTaskDocumentDrop,
    handleConfirmDocumentUpload,
    handleConfirmArchiveTask,
    openCreateTask,
    closeTaskDrawer,
    wf,
  } = workspace;

  return (
    <div className={styles.pageTasks} data-project-tasks-page>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <ProjectDetailContextBlock
        project={project}
        isApiSource={isApiSource}
        pageContext="workflowTasks"
        onBack={onBack}
        onOpenProject={onOpenProject}
        actions={<ProjectDetailActionsMenu projectSlug={project.summary.slug} />}
        savingField={savingField}
        patchField={patchField}
      />

      <WorkflowTaskFileDragProvider onTaskDocumentDrop={handleTaskDocumentDrop}>
        <div className={styles.tasksWorkArea}>
          <WorkflowTasksTable
            layout="full"
            project={project}
            isApiSource={isApiSource}
            onAddTask={() => openCreateTask('workflow')}
            onTaskUpdated={handleTaskSaved}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        </div>
      </WorkflowTaskFileDragProvider>

      <WorkflowTaskDrawer
        open={taskDrawer.open}
        mode={taskDrawer.mode}
        drawerContext={taskDrawer.context}
        project={project}
        task={taskDrawer.task}
        isApiSource={isApiSource}
        onClose={closeTaskDrawer}
        onSaved={handleTaskSaved}
      />
      <ConfirmModal
        isOpen={documentUploadConfirm != null}
        onClose={() => setDocumentUploadConfirm(null)}
        onConfirm={() => {
          void handleConfirmDocumentUpload();
        }}
        title={wf.documentUploadConfirmTitle}
        message={
          documentUploadConfirm
            ? wf.documentUploadConfirmMessage
                .replace('{fileName}', documentUploadConfirm.file.name)
                .replace('{taskTitle}', documentUploadConfirm.task.title)
            : undefined
        }
        confirmLabel={wf.documentUploadConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="primary"
      />
      <ConfirmModal
        isOpen={archiveConfirmTask != null}
        onClose={() => setArchiveConfirmTask(null)}
        onConfirm={() => {
          void handleConfirmArchiveTask();
        }}
        title={wf.archiveTaskConfirmTitle}
        message={
          archiveConfirmTask
            ? `“${archiveConfirmTask.title}” will be removed from this project.`
            : undefined
        }
        confirmLabel={wf.archiveTaskConfirmLabel}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="danger"
      />
    </div>
  );
}
