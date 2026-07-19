'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CrmDocumentMetadata, CrmProjectDetail, CrmWorkflowTask } from '@/domain/crm';
import {
  getCrmProjectDetailBySlug,
  getCrmProjectDetailBySlugSync,
  listCrmProjectChildSummaries,
  listCrmProjectChildSummariesSync,
} from '@/application/use-cases/crm';
import {
  applyBuildCoreMemberProjectDetailView,
  DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW,
  DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW,
  filterWorkflowTasksForBuildCoreMember,
} from '@/domain/buildcore/workflowTaskMemberVisibility';
import { maskProjectDetailContactEmailForMember } from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import { formatCrmMyTaskContextLine } from '@/domain/crm/myTaskAssignment';
import { isPaymentWorkflowTask } from '@/domain/crm';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { clearApiCrmDetailCache } from '@/infrastructure/crm/api/apiCrmDetailCache';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import { crmRepositories } from '@/shared/di/container';
import { formatWorkflowStageLabel } from '@/presentation/features/crmProjectDetail/crmProjectDetailFormatters';
import { applyWorkflowTasksToProject } from '@/presentation/features/crmProjectDetail/workflowTasksSectionState';
import { useAuth } from '@/presentation/hooks/useAuth';
import { useBuildCorePipelineStages } from '@/presentation/providers/BuildCorePipelineStagesProvider';
import { useBuildCoreProjectSectionAccess } from '@/presentation/providers/BuildCoreProjectSectionAccessProvider';
import { useBuildCoreWorkflowTaskAccess } from '@/presentation/providers/BuildCoreWorkflowTaskAccessProvider';

export type MemberTaskRollupMeta = {
  readonly projectSlug: string;
  readonly isSubproject: boolean;
};

export type MemberParentTaskRollup = {
  readonly loading: boolean;
  readonly displayProject: CrmProjectDetail;
  readonly taskMetaById: ReadonlyMap<string, MemberTaskRollupMeta>;
  readonly contextLineByTaskId: ReadonlyMap<string, string>;
  readonly refresh: () => Promise<void>;
  readonly patchTask: (task: CrmWorkflowTask) => void;
  readonly replaceTaskDocuments: (
    taskId: string,
    documents: readonly CrmDocumentMetadata[]
  ) => void;
};

function scopeDetailForMember(
  detail: CrmProjectDetail,
  input: {
    readonly viewerUserId: string;
    readonly onlyAssignedUserCanView: boolean;
    readonly onlyAssignedUserCanViewPayments: boolean;
    readonly memberRoleUserIds: readonly string[];
    readonly includePayments: boolean;
  }
): CrmProjectDetail {
  const visibleTasks = filterWorkflowTasksForBuildCoreMember(detail.workflowTasks, {
    viewerUserId: input.viewerUserId,
    onlyAssignedUserCanView: input.onlyAssignedUserCanView,
    onlyAssignedUserCanViewPayments: input.onlyAssignedUserCanViewPayments,
    memberRoleUserIds: input.memberRoleUserIds,
    includePaymentsAssignedToViewer: input.includePayments,
    includeBudgetForViewer: false,
  });
  return maskProjectDetailContactEmailForMember(
    applyBuildCoreMemberProjectDetailView(detail, visibleTasks, [])
  );
}

/**
 * Loads parent + child project tasks into one display model for the Member project page.
 * Refresh re-fetches parent/children and always re-applies member visibility (never the
 * shell's unscoped workflow-task list refresh).
 */
