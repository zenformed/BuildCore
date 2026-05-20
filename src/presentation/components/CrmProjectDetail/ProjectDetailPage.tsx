'use client';

import type { ReactElement } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { useProjectDetailWorkspace } from '@/presentation/features/crmProjectDetail/useProjectDetailWorkspace';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { AccountabilityPanel } from './AccountabilityPanel';
import { DetailToast } from './DetailToast';
import { PaymentsRail } from './PaymentsRail';
import { ProjectDetailContextBlock } from './ProjectDetailContextBlock';
import { ProjectDetailHeaderActions } from './ProjectDetailHeaderActions';
import { useProjectCompletionToggle } from '@/presentation/features/crmProjectDetail/useProjectCompletionToggle';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import styles from './ProjectDetail.module.css';

export type ProjectDetailPageProps = {
  project: CrmProjectDetail;
  isApiSource: boolean;
  onBack: () => void;
  onRefresh: () => Promise<void>;
};

export function ProjectDetailPage({
  project: initialProject,
  isApiSource,
  onBack,
  onRefresh,
}: ProjectDetailPageProps): ReactElement {
  const completion = useProjectCompletionToggle(initialProject, onRefresh);
  const workspace = useProjectDetailWorkspace(completion.project, onRefresh);
  const {
    project,
    toast,
    setToast,
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
    wf,
  } = workspace;
  const detail = content.projectDetail;

  return (
    <div className={styles.page} data-project-detail-page>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <ProjectDetailContextBlock
        project={project}
        isApiSource={isApiSource}
        onBack={onBack}
        actions={
          <ProjectDetailHeaderActions
            projectSlug={project.summary.slug}
            isComplete={completion.isComplete}
            completionBusy={completion.completionBusy}
            onMarkComplete={completion.requestMarkComplete}
            onMarkIncomplete={completion.requestMarkIncomplete}
            markCompleteLabel={detail.markComplete}
            markIncompleteLabel={detail.markIncomplete}
          />
        }
        savingField={savingField}
        patchField={patchField}
      />

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
        isOpen={completion.completionConfirm === 'complete'}
        onClose={() => completion.setCompletionConfirm(null)}
        onConfirm={() => {
          void completion
            .confirmCompletionChange()
            .then(() => setToast({ kind: 'success', message: detail.markCompleteSuccess }))
            .catch(() => setToast({ kind: 'error', message: detail.markCompleteFailed }));
        }}
        title={detail.markCompleteConfirmTitle}
        confirmLabel={detail.markComplete}
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="primary"
      />
      <ConfirmModal
        isOpen={completion.completionConfirm === 'incomplete'}
        onClose={() => completion.setCompletionConfirm(null)}
        onConfirm={() => {
          void completion
            .confirmCompletionChange()
            .then(() => setToast({ kind: 'success', message: detail.markIncompleteSuccess }))
            .catch(() => setToast({ kind: 'error', message: detail.markCompleteFailed }));
        }}
        title={detail.markIncompleteConfirmTitle}
        confirmLabel={detail.markIncomplete}
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
