import type { SupabaseClient } from '@supabase/supabase-js';
import type { CrmProjectSummary } from '@/domain/crm';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import {
  buildMemberProjectVisibilityScope,
  collectDirectProjectIdsFromMemberVisibleTasks,
  filterProjectKeyedMapForMember,
  isProjectAccessibleToMember,
  scopeProjectSummariesForMember,
  type BuildCoreMemberProjectVisibilityScope,
  type MemberProjectVisibilityTaskRef,
} from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from './buildCorePaymentVisibilityService';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';

type DbMemberVisibilityTaskRow = {
  project_id: string;
  assigned_member_id: string | null;
  assigned_contact_id: string | null;
  amount_cents: number | null;
};

type DbProjectParentRow = {
  id: string;
  parent_project_id: string | null;
};

async function loadMemberVisibilityTaskRefs(
  supabase: SupabaseClient,
  organizationId: string
): Promise<MemberProjectVisibilityTaskRef[]> {
  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .select('project_id, assigned_member_id, assigned_contact_id, amount_cents')
    .eq('organization_id', organizationId)
    .is('archived_at', null);

  if (error != null) {
    throw new Error(error.message);
  }

  return ((data ?? []) as DbMemberVisibilityTaskRow[]).map((row) => ({
    projectId: row.project_id,
    assignedMemberId: row.assigned_member_id,
    assignedContactId: row.assigned_contact_id,
    amountCents: row.amount_cents,
  }));
}

async function loadParentProjectIdByChildId(
  supabase: SupabaseClient,
  organizationId: string,
  childProjectIds: readonly string[]
): Promise<Map<string, string | null>> {
  const parentByChildId = new Map<string, string | null>();
  if (childProjectIds.length === 0) return parentByChildId;

  const { data, error } = await supabase
    .from('crm_projects')
    .select('id, parent_project_id')
    .eq('organization_id', organizationId)
    .in('id', [...childProjectIds])
    .is('archived_at', null);

  if (error != null) {
    throw new Error(error.message);
  }

  for (const row of (data ?? []) as DbProjectParentRow[]) {
    parentByChildId.set(row.id, row.parent_project_id);
  }
  return parentByChildId;
}

export async function resolveBuildCoreMemberProjectVisibilityScope(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<BuildCoreMemberProjectVisibilityScope | null> {
  const actorRole = await loadActiveOrganizationMemberRole(supabase, organizationId, userId);
  if (!isBuildCoreMemberRole(actorRole)) {
    return null;
  }

  const [visibilityInput, paymentAccess, tasks] = await Promise.all([
    resolveBuildCoreMemberTaskVisibilityInput(supabase, organizationId, userId),
    resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
    loadMemberVisibilityTaskRefs(supabase, organizationId),
  ]);

  const directProjectIds = collectDirectProjectIdsFromMemberVisibleTasks(
    tasks,
    visibilityInput,
    paymentAccess.canView
  );
  const parentProjectIdByChildId = await loadParentProjectIdByChildId(
    supabase,
    organizationId,
    [...directProjectIds]
  );

  return buildMemberProjectVisibilityScope(directProjectIds, parentProjectIdByChildId);
}

export async function scopeCrmProjectSummariesForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  summaries: readonly CrmProjectSummary[]
): Promise<readonly CrmProjectSummary[]> {
  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null) return summaries;
  return scopeProjectSummariesForMember(summaries, scope);
}

export async function scopeCrmProjectSummaryForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  summary: CrmProjectSummary
): Promise<CrmProjectSummary | null> {
  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null) return summary;
  if (!isProjectAccessibleToMember(summary.id, scope)) {
    return null;
  }
  const scoped = scopeProjectSummariesForMember([summary], scope);
  return scoped[0] ?? null;
}

export async function memberCanAccessProjectIdForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectId: string
): Promise<boolean> {
  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null) return true;
  return isProjectAccessibleToMember(projectId, scope);
}

export async function resolveMemberAccessibleProjectIdBySlug(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  slug: string
): Promise<string | null> {
  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, slug);
  if (projectId == null) return null;
  const allowed = await memberCanAccessProjectIdForViewer(
    supabase,
    organizationId,
    userId,
    projectId
  );
  return allowed ? projectId : null;
}

export async function scopeProjectKeyedMapForViewer<T>(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  byProjectId: ReadonlyMap<string, T>
): Promise<Map<string, T>> {
  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null) return new Map(byProjectId);
  return filterProjectKeyedMapForMember(byProjectId, scope);
}

export async function isMemberParentContainerProjectOnly(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectId: string
): Promise<boolean> {
  const scope = await resolveBuildCoreMemberProjectVisibilityScope(
    supabase,
    organizationId,
    userId
  );
  if (scope == null) return false;
  return (
    scope.parentContainerProjectIds.has(projectId) && !scope.directProjectIds.has(projectId)
  );
}