export function useMemberParentTaskRollup(
  parentProject: CrmProjectDetail,
  isApiSource: boolean
): MemberParentTaskRollup {
  const { user } = useAuth();
  const { access, isReady } = useBuildCoreWorkflowTaskAccess();
  const { payment } = useBuildCoreProjectSectionAccess();
  const { catalogForProject } = useBuildCorePipelineStages();
  const [loading, setLoading] = useState(true);
  const [parentDetail, setParentDetail] = useState<CrmProjectDetail | null>(null);
  const [childDetails, setChildDetails] = useState<readonly CrmProjectDetail[]>([]);
  const [localPatches, setLocalPatches] = useState<ReadonlyMap<string, CrmWorkflowTask>>(
    () => new Map()
  );
  const [localDocReplacements, setLocalDocReplacements] = useState<
    ReadonlyMap<string, readonly CrmDocumentMetadata[]>
  >(() => new Map());
  const parentFallbackRef = useRef(parentProject);
  parentFallbackRef.current = parentProject;
  /** After first fetch, refresh keeps tables mounted (header X handles busy state). */
  const hasLoadedOnceRef = useRef(false);
  const parentId = parentProject.summary.id;
  const parentSlug = parentProject.summary.slug;

  const catalog = catalogForProject({
    parentProjectId: parentProject.summary.parentProjectId,
  });
  const copy = content.crm.myTasks;

  const resolveScopeInput = useCallback(() => {
    const viewerUserId = access?.viewerUserId ?? user?.id ?? '';
    const onlyAssignedUserCanView =
      access?.actorRole === 'member'
        ? access.onlyAssignedUserCanView
        : DEFAULT_BUILDCORE_WORKFLOW_TASK_ONLY_ASSIGNED_USER_CAN_VIEW;
    const onlyAssignedUserCanViewPayments =
      payment.access?.actorRole === 'member' &&
      payment.access != null &&
      'onlyAssignedUserCanView' in payment.access
        ? payment.access.onlyAssignedUserCanView
        : DEFAULT_BUILDCORE_PAYMENT_ONLY_ASSIGNED_USER_CAN_VIEW;
    const memberRoleUserIds =
      access?.actorRole === 'member' ? access.memberRoleUserIds : [];
    const includePayments = payment.isReady && payment.permissions.canView;
    return {
      viewerUserId,
      onlyAssignedUserCanView,
      onlyAssignedUserCanViewPayments,
      memberRoleUserIds,
      includePayments,
    };
  }, [access, payment.access, payment.isReady, payment.permissions.canView, user?.id]);

  const scopeIfNeeded = useCallback(
    (detail: CrmProjectDetail): CrmProjectDetail => {
      const scope = resolveScopeInput();
      if (!scope.viewerUserId) return detail;
      return scopeDetailForMember(detail, scope);
    },
    [resolveScopeInput]
  );

  const load = useCallback(async () => {
    const isInitialLoad = !hasLoadedOnceRef.current;
    if (isInitialLoad) setLoading(true);
    try {
      const isApi = getCrmDataSource() === 'api';
      // Admin may have mutated tasks in another session — never reuse client detail cache.
      if (isApi) clearApiCrmDetailCache();

      const parentFresh = isApi
        ? await getCrmProjectDetailBySlug(crmRepositories, parentSlug)
        : getCrmProjectDetailBySlugSync(crmRepositories, parentSlug);

      const children = isApi
        ? await listCrmProjectChildSummaries(crmRepositories, {
            parentProjectId: parentId,
            parentSlug,
          })
        : listCrmProjectChildSummariesSync(crmRepositories, {
            parentProjectId: parentId,
            parentSlug,
          });

      const details = await Promise.all(
        children.map(async (child) => {
          if (isApi) {
            return getCrmProjectDetailBySlug(crmRepositories, child.slug);
          }
          return getCrmProjectDetailBySlugSync(crmRepositories, child.slug);
        })
      );

      const scopedParent =
        parentFresh != null
          ? scopeIfNeeded(parentFresh)
          : scopeIfNeeded(parentFallbackRef.current);
      const scopedChildren = details
        .filter((detail): detail is CrmProjectDetail => detail != null)
        .map((detail) => scopeIfNeeded(detail));

      setParentDetail(scopedParent);
      setChildDetails(scopedChildren);
      setLocalPatches(new Map());
      setLocalDocReplacements(new Map());
      hasLoadedOnceRef.current = true;
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [parentId, parentSlug, scopeIfNeeded]);

  useEffect(() => {
    hasLoadedOnceRef.current = false;
    setLoading(true);
  }, [parentId]);

  useEffect(() => {
    if (!isReady && !isApiSource) return;
    void load();
  }, [isApiSource, isReady, load, parentId]);

  const effectiveParent = parentDetail ?? scopeIfNeeded(parentProject);

  const taskMetaById = useMemo(() => {
    const map = new Map<string, MemberTaskRollupMeta>();
    for (const task of effectiveParent.workflowTasks) {
      map.set(task.id, {
        projectSlug: effectiveParent.summary.slug,
        isSubproject: false,
      });
    }
    for (const child of childDetails) {
      for (const task of child.workflowTasks) {
        map.set(task.id, {
          projectSlug: child.summary.slug,
          isSubproject: true,
        });
      }
    }
    return map;
  }, [childDetails, effectiveParent.summary.slug, effectiveParent.workflowTasks]);

  const displayProject = useMemo(() => {
    const mergedTasks: CrmWorkflowTask[] = [
      ...effectiveParent.workflowTasks,
      ...childDetails.flatMap((child) => child.workflowTasks),
    ].map((task) => localPatches.get(task.id) ?? task);

    let documents: CrmDocumentMetadata[] = [
      ...effectiveParent.documents,
      ...childDetails.flatMap((child) => child.documents),
    ];
    for (const [taskId, docs] of localDocReplacements) {
      documents = [...docs, ...documents.filter((doc) => doc.workflowTaskId !== taskId)];
    }

    return applyWorkflowTasksToProject(
      {
        ...effectiveParent,
        documents,
      },
      mergedTasks
    );
  }, [childDetails, effectiveParent, localDocReplacements, localPatches]);

  const contextLineByTaskId = useMemo(() => {
    const map = new Map<string, string>();
    for (const task of displayProject.workflowTasks) {
      const meta = taskMetaById.get(task.id);
      const isSubproject = meta?.isSubproject ?? false;
      const stageLabel = isPaymentWorkflowTask(task)
        ? copy.paymentContextLabel
        : formatWorkflowStageLabel(task.stageSlug, catalog) || task.stageSlug;
      map.set(
        task.id,
        formatCrmMyTaskContextLine(
          {
            kind: isPaymentWorkflowTask(task) ? 'payment' : 'workflow',
            subprojectId: isSubproject ? 'sub' : null,
            subprojectName: isSubproject ? 'sub' : null,
          },
          {
            projectLabel: copy.projectContextLabel,
            subprojectLabel: copy.subprojectContextLabel,
            paymentLabel: copy.paymentContextLabel,
            stageLabel,
          }
        )
      );
    }
    return map;
  }, [
    catalog,
    copy.paymentContextLabel,
    copy.projectContextLabel,
    copy.subprojectContextLabel,
    displayProject.workflowTasks,
    taskMetaById,
  ]);

  const patchTask = useCallback((task: CrmWorkflowTask) => {
    setLocalPatches((prev) => {
      const next = new Map(prev);
      next.set(task.id, task);
      return next;
    });
  }, []);

  const replaceTaskDocuments = useCallback(
    (taskId: string, documents: readonly CrmDocumentMetadata[]) => {
      setLocalDocReplacements((prev) => {
        const next = new Map(prev);
        next.set(taskId, documents);
        return next;
      });
    },
    []
  );

  return {
    loading,
    displayProject,
    taskMetaById,
    contextLineByTaskId,
    refresh: load,
    patchTask,
    replaceTaskDocuments,
  };
}
