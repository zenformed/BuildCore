'use client';

import type { ReactElement } from 'react';
import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LuSearch } from 'react-icons/lu';
import {
  isPaymentWorkflowTask,
  type CrmProjectDetail,
  type CrmWorkflowTask,
  type PipelineStageSlug,
} from '@/domain/crm';
import { resolvePipelineStageScopeForProject } from '@/domain/buildcore/orgPipelineStages';
import { shouldHideEmptyStageGroups } from '@/domain/buildcore/buildCoreMemberAssigneeVisibility';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { countDocumentsByTaskId } from '@/presentation/features/crmProjectDetail/workflowDocumentCounts';
import {
  buildCrmAssigneeFilterOptionsFromTasks,
  filterWorkflowTasksByListFilters,
  filterWorkflowTasksBySearch,
} from '@/presentation/features/crmProjectDetail/projectSectionSearchModel';
import {
  EMPTY_CRM_PROJECTS_LIST_FILTERS,
  isCrmProjectsListFiltersActive,
  type CrmProjectsListFilters,
} from '@/presentation/features/crmProjects/crmProjectsPipelineViewModel';
import { CrmProjectsFilterMenu } from '@/presentation/components/CrmProjects/CrmProjectsFilterMenu';
import { useProjectDetailShell } from '@/presentation/features/crmProjectDetail/ProjectDetailShellContext';
import {
  countWorkflowTasksInGroups,
  groupOpsWorkflowTasksByStage,
  limitWorkflowTaskGroups,
  limitWorkflowTaskStageGroups,
  WORKFLOW_STAGES_PREVIEW_LIMIT,
  WORKFLOW_TASKS_PREVIEW_LIMIT,
} from '@/presentation/features/crmProjectDetail/workflowTaskGroups';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useDashboardMobileLayout } from '@/presentation/features/crmProjects/useDashboardMobileLayout';
import { DetailPanelHeaderActions } from './DetailPanelHeaderActions';
import { DetailPanelHeaderMoreMenu } from './DetailPanelHeaderMoreMenu';
import { DetailPanelSectionSearch } from './DetailPanelSectionSearch';
import { FolderTabToolbarPortal } from '@/presentation/features/crmProjectDetail/folderTabToolbarContext';
import {
  WorkflowMobileHideWhenBulkActive,
  WorkflowMobileSearchToolsRow,
  WorkflowMobileSelectedFloatingPill,
} from './MobileBulkSelectionChrome';
import { WorkflowStageTaskGroup } from './WorkflowStageTaskGroup';
import { workflowStageAccentColor } from '@/presentation/features/crmProjectDetail/workflowStageAccentColors';
import { WorkflowTaskStageAddButton } from './WorkflowTaskStageAddButton';
import { CrmDirectUploadStatusHost } from './CrmDirectUploadStatus';
import projectsStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import {
  WorkflowTasksViewToggleButton,
  type WorkflowTaskViewMode,
} from './WorkflowTasksViewToggleButton';
import { WorkflowUsersColumn } from './WorkflowUsersColumn';
import { WorkflowAssigneeDragHeldIndicator } from './WorkflowAssigneeDragHeldIndicator';
import { WorkflowTaskAssigneeDragProvider } from '@/presentation/features/crmProjectDetail/workflowTaskAssigneeDragContext';
import { WorkflowTaskRowSelectionProvider } from '@/presentation/features/crmProjectDetail/workflowTaskRowSelectionContext';
import {
  isMemberCompletedWorkflowTask,
  MemberCompletedTasksSection,
} from './MemberCompletedTasksSection';
import { MemberNoActiveTasksRow } from './MemberNoActiveTasksRow';
import { WorkflowTaskInlineRow } from './WorkflowTaskInlineRow';
import { resolveWorkflowOpsGridClassName } from './WorkflowTaskTableCustomColumns';
import { useBuildCoreWorkflowTaskTableColumns } from '@/presentation/providers/BuildCoreWorkflowTaskTableColumnsProvider';
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
  /** When false, all ops tasks render in one flat list (no stage sections). */
  groupByStage?: boolean;
  /** Hide stage section chrome when using a flat list. */
  hideStageHeaders?: boolean;
  /** Resolve owning project slug per task (parent vs subproject rollups). */
  resolveTaskProjectSlug?: (taskId: string) => string;
  /** Optional second-line context under the task title. */
  taskContextLineById?: ReadonlyMap<string, string>;
  /** Override panel refresh (e.g. parent+child rollup reload). */
  onRefreshTasks?: () => Promise<void>;
  /** When true, header actions render in the shared folder tab bar. */
  embeddedInFolderTabs?: boolean;
};

