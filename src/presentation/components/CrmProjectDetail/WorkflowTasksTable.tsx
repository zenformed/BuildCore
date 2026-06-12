'use client';

import type { ReactElement } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmProjectDetail, CrmWorkflowTask, PipelineStageSlug } from '@/domain/crm';
import { markCrmProjectStageCompleteManual } from '@/application/use-cases/crm/markCrmProjectStageCompleteManual';
import { clearCrmProjectStageManualCompletion } from '@/application/use-cases/crm/clearCrmProjectStageManualCompletion';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import { ConfirmModal } from '@/presentation/components/ConfirmModal';
import confirmModalStyles from '@/presentation/components/ConfirmModal/ConfirmModal.module.css';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import { filterWorkflowTasksBySearch } from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
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
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { DetailPanelHeader } from './DetailPanelHeader';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelSectionRefresh } from './DetailPanelSectionRefresh';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { WorkflowOpsTaskDraftRow } from './WorkflowOpsTaskDraftRow';
import { WorkflowStageTaskGroup, type ManualStageCompletionToggleAction } from './WorkflowStageTaskGroup';
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
  const {
    routes,
    refreshWorkflowTasks,
    setToast,
    onProjectSaved,
    completion,
    showCompletionActions,
    parentRouteSlug,
    subSlug,
  } = useProjectDetailShell();
  const projectRouteScope = useMemo(
    () => (subSlug != null ? { parentSlug: parentRouteSlug } : undefined),
    [parentRouteSlug, subSlug]
  );
  const wf = content.projectDetail.workflow;
  const { permissions, isLoading, isReady } = useBuildCoreWorkflowTaskAccess();
  const { catalog } = useBuildCorePipelineStages();
  const canView = isReady && permissions.canView;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete;
  const isFullLayout = layout === 'full';
  const currentStage = project.summary.currentStageSlug;
  const [draftStageSlug, setDraftStageSlug] = useState<PipelineStageSlug | null>(null);
  const [pendingStageToggle, setPendingStageToggle] = useState<{
    stageSlug: PipelineStageSlug;
    stageLabel: string;
    action: ManualStageCompletionToggleAction;
  } | null>(null);
  const [markStageToggleBusy, setMarkStageToggleBusy] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const isSearching = searchQuery.trim().length > 0;

  const filteredTasks = useMemo(
    () => filterWorkflowTasksBySearch(project.workflowTasks, searchQuery),
    [project.workflowTasks, searchQuery]
  );

  const groups = useMemo(
    () =>
      groupOpsWorkflowTasksByStage(filteredTasks, currentStage, catalog, {
        includeEmptyStages: !isSearching,
      }),
    [catalog, filteredTasks, currentStage, isSearching]
  );

  const orderedGroups = useMemo(() => {
    if (draftStageSlug == null) return groups;
    return promoteWorkflowStageGroup(groups, draftStageSlug, catalog);
  }, [catalog, draftStageSlug, groups]);

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

  const handleConfirmStageToggle = useCallback(async () => {
    if (pendingStageToggle == null) return;
    setMarkStageToggleBusy(true);
    try {
      const updated =
        pendingStageToggle.action === 'complete'
          ? await markCrmProjectStageCompleteManual(
              crmRepositories,
              project.summary.slug,
              pendingStageToggle.stageSlug,
              projectRouteScope
            )
          : await clearCrmProjectStageManualCompletion(
              crmRepositories,
              project.summary.slug,
              pendingStageToggle.stageSlug,
              projectRouteScope
            );
      if (updated == null) {
        throw new Error(
          pendingStageToggle.action === 'complete'
            ? wf.markStageCompleteFailed
            : wf.markStageIncompleteFailed
        );
      }
      onProjectSaved(updated);
      if (showCompletionActions && completion != null) {
        completion.setProject(updated);
      }
      setToast({
        kind: 'success',
        message:
          pendingStageToggle.action === 'complete'
            ? wf.markStageCompleteSuccess
            : wf.markStageIncompleteSuccess,
      });
      setPendingStageToggle(null);
    } catch {
      setToast({
        kind: 'error',
        message:
          pendingStageToggle.action === 'complete'
            ? wf.markStageCompleteFailed
            : wf.markStageIncompleteFailed,
      });
    } finally {
      setMarkStageToggleBusy(false);
    }
  }, [
    completion,
    onProjectSaved,
    pendingStageToggle,
    project.summary.slug,
    projectRouteScope,
    setToast,
    showCompletionActions,
    wf.markStageCompleteFailed,
    wf.markStageCompleteSuccess,
    wf.markStageIncompleteFailed,
    wf.markStageIncompleteSuccess,
  ]);

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
    <>
      <section className={panelClass} aria-labelledby="workflow-tasks-heading">
      <DetailPanelHeader title={content.projectDetail.sections.workflow} titleId="workflow-tasks-heading">
        <DetailPanelHeaderActions>
          <DetailPanelSectionSearch
            value={searchQuery}
            onChange={setSearchQuery}
            placeholder={wf.searchPlaceholder}
            ariaLabel={wf.searchAriaLabel}
          />
          <DetailPanelSectionRefresh
            sectionLabel={content.projectDetail.sections.workflow}
            onRefresh={refreshWorkflowTasks}
            onError={(message) => setToast({ kind: 'error', message })}
          />
          {canCreate ? (
            <WorkflowTaskStageAddButton
              disabled={draftStageSlug != null}
              onSelectStage={handleSelectStage}
            />
          ) : null}
        </DetailPanelHeaderActions>
      </DetailPanelHeader>
      {isLoading && !isReady ? (
        <div className={isFullLayout ? undefined : styles.workflowPanelGrow}>
          <p className={styles.subtitle}>{wf.permissionsLoading}</p>
        </div>
      ) : !canView ? (
        <div className={isFullLayout ? undefined : styles.workflowPanelGrow}>
          <p className={styles.subtitle}>{wf.noViewPermission}</p>
        </div>
      ) : !showWorkflowContent ? (
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
              manualStageCompletions={project.manualStageCompletions}
              docCounts={docCounts}
              isApiSource={isApiSource}
              onTaskUpdated={onTaskUpdated}
              onTaskError={onTaskError}
              onRequestArchiveTask={canDelete ? onRequestArchiveTask : undefined}
              onRequestToggleManualStageCompletion={
                canCreate
                  ? (stageSlug, action, stageLabel) =>
                      setPendingStageToggle({ stageSlug, action, stageLabel })
                  : undefined
              }
              markStageCompleteBusy={markStageToggleBusy}
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
            onClick={() => router.push(routes.workflowTasks)}
          >
            {wf.viewAll}
          </button>
        </div>
      ) : null}
      </section>
      <ConfirmModal
        isOpen={pendingStageToggle != null}
        onClose={() => {
          if (markStageToggleBusy) return;
          setPendingStageToggle(null);
        }}
        onConfirm={() => {
          void handleConfirmStageToggle();
        }}
        title={
          pendingStageToggle?.action === 'incomplete'
            ? wf.markStageIncompleteConfirmTitle
            : pendingStageToggle != null
              ? (
                  <>
                    <strong>{pendingStageToggle.stageLabel}</strong>
                    {' has no tasks. Are you sure you want to mark this stage complete?'}
                  </>
                )
              : ''
        }
        titleClassName={
          pendingStageToggle?.action === 'complete' ? confirmModalStyles.snackbarTitleMixed : undefined
        }
        confirmLabel={
          pendingStageToggle?.action === 'incomplete'
            ? wf.markStageIncomplete
            : wf.markStageComplete
        }
        cancelLabel={wf.archiveTaskCancelLabel}
        variant="primary"
        hideIcon
      />
    </>
  );
}
