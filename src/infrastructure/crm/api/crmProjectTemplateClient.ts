import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { crmApiDeleteJson, crmApiGetJson, crmApiPostJson } from './crmApiClient';

export type ListBuildCoreProjectTemplatesResponse = {
  readonly templates: readonly BuildCoreProjectTemplate[];
};

export type CreateBuildCoreProjectTemplateResponse = {
  readonly template: BuildCoreProjectTemplate;
};

export async function listBuildCoreProjectTemplates(): Promise<
  readonly BuildCoreProjectTemplate[]
> {
  const body = await crmApiGetJson<ListBuildCoreProjectTemplatesResponse>(
    '/api/crm/project-templates'
  );
  return body.templates;
}

export async function createBuildCoreProjectTemplate(input: {
  readonly name: string;
  readonly projectSlug: string;
}): Promise<BuildCoreProjectTemplate> {
  const body = await crmApiPostJson<CreateBuildCoreProjectTemplateResponse>(
    '/api/crm/project-templates',
    input
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
