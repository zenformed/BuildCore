export type BuildCoreProjectTemplateScope = 'project' | 'subproject';

const TEMPLATE_SCOPES: readonly BuildCoreProjectTemplateScope[] = ['project', 'subproject'];

export function isBuildCoreProjectTemplateScope(
  value: string
): value is BuildCoreProjectTemplateScope {
  return (TEMPLATE_SCOPES as readonly string[]).includes(value);
}

/** Resolve template scope from a CRM project row/summary. */
export function resolveProjectTemplateScopeForProject(input: {
  readonly parentProjectId: string | null;
}): BuildCoreProjectTemplateScope {
  return input.parentProjectId != null ? 'subproject' : 'project';
}

export function templateScopeMatchesProject(input: {
  readonly templateScope: BuildCoreProjectTemplateScope;
  readonly parentProjectId: string | null;
}): boolean {
  return (
    resolveProjectTemplateScopeForProject({ parentProjectId: input.parentProjectId }) ===
    input.templateScope
  );
}
