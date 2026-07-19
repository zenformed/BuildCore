'use client';

import { useCallback, type ReactElement } from 'react';
import type { CrmWorkflowTask } from '@/domain/crm';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import { useMemberParentTaskRollup } from '@/presentation/features/memberTasks/useMemberParentTaskRollup';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { WorkflowTaskFileDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskFileDragContext';
import { useGuardedWorkflowTaskDocumentDrop } from '@/presentation/features/crmProjectDetail/useGuardedWorkflowTaskDocumentDrop';
import { PaymentsRail } from '@/presentation/components/CrmProjectDetail/PaymentsRail';
import { WorkflowTasksTable } from '@/presentation/components/CrmProjectDetail/WorkflowTasksTable';
import styles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

/**
 * Member project body: header/customer come from ProjectDetailShell.
 * Below: flat Workflow Tasks + Payment Tasks (parent + subprojects, no stage groups).
 */
export function MemberProjectOverviewContent(): ReactElement {
  const {
    project,
    isApiSource,
    handleWorkflowTaskPatched,
    handleWorkflowTaskCreated,
    handleTaskDocumentDrop,
    setArchiveConfirmTask,
    setToast,
  } = useProjectDetailShell();
  const { payment } = useBuildCoreProjectSectionAccess();
  const rollup = useMemberParentTaskRollup(project, isApiSource);
  const guardedTaskDocumentDrop = useGuardedWorkflowTaskDocumentDrop(
    handleTaskDocumentDrop,
    (message) => setToast({ kind: 'error', message })
  );

  const resolveTaskProjectSlug = useCallback(
    (taskId: string) =>
      rollup.taskMetaById.get(taskId)?.projectSlug ?? project.summary.slug,
    [project.summary.slug, rollup.taskMetaById]
  );

  const onTaskUpdated = useCallback(
    async (task: CrmWorkflowTask) => {
      rollup.patchTask(task);
      const isParentTask = project.workflowTasks.some((row) => row.id === task.id);
      if (isParentTask) {
        await handleWorkflowTaskPatched(task);
      }
    },
    [handleWorkflowTaskPatched, project.workflowTasks, rollup]
  );

  const onTaskCreated = useCallback(
    async (task: CrmWorkflowTask) => {
      rollup.patchTask(task);
      await handleWorkflowTaskCreated(task);
    },
    [handleWorkflowTaskCreated, rollup]
  );

  return (
    <WorkflowTaskFileDragProvider onTaskDocumentDrop={guardedTaskDocumentDrop}>
      <div className={styles.detailPanelsScroll} data-member-project-tasks="">
        {rollup.loading ? (
          <p className={styles.subtitle} aria-busy="true">
            …
          </p>
        ) : null}
        <WorkflowTasksTable
          layout="full"
          project={rollup.displayProject}
          isApiSource={isApiSource}
          groupByStage={false}
          hideStageHeaders
          resolveTaskProjectSlug={resolveTaskProjectSlug}
          taskContextLineById={rollup.contextLineByTaskId}
          onRefreshTasks={rollup.refresh}
          onTaskUpdated={onTaskUpdated}
          onTaskAdded={onTaskCreated}
          onTaskError={(message) => setToast({ kind: 'error', message })}
          onRequestArchiveTask={setArchiveConfirmTask}
        />
        {payment.isReady && payment.permissions.canView ? (
          <PaymentsRail
            project={rollup.displayProject}
            isApiSource={isApiSource}
            resolveTaskProjectSlug={resolveTaskProjectSlug}
            taskContextLineById={rollup.contextLineByTaskId}
            onRefreshTasks={rollup.refresh}
            onTaskUpdated={onTaskUpdated}
            onTaskCreated={onTaskCreated}
            onTaskError={(message) => setToast({ kind: 'error', message })}
            onRequestArchiveTask={setArchiveConfirmTask}
          />
        ) : null}
      </div>
    </WorkflowTaskFileDragProvider>
  );
}
