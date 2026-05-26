import type { BuildCoreProjectTemplate } from '@/domain/crm/projectTemplate';
import { crmApiGetJson, crmApiPostJson } from './crmApiClient';

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
