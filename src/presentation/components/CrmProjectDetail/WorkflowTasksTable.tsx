'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import {
  countWorkflowTasksInGroups,
  groupOpsWorkflowTasksByStage,
  limitWorkflowTaskGroups,
  limitWorkflowTaskStageGroups,
  promoteWorkflowStageGroup,
  WORKFLOW_STAGES_PREVIEW_LIMIT,
  WORKFLOW_TASKS_PREVIEW_LIMIT,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { writeWorkflowStageExpanded } from '@/presentation/features/crmProjectDetail/workflowStageCollapseStorage';
import { DetailPanelHeader } from './DetailPanelHeader';
import { WorkflowOpsTaskDraftRow } from './WorkflowOpsTaskDraftRow';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import { WorkflowTaskStageAddButton } from './WorkflowTaskStageAddButton';
import styles from './ProjectDetail.module.css';

export type WorkflowTasksTableLayout = 'preview' | 'full';

export type WorkflowTasksTableProps = {
  layout?: WorkflowTasksTableLayout;
  project: CrmProjectDetail;
  isApiSource: boolean;
  onTaskUpdated: (task: CrmWorkflowTask) => Promise<void>;
  /** Apply created task + success toast after inline save. */
  onTaskAdded?: (task: CrmWorkflowTask) => void | Promise<void>;
  onTaskError?: (message: string) => void;
  onRequestArchiveTask?: (task: CrmWorkflowTask) => void;
};

export function WorkflowTasksTable({
  layout = 'preview',
  project,
  isApiSource,
  onTaskUpdated,
  onTaskAdded,
  onTaskError,
  onRequestArchiveTask,
}: WorkflowTasksTableProps): ReactElement {
  const router = useRouter();
  const wf = content.projectDetail.workflow;
  const isFullLayout = layout === 'full';
  const currentStage = project.summary.currentStageSlug;
  const [draftStageSlug, setDraftStageSlug] = useState<PipelineStageSlug | null>(null);

  const groups = useMemo(
    () => groupOpsWorkflowTasksByStage(project.workflowTasks, currentStage),
    [project.workflowTasks, currentStage]
  );

  const orderedGroups = useMemo(() => {
    if (draftStageSlug == null) return groups;
    return promoteWorkflowStageGroup(groups, draftStageSlug);
  }, [draftStageSlug, groups]);

  const totalTasks = countWorkflowTasksInGroups(groups);
  const previewStageGroups = isFullLayout
    ? orderedGroups
    : limitWorkflowTaskStageGroups(orderedGroups, WORKFLOW_STAGES_PREVIEW_LIMIT);
  const shouldLimitTaskRows =
    !isFullLayout && draftStageSlug == null && totalTasks > WORKFLOW_TASKS_PREVIEW_LIMIT;
  const displayGroups = shouldLimitTaskRows
    ? limitWorkflowTaskGroups(previewStageGroups, WORKFLOW_TASKS_PREVIEW_LIMIT)
    : previewStageGroups;
  const docCounts = countDocumentsByTaskId(project.documents);
  const showViewAllLink = !isFullLayout;
  const showWorkflowContent = groups.length > 0 || draftStageSlug != null;

  useEffect(() => {
    if (draftStageSlug == null) return;
    writeWorkflowStageExpanded(project.summary.slug, draftStageSlug, true);
  }, [draftStageSlug, project.summary.slug]);

  const handleSelectStage = useCallback((stageSlug: PipelineStageSlug) => {
    setDraftStageSlug(stageSlug);
  }, []);

  const handleCancelDraft = useCallback(() => {
    setDraftStageSlug(null);
  }, []);

  const handleDraftSaved = useCallback(
    async (task: CrmWorkflowTask) => {
      try {
        await onTaskAdded?.(task);
      } catch {
        onTaskError?.(content.projectDetail.saveError);
      }
    },
    [onTaskAdded, onTaskError]
  );

  const panelClass = [styles.workflowPanel, isFullLayout ? styles.workflowPanelFull : '']
    .filter(Boolean)
    .join(' ');

  const stackClass = [
    styles.stageGroupStack,
    isFullLayout ? styles.stageGroupStackFull : styles.workflowPanelGrow,
  ]
    .filter(Boolean)
    .join(' ');

  return (
    <section className={panelClass} aria-labelledby="workflow-tasks-heading">
      <DetailPanelHeader title={content.projectDetail.sections.workflow} titleId="workflow-tasks-heading">
        <WorkflowTaskStageAddButton
          disabled={draftStageSlug != null}
          onSelectStage={handleSelectStage}
        />
      </DetailPanelHeader>
      {!showWorkflowContent ? (
        <div className={isFullLayout ? undefined : styles.workflowPanelGrow}>
          <p className={styles.subtitle}>{wf.empty}</p>
        </div>
      ) : (
        <div className={stackClass}>
          {displayGroups.map((group) => (
            <WorkflowStageTaskGroup
              key={group.collapseKey}
              projectSlug={project.summary.slug}
              projectDocuments={project.documents}
              group={group}
              docCounts={docCounts}
              isApiSource={isApiSource}
              onTaskUpdated={onTaskUpdated}
              onTaskError={onTaskError}
              onRequestArchiveTask={onRequestArchiveTask}
              forceExpanded={draftStageSlug === group.stageSlug}
              draftRow={
                draftStageSlug === group.stageSlug ? (
                  <WorkflowOpsTaskDraftRow
                    project={project}
                    stageSlug={group.stageSlug}
                    isApiSource={isApiSource}
                    onSaved={handleDraftSaved}
                    onCancel={handleCancelDraft}
                  />
                ) : null
              }
            />
          ))}
        </div>
      )}
      {showViewAllLink ? (
        <div className={styles.workflowPanelFooters}>
          <button
            type="button"
            className={styles.panelFooterLink}
            onClick={() => router.push(nav.routes.projectWorkflowTasks(project.summary.slug))}
          >
            {wf.viewAll}
          </button>
        </div>
      ) : null}
    </section>
  );
}
