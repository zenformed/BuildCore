'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useState } from 'react';
import type { CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { AccountabilityPanel } from './AccountabilityPanel';
import { EditCrmProjectDrawer } from './EditCrmProjectDrawer';
import { MilestoneSummaryPanel } from './MilestoneSummaryPanel';
import { ProjectContactCard } from './ProjectContactCard';
import { ProjectDetailHeader } from './ProjectDetailHeader';
import { ProjectDocumentsPanel } from './ProjectDocumentsPanel';
import { StageProgressBar } from './StageProgressBar';
import { WorkflowTaskDrawer } from './WorkflowTaskDrawer';
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
  const [project, setProject] = useState(initialProject);
  const [banner, setBanner] = useState<{ kind: 'success' | 'error'; message: string } | null>(null);
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
    setBanner({ kind: 'success', message: content.projectDetail.saveSuccess });
  }, []);

  const handleTaskSaved = useCallback(async () => {
    try {
      await onRefresh();
      setBanner({ kind: 'success', message: content.projectDetail.saveSuccess });
    } catch {
      setBanner({ kind: 'error', message: content.projectDetail.saveError });
    }
  }, [onRefresh]);

  const nextStep = project.summary.waitingOn?.trim() || content.projectDetail.noNextStep;

  return (
    <div className={styles.page}>
      {banner ? (
        <p className={banner.kind === 'error' ? styles.bannerError : styles.bannerSuccess}>{banner.message}</p>
      ) : null}

      <ProjectDetailHeader project={project.summary} onBack={onBack} />
      <div className={styles.nextStep}>
        <span className={styles.nextStepLabel}>{content.projectDetail.nextStepLabel}</span>
        {nextStep}
      </div>

      <div className={styles.toolbar}>
        <button type="button" className={styles.editBtn} onClick={() => setEditOpen(true)}>
          {content.projectDetail.editProjectButton}
        </button>
      </div>

      <div className={styles.grid2}>
        <ProjectContactCard project={project} />
        <MilestoneSummaryPanel project={project} />
      </div>
      <StageProgressBar stageProgress={project.stageProgress} />
      <WorkflowTasksTable
        project={project}
        onAddTask={() => setTaskDrawer({ open: true, mode: 'create', task: null })}
        onEditTask={(task) => setTaskDrawer({ open: true, mode: 'edit', task })}
      />
      <div className={styles.grid2}>
        <ProjectDocumentsPanel project={project} />
        <AccountabilityPanel project={project} />
      </div>

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
