import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import type { BuildCoreProjectTemplateScope } from '@/domain/crm/projectTemplateScope';
import { crmApiDeleteJson, crmApiGetJson, crmApiPatchJson, crmApiPostJson } from './crmApiClient';

export type ListBuildCoreProjectTemplatesResponse = {
  readonly templates: readonly BuildCoreProjectTemplate[];
};

export type CreateBuildCoreProjectTemplateResponse = {
  readonly template: BuildCoreProjectTemplate;
};

export async function listBuildCoreProjectTemplates(options?: {
  readonly templateScope?: BuildCoreProjectTemplateScope;
}): Promise<readonly BuildCoreProjectTemplate[]> {
  const query =
    options?.templateScope != null
      ? `?scope=${encodeURIComponent(options.templateScope)}`
      : '';
  const body = await crmApiGetJson<ListBuildCoreProjectTemplatesResponse>(
    `/api/crm/project-templates${query}`
  );
  return body.templates;
}

export async function createBuildCoreProjectTemplate(input: {
  readonly name: string;
  readonly projectSlug: string;
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly setAsDefault?: boolean;
}): Promise<BuildCoreProjectTemplate> {
  const body = await crmApiPostJson<CreateBuildCoreProjectTemplateResponse>(
    '/api/crm/project-templates',
    input
  );
  return body.template;
}

export type SetBuildCoreProjectTemplateDefaultResponse = {
  readonly template: BuildCoreProjectTemplate;
};

export async function setBuildCoreProjectTemplateDefault(
  templateId: string,
  isDefault: boolean
): Promise<BuildCoreProjectTemplate> {
  const body = await crmApiPatchJson<SetBuildCoreProjectTemplateDefaultResponse>(
    `/api/crm/project-templates/${encodeURIComponent(templateId)}/default`,
    { isDefault }
  );
  return body.template;
}

export type ApplyBuildCoreProjectTemplateResponse = {
  readonly workflowTasksCreated: number;
  readonly paymentsCreated: number;
};

export async function applyBuildCoreProjectTemplate(input: {
  readonly templateId: string;
  readonly projectSlug: string;
}): Promise<ApplyBuildCoreProjectTemplateResponse> {
  return crmApiPostJson<ApplyBuildCoreProjectTemplateResponse>(
    `/api/crm/project-templates/${encodeURIComponent(input.templateId)}/apply`,
    { projectSlug: input.projectSlug }
  );
}

export async function deleteBuildCoreProjectTemplate(templateId: string): Promise<void> {
  await crmApiDeleteJson<{ ok: true }>(
    `/api/crm/project-templates/${encodeURIComponent(templateId)}`
  );
}
