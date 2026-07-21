import type { SupabaseClient } from '@supabase/supabase-js';
import { isPaymentWorkflowTask } from '@/domain/crm/paymentWorkflow';
import { isBuildCoreMemberRole } from '@/domain/buildcore/memberRole';
import { isProjectAccessibleToMember } from '@/domain/buildcore/buildCoreMemberProjectVisibility';
import { isBuildCoreMemberAssigneeVisibleToViewer } from '@/domain/buildcore/buildCoreMemberAssigneeVisibility';
import { resolveBuildCoreMemberProjectVisibilityScope } from './crmMemberProjectVisibilityService';
import { loadActiveOrganizationMemberRole } from './buildCoreWorkflowTaskVisibilityService';
import { resolveBuildCoreMemberTaskVisibilityInput } from './buildCorePaymentVisibilityService';
import { resolveBuildCoreWorkflowTaskAccessForUser } from './buildCoreWorkflowTaskPermissionService';
import { resolveBuildCoreRoleAccessForUser } from './buildCoreRoleAccessService';

export type OrganizationPhotoProjectRow = {
  id: string;
  slug: string;
  name: string;
  parent_project_id: string | null;
  crm_clients?: { company_name?: string | null } | { company_name?: string | null }[] | null;
  crm_contacts?: { full_name?: string | null } | { full_name?: string | null }[] | null;
};

export type OrganizationPhotoTaskRow = {
  id: string;
  project_id: string;
  title: string;
  stage_slug: string;
  assigned_member_id: string | null;
  amount_cents: number | null;
};

export type OrganizationPhotoAccessContext = {
  readonly projectById: ReadonlyMap<string, OrganizationPhotoProjectRow>;
  readonly actorIsMember: boolean;
  readonly memberVisibility: Awaited<
    ReturnType<typeof resolveBuildCoreMemberTaskVisibilityInput>
  > | null;
  readonly workflowAccess: Awaited<
    ReturnType<typeof resolveBuildCoreWorkflowTaskAccessForUser>
  >;
  readonly paymentAccess: Awaited<
    ReturnType<typeof resolveBuildCoreRoleAccessForUser>
  >;
  readonly budgetAccess: Awaited<
    ReturnType<typeof resolveBuildCoreRoleAccessForUser>
  >;
};

export async function loadOrganizationPhotoAccessContext(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string
): Promise<OrganizationPhotoAccessContext> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select(
      'id, slug, name, parent_project_id, crm_clients ( company_name ), crm_contacts:primary_contact_id ( full_name )'
    )
    .eq('organization_id', organizationId)
    .is('archived_at', null);
  if (error) throw new Error(error.message);

  const allProjects = (data ?? []) as unknown as OrganizationPhotoProjectRow[];
  const [actorRole, memberScope, workflowAccess, paymentAccess, budgetAccess] =
    await Promise.all([
      loadActiveOrganizationMemberRole(supabase, organizationId, userId),
      resolveBuildCoreMemberProjectVisibilityScope(supabase, organizationId, userId),
      resolveBuildCoreWorkflowTaskAccessForUser(supabase, organizationId, userId),
      resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'payments'),
      resolveBuildCoreRoleAccessForUser(supabase, organizationId, userId, 'budget'),
    ]);
  const actorIsMember = isBuildCoreMemberRole(actorRole);
  const memberVisibility = actorIsMember
    ? await resolveBuildCoreMemberTaskVisibilityInput(supabase, organizationId, userId)
    : null;
  const projects = allProjects.filter(
    (project) => memberScope == null || isProjectAccessibleToMember(project.id, memberScope)
  );

  return {
    projectById: new Map(projects.map((project) => [project.id, project] as const)),
    actorIsMember,
    memberVisibility,
    workflowAccess,
    paymentAccess,
    budgetAccess,
  };
}

export function resolveOrganizationPhotoDocumentAccess(
  context: OrganizationPhotoAccessContext,
  document: {
    readonly project_id: string;
    readonly workflow_task_id: string | null;
    readonly budget_entry_id?: string | null;
  },
  task: OrganizationPhotoTaskRow | null
): { readonly visible: boolean; readonly canDownload: boolean; readonly canDelete: boolean } {
  if (!context.projectById.has(document.project_id)) {
    return { visible: false, canDownload: false, canDelete: false };
  }

  let visible = true;
  let canDownload = true;
  let canDelete = !context.actorIsMember;
  if (document.budget_entry_id != null) {
    visible = context.budgetAccess.canView;
    canDownload = visible && context.budgetAccess.canDownload;
    canDelete = visible && context.budgetAccess.canDelete;
  } else if (document.workflow_task_id != null) {
    if (task == null || task.project_id !== document.project_id) {
      return { visible: false, canDownload: false, canDelete: false };
    }
    const isPayment = isPaymentWorkflowTask({ amountCents: task.amount_cents });
    const access = isPayment ? context.paymentAccess : context.workflowAccess;
    visible = access.canView;
    canDownload = visible && access.canDownload;
    canDelete = visible && access.canDelete;
    if (visible && context.memberVisibility != null) {
      const onlyAssigned = isPayment
        ? context.memberVisibility.onlyAssignedUserCanViewPayments ?? true
        : context.memberVisibility.onlyAssignedUserCanView;
      visible = isBuildCoreMemberAssigneeVisibleToViewer({
        assigneeMemberId: task.assigned_member_id,
        viewerUserId: context.memberVisibility.viewerUserId,
        onlyAssignedUserCanView: onlyAssigned,
        memberRoleUserIds: context.memberVisibility.memberRoleUserIds,
      });
      canDownload = visible && canDownload;
      canDelete = visible && canDelete;
    }
  } else if (context.memberVisibility != null) {
    // Existing member project-detail scoping excludes unattached project media.
    visible = false;
    canDownload = false;
    canDelete = false;
  }
  return { visible, canDownload, canDelete };
}
