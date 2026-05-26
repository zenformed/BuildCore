import type { SupabaseClient } from '@supabase/supabase-js';
import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { snapshotProjectTemplateBlueprintsFromWorkflowTasks } from '@/domain/crm/projectTemplate';
import { getCrmProjectDetailBySlugForOrg } from './crmReadService';
import {
  mapDbBuildCoreProjectTemplate,
  serializeProjectTemplateBlueprintsForDb,
  type DbBuildCoreProjectTemplateRow,
} from '@/infrastructure/crm/mappers/mapProjectTemplateFromDb';

const TEMPLATE_LIST_SELECT =
  'id, organization_id, name, workflow_tasks_payload, payments_payload, created_by_user_id, created_at, updated_at';

export async function listBuildCoreProjectTemplatesForOrg(
  supabase: SupabaseClient,
  organizationId: string
): Promise<readonly BuildCoreProjectTemplate[]> {
  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .select(TEMPLATE_LIST_SELECT)
    .eq('organization_id', organizationId)
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
  templateName: string
): Promise<BuildCoreProjectTemplate> {
  const project = await getCrmProjectDetailBySlugForOrg(supabase, organizationId, projectSlug);
  if (project == null) {
    throw new Error('project_not_found');
  }

  const blueprints = snapshotProjectTemplateBlueprintsFromWorkflowTasks(project.workflowTasks);
  const serialized = serializeProjectTemplateBlueprintsForDb(blueprints);

  const { data, error } = await supabase
    .from('buildcore_project_templates')
    .insert({
      organization_id: organizationId,
      name: templateName.trim(),
      workflow_tasks_payload: serialized.workflow_tasks_payload,
      payments_payload: serialized.payments_payload,
      created_by_user_id: userId,
    })
    .select(TEMPLATE_LIST_SELECT)
    .single();

  if (error != null) {
    throw new Error(`buildcore_project_templates_create_failed: ${error.message}`);
  }

  return mapDbBuildCoreProjectTemplate(data as DbBuildCoreProjectTemplateRow);
}