export function WorkflowTasksTable({
  layout = 'preview',
  project,
  isApiSource,
  onTaskUpdated,
  onTaskAdded,
  onTaskError,
  onRequestArchiveTask,
  groupByStage = true,
  hideStageHeaders = false,
  resolveTaskProjectSlug,
  taskContextLineById,
  onRefreshTasks,
  embeddedInFolderTabs = false,
}: WorkflowTasksTableProps): ReactElement {
  const router = useRouter();
  const {
    routes,
    refreshWorkflowTasks,
    refreshRollupIndexes,
    setToast,
    onProjectSaved,
    parentRouteSlug,
    subSlug,
    openCreateWorkflowTask,
    projectMutationsLocked,
    guardProjectEdit,
    isMemberRole,
  } = useProjectDetailShell();
  const projectRouteScope = useMemo(
    () => (subSlug != null ? { parentSlug: parentRouteSlug } : undefined),
    [parentRouteSlug, subSlug]
  );
  const wf = content.projectDetail.workflow;
  const { permissions, isLoading, isReady } = useBuildCoreWorkflowTaskAccess();
  const { catalogForProject } = useBuildCorePipelineStages();
  const { gridClassName: workflowCustomGridClassName } = useBuildCoreWorkflowTaskTableColumns();
  const catalog = catalogForProject({ parentProjectId: project.summary.parentProjectId });
  const canView = isReady && permissions.canView;
  const canCreate = isReady && permissions.canCreate;
  const canDelete = isReady && permissions.canDelete && !projectMutationsLocked;
  const canAssignTasks =
    (!isApiSource || (isReady && permissions.canEdit)) &&
    !projectMutationsLocked &&
    !isMemberRole;
  const isFullLayout = layout === 'full';
  const isMobileLayout = useDashboardMobileLayout();
  const currentStage = project.summary.currentStageSlug;
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState<CrmProjectsListFilters>(EMPTY_CRM_PROJECTS_LIST_FILTERS);
  const [taskViewMode, setTaskViewMode] = useState<WorkflowTaskViewMode>('table');
  const isDesktopStageCardMode = groupByStage && !isMobileLayout && taskViewMode === 'cards';
  const useCardTaskLayout = isMobileLayout || isDesktopStageCardMode;
  const useUnifiedDesktopTable = !isMobileLayout && !isDesktopStageCardMode;
  const isSearching = searchQuery.trim().length > 0;
  const filtersActive = isCrmProjectsListFiltersActive(filters);
  const isNarrowingResults = isSearching || filtersActive;
  const stageFilterSlugs = filters.stageSlugs;
  const stageFilterActive = stageFilterSlugs.length > 0;
  const assigneeFilterOptions = useMemo(
    () =>
      buildCrmAssigneeFilterOptionsFromTasks(
        project.workflowTasks.filter((task) => !isPaymentWorkflowTask(task)),
        content.projectDetail.edit.assigneeUnassigned
      ),
    [project.workflowTasks]
  );

  const filteredTasks = useMemo(() => {
    const byFilters = filterWorkflowTasksByListFilters(
      project.workflowTasks,
      filters,
      project.summary.priority
    );
    return filterWorkflowTasksBySearch(byFilters, searchQuery, catalog);
  }, [catalog, filters, project.summary.priority, project.workflowTasks, searchQuery]);

  const hideEmptyStages = shouldHideEmptyStageGroups({
    canViewAllStages: permissions.canViewAllStages,
  });

  const groups = useMemo(() => {
    if (!groupByStage) {
      const opsTasks = filteredTasks.filter((task) => !isPaymentWorkflowTask(task));
      const listTasks = isMemberRole
        ? opsTasks.filter((task) => !isMemberCompletedWorkflowTask(task.status))
        : opsTasks;
      if (listTasks.length === 0) return [];
      return [
        {
          collapseKey: currentStage,
          stageSlug: currentStage,
          stageLabel: content.projectDetail.sections.workflow,
          isPaymentsGroup: false as const,
          tasks: listTasks,
        },
      ];
    }
    // Stage filters should still show the selected stage shell(s) even with zero tasks,
    // so table chrome (select + headers) stays available to clear/adjust the filter.
    const includeEmptyStages =
      stageFilterActive || (!isNarrowingResults && !hideEmptyStages);
    const tasksForGroups = isMemberRole
      ? filteredTasks.filter((task) => !isMemberCompletedWorkflowTask(task.status))
      : filteredTasks;
    const grouped = groupOpsWorkflowTasksByStage(tasksForGroups, currentStage, catalog, {
      includeEmptyStages,
    });
    if (!stageFilterActive) return grouped;
    return grouped.filter((group) => stageFilterSlugs.includes(group.stageSlug));
  }, [
    catalog,
    currentStage,
    filteredTasks,
    groupByStage,
    hideEmptyStages,
    isMemberRole,
    isNarrowingResults,
    stageFilterActive,
    stageFilterSlugs,
  ]);

  const memberCompletedTasks = useMemo(() => {
    if (!isMemberRole) return [];
    return filteredTasks.filter(
      (task) => !isPaymentWorkflowTask(task) && isMemberCompletedWorkflowTask(task.status)
    );
  }, [filteredTasks, isMemberRole]);

  const orderedGroups = groups;
  const totalTasks = countWorkflowTasksInGroups(groups);
  const previewStageGroups = isFullLayout
    ? orderedGroups
    : limitWorkflowTaskStageGroups(orderedGroups, WORKFLOW_STAGES_PREVIEW_LIMIT);
  const shouldLimitTaskRows = !isFullLayout && totalTasks > WORKFLOW_TASKS_PREVIEW_LIMIT;
  const displayGroups = shouldLimitTaskRows
    ? limitWorkflowTaskGroups(previewStageGroups, WORKFLOW_TASKS_PREVIEW_LIMIT)
    : previewStageGroups;
  const docCounts = countDocumentsByTaskId(project.documents);
  const showViewAllLink = !isFullLayout;
  const showWorkflowContent =
    groups.length > 0 || (isMemberRole && memberCompletedTasks.length > 0);

  const handleSelectStage = useCallback(
    (stageSlug: PipelineStageSlug) => {
      openCreateWorkflowTask({ context: 'workflow', stageSlug });
    },
    [openCreateWorkflowTask]
  );

  const panelClass = [styles.workflowPanel, isFullLayout ? styles.workflowPanelFull : '']
    .filter(Boolean)
    .join(' ');

  const stageGroupsClass = [
    styles.stageGroupStack,
    isDesktopStageCardMode ? styles.stageGroupStackDesktopCards : '',
  ]
    .filter(Boolean)
    .join(' ');

  const stackClass = [
    isDesktopStageCardMode ? styles.stageGroupStackDesktopCardsLayout : styles.stageGroupStack,
    isFullLayout ? styles.stageGroupStackFull : styles.workflowPanelGrow,
  ]
    .filter(Boolean)
    .join(' ');

  const filterMenu = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      stageScopeMode={resolvePipelineStageScopeForProject({
        parentProjectId: project.summary.parentProjectId,
      })}
      sections={['stage', 'priority', 'status', 'assigned', 'documentsRequired']}
      assigneeFilterOptions={assigneeFilterOptions}
      triggerVariant={embeddedInFolderTabs ? 'ghost' : 'filter'}
    />
  );
  const mobileFilterButton = (
    <CrmProjectsFilterMenu
      filters={filters}
      onChange={setFilters}
      stageScopeMode={resolvePipelineStageScopeForProject({
        parentProjectId: project.summary.parentProjectId,
      })}
      sections={['stage', 'priority', 'status', 'assigned', 'documentsRequired']}
      assigneeFilterOptions={assigneeFilterOptions}
      triggerVariant="ghost"
      menuAlign="start"
    />
  );

  const viewToggleButton =
    !isMobileLayout && groupByStage ? (
      <WorkflowTasksViewToggleButton
        viewMode={taskViewMode}
        onToggle={() => setTaskViewMode((mode) => (mode === 'table' ? 'cards' : 'table'))}
      />
    ) : null;

  const searchInput = isMobileLayout ? (
    <div className={styles.subprojectsSearchFieldWrap}>
      <LuSearch className={styles.subprojectsSearchIcon} size={14} strokeWidth={2} aria-hidden />
      <input
        type="search"
        value={searchQuery}
        onChange={(event) => setSearchQuery(event.target.value)}
        placeholder={wf.searchPlaceholder}
        aria-label={wf.searchAriaLabel}
        className={`${styles.subprojectsSearch} ${styles.subprojectsSearch_withIcon}`}
      />
    </div>
  ) : (
    <DetailPanelSectionSearch
      value={searchQuery}
      onChange={setSearchQuery}
      placeholder={wf.searchPlaceholder}
      ariaLabel={wf.searchAriaLabel}
    />
  );

  const addButton = canCreate ? (
    <WorkflowTaskStageAddButton onSelectStage={handleSelectStage} />
  ) : (
    <div className={styles.detailPanelHeaderBtnWrap}>
      <CrmDirectUploadStatusHost />
    </div>
  );
  const desktopMoreMenu = !isMobileLayout ? (
    <DetailPanelHeaderMoreMenu
      refreshAction={{
        sectionLabel: content.projectDetail.sections.workflow,
        onRefresh: onRefreshTasks ?? refreshWorkflowTasks,
        onError: (message) => setToast({ kind: 'error', message }),
      }}
    />
  ) : null;
  const mobileFloatingAddButton = canCreate ? (
    <WorkflowTaskStageAddButton onSelectStage={handleSelectStage} mobileFloating />
  ) : null;
  const mobileSearchTrailingActions = (
    <div className={styles.workflowMobileSearchActions}>
      {mobileFilterButton}
    </div>
  );
  const mobileHeaderContent = (
    <>
      <WorkflowMobileSearchToolsRow
        searchInput={searchInput}
        trailingActions={mobileSearchTrailingActions}
      />
    </>
  );

  const visibleTaskIds = useMemo(
    () => displayGroups.flatMap((group) => group.tasks.map((task) => task.id)),
    [displayGroups]
  );
  const tasksById = useMemo(() => {
    const map = new Map<string, (typeof filteredTasks)[number]>();
    for (const task of filteredTasks) {
      map.set(task.id, task);
    }
    return map;
  }, [filteredTasks]);
  const selectionBulkActions = useMemo(
    () => ({
      canDelete,
      canApprove: permissions.canApprove && !projectMutationsLocked,
      canChangeNonDoneStatus: permissions.canView && !projectMutationsLocked,
      canAssign: permissions.canEdit && !projectMutationsLocked && !isMemberRole,
      canNotifyAssigned:
        permissions.canEdit && isApiSource && !projectMutationsLocked && !isMemberRole,
      tasksById,
      docCountByTaskId: docCounts,
      onTaskUpdated,
    }),
    [
      canDelete,
      docCounts,
      isApiSource,
      onTaskUpdated,
      permissions.canApprove,
      permissions.canEdit,
      permissions.canView,
      projectMutationsLocked,
      isMemberRole,
      tasksById,
    ]
  );

  const stageGroupElements = displayGroups.map((group, stageIndex) => (
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
      collapsible={groupByStage}
      showStageHeader={!hideStageHeaders && groupByStage}
      resolveTaskProjectSlug={resolveTaskProjectSlug}
      taskContextLineById={taskContextLineById}
      useCardLayout={useCardTaskLayout}
      layoutAsStageCard={isDesktopStageCardMode && groupByStage}
      unifiedDesktopTable={useUnifiedDesktopTable}
      accentColor={workflowStageAccentColor(stageIndex, displayGroups.length)}
    />
  ));

  const memberCompletedRows = memberCompletedTasks.map((task) => (
    <WorkflowTaskInlineRow
      key={task.id}
      variant={useCardTaskLayout || isMobileLayout ? (isMobileLayout ? 'mobile' : 'compact') : 'table'}
      projectSlug={resolveTaskProjectSlug?.(task.id) ?? project.summary.slug}
      task={task}
      docCount={docCounts.get(task.id) ?? 0}
      taskDocuments={project.documents.filter((doc) => doc.workflowTaskId === task.id)}
      enableCustomColumns={!useCardTaskLayout && !isMobileLayout}
      contextLine={taskContextLineById?.get(task.id) ?? null}
      isApiSource={isApiSource}
      onUpdated={onTaskUpdated}
      onTaskError={onTaskError}
    />
  ));

  const memberCompletedSection =
    isMemberRole && memberCompletedTasks.length > 0 ? (
      <MemberCompletedTasksSection taskCount={memberCompletedTasks.length}>
        {useCardTaskLayout || isMobileLayout ? (
          <div className={styles.memberCompletedTasksCards}>{memberCompletedRows}</div>
        ) : (
          <div className={styles.stageGroup_unifiedTableSection}>
            <div className={styles.stageGroupTable}>{memberCompletedRows}</div>
          </div>
        )}
      </MemberCompletedTasksSection>
    ) : null;

  const activeTasksEmpty =
    isMemberRole && groups.length === 0 && memberCompletedTasks.length > 0;

  const memberNoActiveTasksGridClass = [
    styles.memberProjectWorkflowGrid,
    resolveWorkflowOpsGridClassName(true, workflowCustomGridClassName),
  ]
    .filter(Boolean)
    .join(' ');

  const memberNoActiveTasksRow = activeTasksEmpty ? (
    <MemberNoActiveTasksRow
      gridClassName={memberNoActiveTasksGridClass}
      variant={useCardTaskLayout || isMobileLayout ? 'mobile' : 'table'}
    />
  ) : null;

  const tableBody = useCardTaskLayout ? (
    isDesktopStageCardMode ? (
      <WorkflowTaskAssigneeDragProvider>
        <div className={stageGroupsClass}>{stageGroupElements}</div>
        <WorkflowUsersColumn tasks={filteredTasks} canAssignTasks={canAssignTasks} />
        <WorkflowAssigneeDragHeldIndicator />
      </WorkflowTaskAssigneeDragProvider>
    ) : (
      <>
        {memberNoActiveTasksRow ?? stageGroupElements}
        {memberCompletedSection}
      </>
    )
  ) : useUnifiedDesktopTable ? (
    <div className={styles.workflowUnifiedTable}>
      <div className={styles.workflowUnifiedTableBody}>
        {memberNoActiveTasksRow ?? stageGroupElements}
        {memberCompletedSection}
      </div>
    </div>
  ) : (
    <>
      {memberNoActiveTasksRow ?? stageGroupElements}
      {memberCompletedSection}
    </>
  );

  const headerActions = (
    <DetailPanelHeaderActions>
      {filterMenu}
      {viewToggleButton}
      {searchInput}
      <div className={projectsStyles.desktopCreateActions}>
        {addButton}
        {desktopMoreMenu}
      </div>
    </DetailPanelHeaderActions>
  );

  const panel = (
    <section
      className={panelClass}
      aria-label={content.projectDetail.sections.workflow}
    >
      {isMobileLayout && embeddedInFolderTabs ? (
        <FolderTabToolbarPortal>
          <div className={styles.workflowFolderToolbar}>{mobileHeaderContent}</div>
        </FolderTabToolbarPortal>
      ) : isMobileLayout ? (
        <div
          className={[styles.detailPanelHeader, styles.detailPanelHeader_mobile]
            .filter(Boolean)
            .join(' ')}
        >
          {mobileHeaderContent}
        </div>
      ) : embeddedInFolderTabs ? (
        <FolderTabToolbarPortal>{headerActions}</FolderTabToolbarPortal>
      ) : (
        <div className={styles.detailPanelHeader}>{headerActions}</div>
      )}
      {isMobileLayout ? (
        <>
          <WorkflowMobileSelectedFloatingPill />
          <WorkflowMobileHideWhenBulkActive>
            {mobileFloatingAddButton}
          </WorkflowMobileHideWhenBulkActive>
        </>
      ) : null}
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
        <div className={stackClass}>{tableBody}</div>
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
  );

  const useSelectionProvider = !isDesktopStageCardMode;

  return (
    <>
      {useSelectionProvider ? (
        <WorkflowTaskRowSelectionProvider
          visibleTaskIds={visibleTaskIds}
          bulkActions={selectionBulkActions}
        >
          {panel}
        </WorkflowTaskRowSelectionProvider>
      ) : (
        panel
      )}
    </>
  );
}
