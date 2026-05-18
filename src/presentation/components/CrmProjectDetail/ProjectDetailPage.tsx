'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { AccountabilityPanel } from './AccountabilityPanel';
import { EditCrmProjectDrawer } from './EditCrmProjectDrawer';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDocumentsPanel } from './ProjectDocumentsPanel';
import { ProjectSummaryStrip } from './ProjectSummaryStrip';
import { StageProgressBar } from './StageProgressBar';
import { WorkflowTaskDrawer } from './WorkflowTaskDrawer';
import { WorkflowTasksTable } from './WorkflowTasksTable';
import { DetailToast } from './DetailToast';
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
  const [editOpen, setEditOpen] = useState(false);
  const [taskDrawer, setTaskDrawer] = useState<{
    open: boolean;
    mode: 'create' | 'edit';
    task: CrmWorkflowTask | null;
  }>({ open: false, mode: 'create', task: null });

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

  const projectNotes = project.notes?.trim();
  const showProjectNotes = Boolean(projectNotes);

  return (
    <div className={styles.page}>
      {toast ? <DetailToast kind={toast.kind} message={toast.message} onDismiss={() => setToast(null)} /> : null}

      <div className={styles.detailTop}>
        <ProjectDetailHeader project={project.summary} onBack={onBack} onEdit={() => setEditOpen(true)} />
        <ProjectSummaryStrip project={project} />
        {showProjectNotes ? (
          <p className={styles.nextStepCompact}>
            <span className={styles.nextStepLabel}>{content.projectDetail.projectNotesLabel}</span>
            {projectNotes}
          </p>
        ) : null}
        <StageProgressBar stageProgress={project.stageProgress} />
      </div>

      <div className={styles.workflowSplit}>
        <WorkflowTasksTable
          project={project}
          onAddTask={() => setTaskDrawer({ open: true, mode: 'create', task: null })}
          onEditTask={(task) => setTaskDrawer({ open: true, mode: 'edit', task })}
        />
        <ProjectDocumentsPanel project={project} />
      </div>
      <AccountabilityPanel project={project} />

      <EditCrmProjectDrawer
        open={editOpen}
        project={project}
        isApiSource={isApiSource}
        onClose={() => setEditOpen(false)}
        onSaved={handleProjectSaved}
      />
      <WorkflowTaskDrawer
        open={taskDrawer.open}
        mode={taskDrawer.mode}
        project={project}
        task={taskDrawer.task}
        isApiSource={isApiSource}
        onClose={() => setTaskDrawer({ open: false, mode: 'create', task: null })}
        onSaved={handleTaskSaved}
      />
    </div>
  );
}
