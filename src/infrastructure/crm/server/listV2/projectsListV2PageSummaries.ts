/**
 * Bounded page-scoped summaries for Projects list v2 (Phase 1B).
 * Never loads org-wide payment/progress Maps.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import {
  computePaymentFinancialsFromTasks,
  getPaymentTasksForProject,
} from '@/domain/crm/projectPaymentValue';
import {
  resolveDerivedWorkflowStageSlugFromProgressInput,
  resolveProjectWorkflowProgressDisplay,
} from '@/domain/buildcore/projectPipelineProgress';
import { getWorkflowProgressInputForProject } from '@/domain/crm/projectWorkflowProgressInput';
import type { CrmProjectsListV2PageSummariesResponse } from '@/domain/crm/projectsListV2';
import { CRM_PROJECTS_LIST_V2_PAGE_SIZES } from '@/domain/crm/projectsListV2';
import {
  listPaymentBalanceTasksByProjectIds,
  listWorkflowProgressInputsByProjectIds,
} from '../crmReadService';
import { loadOrganizationPipelineStageCatalog } from '../pipelineStageService';
import { memberCanAccessProjectIdForViewer } from '../crmMemberProjectVisibilityService';
import { CrmProjectsListV2InvalidRequestError } from './projectsListV2Errors';

const MAX_SUMMARY_IDS = Math.max(...CRM_PROJECTS_LIST_V2_PAGE_SIZES);

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value
  );
}

export async function loadCrmProjectsPageSummariesForIds(input: {
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
  readonly userId: string;
  readonly projectIds: readonly string[];
}): Promise<CrmProjectsListV2PageSummariesResponse> {
  const uniqueIds = [...new Set(input.projectIds.map((id) => id.trim()).filter(Boolean))];
  if (uniqueIds.length === 0) {
    return { byProjectId: {}, meta: { apiVersion: 2 } };
  }
  if (uniqueIds.length > MAX_SUMMARY_IDS) {
    throw new CrmProjectsListV2InvalidRequestError(
      `projectIds must contain at most ${MAX_SUMMARY_IDS} ids`
    );
  }
  for (const id of uniqueIds) {
    if (!isUuid(id)) {
      throw new CrmProjectsListV2InvalidRequestError('projectIds must be UUIDs');
    }
  }

  // Org membership + non-archived gate first (do not leak cross-org existence).
  const { data: projectRows, error: projectError } = await input.supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', input.organizationId)
    .in('id', uniqueIds)
    .is('archived_at', null);
  if (projectError) {
    throw new Error(projectError.message);
  }
  const existingIds = (projectRows ?? []).map((row) => row.id as string);

  const visibleIds: string[] = [];
  for (const projectId of existingIds) {
    const allowed = await memberCanAccessProjectIdForViewer(
      input.supabase,
      input.organizationId,
      input.userId,
      projectId
    );
    if (allowed) visibleIds.push(projectId);
  }

  if (visibleIds.length === 0) {
    return { byProjectId: {}, meta: { apiVersion: 2 } };
  }

  const [paymentIndex, progressIndex, stageCatalog, childCountRows] = await Promise.all([
    listPaymentBalanceTasksByProjectIds(
      input.supabase,
      input.organizationId,
      visibleIds
    ),
    listWorkflowProgressInputsByProjectIds(
      input.supabase,
      input.organizationId,
      visibleIds
    ),
    loadOrganizationPipelineStageCatalog(
      input.supabase,
      input.organizationId,
      'project'
    ),
    input.supabase
      .from('crm_projects')
      .select('parent_project_id')
      .eq('organization_id', input.organizationId)
      .in('parent_project_id', visibleIds)
      .is('archived_at', null),
  ]);

  if (childCountRows.error) {
    throw new Error(childCountRows.error.message);
  }

  const childCountByParent = new Map<string, number>();
  for (const id of visibleIds) childCountByParent.set(id, 0);
  for (const row of childCountRows.data ?? []) {
    const parentId = row.parent_project_id as string | null;
    if (parentId == null) continue;
    childCountByParent.set(parentId, (childCountByParent.get(parentId) ?? 0) + 1);
  }

  const byProjectId: Record<string, CrmProjectsListV2PageSummariesResponse['byProjectId'][string]> =
    {};
  for (const projectId of visibleIds) {
    const payment = computePaymentFinancialsFromTasks(
      getPaymentTasksForProject(paymentIndex, projectId)
    );
    const workflowProgressInput = getWorkflowProgressInputForProject(progressIndex, projectId);
    const progress = resolveProjectWorkflowProgressDisplay({
      workflowProgressInput,
      stages: stageCatalog,
    });
    const derivedStageSlug = resolveDerivedWorkflowStageSlugFromProgressInput({
      workflowProgressInput,
      stages: stageCatalog,
    });

    byProjectId[projectId] = {
      payment,
      progress,
      derivedStageSlug,
      childCount: childCountByParent.get(projectId) ?? 0,
    };
  }

  return { byProjectId, meta: { apiVersion: 2 } };
}
