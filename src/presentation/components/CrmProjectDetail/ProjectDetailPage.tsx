'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { archiveCrmWorkflowTask } from '@/application/use-cases/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import { crmRepositories } from '@/shared/di/container';
import { AccountabilityPanel } from './AccountabilityPanel';
import { PaymentsRail } from './PaymentsRail';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDocumentsModal } from './ProjectDocumentsModal';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';
import { StageProgressBar } from './StageProgressBar';
import { WorkflowTaskDrawer, type WorkflowTaskDrawerContext } from './WorkflowTaskDrawer';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import { DetailToast } from './DetailToast';
import { ProjectHeaderAssignee } from './ProjectHeaderAssignee';
import { ProjectHeaderTradeType } from './ProjectHeaderTradeType';
import { ProjectNotesInline } from './ProjectNotesInline';
import { useProjectSummaryPatch } from '@/presentation/features/crmProjectDetail/useProjectSummaryPatch';
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
  const [project, setProject] = useState(initialProject);
  const [toast, setToast] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
  const [documentsOpen, setDocumentsOpen] = useState(false);
  const [taskDrawer, setTaskDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    context: WorkflowTaskDrawerContext;
    task: CrmWorkflowTask | null;
  }>({ open: false, mode: 'create', context: 'workflow', task: null });
  const [archiveConfirmTask, setArchiveConfirmTask] = useState<CrmWorkflowTask | null>(null);

  useEffect(() => {
    setProject(initialProject);
  }, [initialProject]);

  const handleProjectSaved = useCallback((next: CrmProjectDetail) => {
    setProject(next);
    setToast({ kind: 'success', message: content.projectDetail.saveSuccess });
  }, []);

  const handleTaskSaved = useCallback(async () => {
    try {
      await onRefresh();
      setToast({ kind: 'success', message: content.projectDetail.saveSuccess });
    } catch {
      setToast({ kind: 'error', message: content.projectDetail.saveError });
    }
  }, [onRefresh]);

  const handleConfirmArchiveTask = useCallback(async () => {
    if (!archiveConfirmTask) return;
    const wf = content.projectDetail.workflow;
    try {
      await archiveCrmWorkflowTask(crmRepositories, archiveConfirmTask.id);
      await onRefresh();
      setToast({ kind: 'success', message: wf.archiveTaskSuccess });
    } catch {
      setToast({ kind: 'error', message: wf.archiveTaskFailed });
    }
  }, [archiveConfirmTask, onRefresh]);

  const openCreateTask = useCallback((context: WorkflowTaskDrawerContext) => {
    setTaskDrawer({ open: true, mode: 'create', context, task: null });
  }, []);

  const wf = content.projectDetail.workflow;

  const { savingField, patchField } = useProjectSummaryPatch(
    project,
    handleProjectSaved,
    (message) => setToast({ kind: 'error', message })
  );

  return (
    <div className={styles.page}>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <div className={styles.detailTop}>
        <ProjectDetailHeader
          project={project.summary}
          onBack={onBack}
          assigneeControl={
            <ProjectHeaderAssignee
              assignedTo={project.summary.assignedTo}
              isApiSource={isApiSource}
              isSaving={savingField === 'assignedMemberId'}
              onAssigneeChange={(id) => patchField('assignedMemberId', id)}
            />
          }
          tradeTypeControl={
            <ProjectHeaderTradeType
              tradeType={project.summary.tradeType}
              isSaving={savingField === 'tradeType'}
              onTradeTypeChange={(value) => patchField('tradeType', value)}
            />
          }
        />
        <ProjectSummaryStrip project={project} savingField={savingField} patchField={patchField} />
        <ProjectNotesInline
          label={content.projectDetail.projectNotesLabel}
          notes={project.notes}
          savingField={savingField}
          onPatch={patchField}
        />
        <StageProgressBar stageProgress={project.stageProgress} />
      </div>

      <div className={styles.detailMiddle}>
        <WorkflowTasksTable
          project={project}
          isApiSource={isApiSource}
          onAddTask={() => openCreateTask('workflow')}
          onTaskUpdated={handleTaskSaved}
          onUploadComingSoon={() =>
            setToast({
              kind: 'success',
              message: content.projectDetail.workflow.documentsUploadComingSoon,
            })
          }
          onTaskError={(message) => setToast({ kind: 'error', message })}
          onRequestArchiveTask={setArchiveConfirmTask}
          onOpenDocuments={() => setDocumentsOpen(true)}
        />
        <PaymentsRail
          project={project}
          isApiSource={isApiSource}
          onTaskUpdated={handleTaskSaved}
          onUploadComingSoon={() =>
            setToast({
              kind: 'success',
              message: content.projectDetail.workflow.documentsUploadComingSoon,
            })
          }
          onTaskError={(message) => setToast({ kind: 'error', message })}
          onRequestArchiveTask={setArchiveConfirmTask}
        />
      </div>

      <AccountabilityPanel project={project} />

      <WorkflowTaskDrawer
        open={taskDrawer.open}
        mode={taskDrawer.mode}
        drawerContext={taskDrawer.context}
        project={project}
        task={taskDrawer.task}
        isApiSource={isApiSource}
        onClose={() => setTaskDrawer({ open: false, mode: 'create', context: 'workflow', task: null })}
        onSaved={handleTaskSaved}
      />
      <ProjectDocumentsModal
        open={documentsOpen}
        project={project}
        onClose={() => setDocumentsOpen(false)}
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
