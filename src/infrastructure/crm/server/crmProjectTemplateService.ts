import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  BuildCoreProjectTemplate,
  BuildCoreProjectTemplateBlueprints,
} from '@/domain/crm/projectTemplate';
import { snapshotProjectTemplateBlueprintsFromWorkflowTasks } from '@/domain/crm/projectTemplate';
import { buildWorkflowTaskInputsFromBlueprints } from '@/domain/crm/applyProjectTemplate';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import { createCrmWorkflowTaskForOrg } from './crmWorkflowTaskService';
import { resolveCrmProjectIdBySlug } from './resolveCrmProjectIdBySlug';
import {
  mapDbBuildCoreProjectTemplate,
  serializeProjectTemplateBlueprintsForDb,
  type DbBuildCoreProjectTemplateRow,
} from '@/infrastructure/crm/mappers/mapProjectTemplateFromDb';

const TEMPLATE_LIST_SELECT =
  'id, organization_id, name, workflow_tasks_payload, payments_payload, is_default, created_by_user_id, created_at, updated_at';

async function clearOrgDefaultTemplates(
  supabase: SupabaseClient,
  organizationId: string,
  exceptTemplateId?: string
): Promise<void> {
  let query = supabase
    .from('buildcore_project_templates')
    .update({ is_default: false })
    .eq('organization_id', organizationId)
    .eq('is_default', true);

  if (exceptTemplateId != null) {
    query = query.neq('id', exceptTemplateId);
  }

  const { error } = await query;
  if (error != null) {
    throw new Error(`buildcore_project_templates_clear_default_failed: ${error.message}`);
  }
}

export async function listBuildCoreProjectTemplatesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly BuildCoreProjectTemplate[]> {
  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .select(TEMPLATE_LIST_SELECT)
    .eq('organization_id', organizationId)
    .order('is_default', { ascending: false })
    .order('created_at', { ascending: false });

  if (error != null) {
    throw new Error(`buildcore_project_templates_list_failed: ${error.message}`);
  }

  return (data ?? []).map((row) =>
    mapDbBuildCoreProjectTemplate(row as DbBuildCoreProjectTemplateRow)
  );
}

export async function createBuildCoreProjectTemplateFromProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectSlug: string,
  templateName: string,
  setAsDefault = false
): Promise<BuildCoreProjectTemplate> {
  const project = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, projectSlug);
  if (project == null) {
    throw new Error('project_not_found');
  }

  const blueprints = snapshotProjectTemplateBlueprintsFromWorkflowTasks(project.workflowTasks);
  const serialized = serializeProjectTemplateBlueprintsForDb(blueprints);

  if (setAsDefault) {
    await clearOrgDefaultTemplates(supabase, organizationId);
  }

  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .insert({
      organization_id: organizationId,
      name: templateName.trim(),
      workflow_tasks_payload: serialized.workflow_tasks_payload,
      payments_payload: serialized.payments_payload,
      created_by_user_id: userId,
      is_default: setAsDefault,
    })
    .select(TEMPLATE_LIST_SELECT)
    .single();

  if (error != null) {
    throw new Error(`buildcore_project_templates_create_failed: ${error.message}`);
  }

  return mapDbBuildCoreProjectTemplate(data as DbBuildCoreProjectTemplateRow);
}

export async function getBuildCoreProjectTemplateByIdForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string
): Promise<BuildCoreProjectTemplate | null> {
  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .select(TEMPLATE_LIST_SELECT)
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (error != null) {
    throw new Error(`buildcore_project_templates_read_failed: ${error.message}`);
  }
  if (data == null) return null;
  return mapDbBuildCoreProjectTemplate(data as DbBuildCoreProjectTemplateRow);
}

export async function deleteBuildCoreProjectTemplateForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .delete()
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .select('id')
    .maybeSingle();

  if (error != null) {
    throw new Error(`buildcore_project_templates_delete_failed: ${error.message}`);
  }
  return data != null;
}

export async function setBuildCoreProjectTemplateDefaultForOrg(
  supabase: SupabaseClient,
  organizationId: string,
  templateId: string,
  isDefault: boolean
): Promise<BuildCoreProjectTemplate> {
  const existing = await getBuildCoreProjectTemplateByIdForOrg(
    supabase,
    organizationId,
    templateId
  );
  if (existing == null) {
    throw new Error('template_not_found');
  }

  if (isDefault) {
    await clearOrgDefaultTemplates(supabase, organizationId, templateId);
  }

  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .update({ is_default: isDefault })
    .eq('id', templateId)
    .eq('organization_id', organizationId)
    .select(TEMPLATE_LIST_SELECT)
    .single();

  if (error != null) {
    throw new Error(`buildcore_project_templates_set_default_failed: ${error.message}`);
  }

  return mapDbBuildCoreProjectTemplate(data as DbBuildCoreProjectTemplateRow);
}

export type ApplyBuildCoreProjectTemplateResult = {
  readonly workflowTasksCreated: number;
  readonly paymentsCreated: number;
};

export async function applyProjectTemplateBlueprintsToProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  projectId: string,
  projectSlug: string,
  blueprints: BuildCoreProjectTemplateBlueprints
): Promise<ApplyBuildCoreProjectTemplateResult> {
  const { workflowTaskInputs, paymentInputs } = buildWorkflowTaskInputsFromBlueprints(
    blueprints,
    projectId,
    projectSlug
  );

  for (const input of workflowTaskInputs) {
    await createCrmWorkflowTaskForOrg(supabase, organizationId, userId, input);
  }
  for (const input of paymentInputs) {
    await createCrmWorkflowTaskForOrg(supabase, organizationId, userId, input);
  }

  return {
    workflowTasksCreated: workflowTaskInputs.length,
    paymentsCreated: paymentInputs.length,
  };
}

export async function applyBuildCoreProjectTemplateToProject(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  templateId: string,
  projectSlug: string
): Promise<ApplyBuildCoreProjectTemplateResult> {
  const template = await getBuildCoreProjectTemplateByIdForOrg(
    supabase,
    organizationId,
    templateId
  );
  if (template == null) {
    throw new Error('template_not_found');
  }

  const projectId = await resolveCrmProjectIdBySlug(supabase, organizationId, projectSlug);
  if (projectId == null) {
    throw new Error('project_not_found');
  }

  return applyProjectTemplateBlueprintsToProject(
    supabase,
    organizationId,
    userId,
    projectId,
    projectSlug,
    template
  );
}
