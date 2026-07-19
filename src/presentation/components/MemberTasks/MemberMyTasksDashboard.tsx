'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { useRouter } from 'next/navigation';
import type { CrmMyTaskAssigneeScope, CrmMyTaskAssignment } from '@/domain/crm/myTaskAssignment';
import {
  formatCrmMyTaskContextLine,
  groupCrmMyTasksByParentProject,
} from '@/domain/crm/myTaskAssignment';
import { getPipelineStage } from '@/domain/crm';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { useBuildCoreNavigation } from '@/presentation/providers/BuildCoreNavigationProvider';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { fetchCrmMyTasks } from '@/presentation/features/memberTasks/fetchCrmMyTasks';
import { WorkflowTaskSummaryCompactRow } from '@/presentation/components/crmShared/WorkflowTaskSummaryCompactRow';
import panelStyles from '@/presentation/components/CrmProjects/CrmProjects.module.css';
import detailStyles from '@/presentation/components/CrmProjectDetail/ProjectDetail.module.css';

function stageLabelForTask(
  task: CrmMyTaskAssignment,
  catalog: ReturnType<typeof useBuildCorePipelineStages>['catalogForProject']
): string {
  if (isPaymentWorkflowTask(task) || task.kind === 'payment') {
    return content.crm.myTasks.paymentContextLabel;
  }
  const stages = catalog({
    parentProjectId: task.subprojectId != null ? task.parentProjectId : null,
  });
  return formatWorkflowStageLabel(task.stageSlug, stages) || getPipelineStage(task.stageSlug).label;
}

export function MemberMyTasksDashboard(): ReactElement {
  const copy = content.crm.myTasks;
  const router = useRouter();
  const nav = useBuildCoreNavigation();
  const { catalogForProject } = useBuildCorePipelineStages();
  const [assigneeScope, setAssigneeScope] = useState<CrmMyTaskAssigneeScope>('mine');
  const [tasks, setTasks] = useState<readonly CrmMyTaskAssignment[]>([]);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (scope: CrmMyTaskAssigneeScope) => {
      setLoading(true);
      setError(null);
      try {
        const response = await fetchCrmMyTasks(scope);
        setTasks(response.tasks);
        setFilterAvailable(response.assigneeFilter.available);
        if (!response.assigneeFilter.available && scope !== 'mine') {
          setAssigneeScope('mine');
        }
      } catch {
        setError(copy.loadFailed);
        setTasks([]);
      } finally {
        setLoading(false);
      }
    },
    [copy.loadFailed]
  );

  useEffect(() => {
    void load(assigneeScope);
  }, [assigneeScope, load]);

  const groups = useMemo(() => groupCrmMyTasksByParentProject(tasks), [tasks]);

  const openParentProject = (parentProjectSlug: string) => {
    router.push(nav.routes.projectDetail(parentProjectSlug));
  };

  return (
    <section
      className={panelStyles.projectsPanel}
      aria-labelledby="member-my-tasks-title"
      data-member-my-tasks-dashboard
    >
      <div className={panelStyles.projectsPanelHeader}>
        <div className={panelStyles.projectsPanelTitleRow}>
          <h1 id="member-my-tasks-title" className={panelStyles.projectsPanelTitle}>
            {copy.title}
          </h1>
          {filterAvailable ? (
            <div
              className={panelStyles.projectsPanelHeaderRowActions}
              role="group"
              aria-label={copy.assigneeFilterAriaLabel}
            >
              {(
                [
                  ['mine', copy.assigneeScopeMine],
                  ['others', copy.assigneeScopeOthers],
                  ['everyone', copy.assigneeScopeEveryone],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  className={
                    assigneeScope === value
                      ? `${panelStyles.projectsFilterBtn} ${panelStyles.projectsFilterBtn_active}`
                      : panelStyles.projectsFilterBtn
                  }
                  aria-pressed={assigneeScope === value}
                  onClick={() => setAssigneeScope(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      </div>

      <div className={panelStyles.projectsPanelBody}>
        {loading ? <p className={detailStyles.subtitle}>{copy.loading}</p> : null}
        {error ? <p className={detailStyles.subtitle}>{error}</p> : null}

        {!loading && !error && groups.length === 0 ? (
          <p className={detailStyles.subtitle}>
            {filterAvailable && assigneeScope !== 'mine' ? copy.emptyFiltered : copy.empty}
          </p>
        ) : null}

        {!loading && !error
          ? groups.map((group) => (
              <section
                key={group.parentProjectId}
                className={detailStyles.stageGroup}
                aria-labelledby={`my-tasks-group-${group.parentProjectId}`}
              >
                <h2
                  id={`my-tasks-group-${group.parentProjectId}`}
                  className={detailStyles.stageGroupTitle}
                >
                  {group.parentProjectName}
                </h2>
                <div className={detailStyles.stageGroupMobileTaskList}>
                  {group.tasks.map((task) => {
                    const context = formatCrmMyTaskContextLine(task, {
                      projectLabel: copy.projectContextLabel,
                      subprojectLabel: copy.subprojectContextLabel,
                      paymentLabel: copy.paymentContextLabel,
                      stageLabel: stageLabelForTask(task, catalogForProject),
                    });
                    return (
                      <WorkflowTaskSummaryCompactRow
                        key={task.taskId}
                        title={task.title}
                        status={task.status}
                        contextLine={context}
                        dueAt={task.dueAt}
                        amountCents={task.amountCents}
                        showAmount={task.kind === 'payment'}
                        ariaLabel={copy.openTaskAriaLabel(task.title)}
                        onOpen={() => openParentProject(task.parentProjectSlug)}
                      />
                    );
                  })}
                </div>
              </section>
            ))
          : null}
      </div>
    </section>
  );
}
