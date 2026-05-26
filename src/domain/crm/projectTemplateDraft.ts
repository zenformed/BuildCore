import type {
  BuildCoreProjectTemplate,
  BuildCoreProjectTemplateBlueprints,
} from './projectTemplate';

/** Blueprints held on a new-project draft until the user confirms create. */
export type CreateProjectTemplateDraft = BuildCoreProjectTemplateBlueprints;

export function emptyCreateProjectTemplateDraft(): CreateProjectTemplateDraft {
  return { workflowTasksPayload: [], paymentsPayload: [] };
}

export function createProjectTemplateDraftFromTemplate(
  template: Pick<BuildCoreProjectTemplate, 'workflowTasksPayload' | 'paymentsPayload'>
): CreateProjectTemplateDraft {
  return {
    workflowTasksPayload: [...template.workflowTasksPayload],
    paymentsPayload: [...template.paymentsPayload],
  };
}

export function hasCreateProjectTemplateDraftContent(draft: CreateProjectTemplateDraft | null): boolean {
  if (draft == null) return false;
  return draft.workflowTasksPayload.length > 0 || draft.paymentsPayload.length > 0;
}

export function createProjectTemplateDraftSummary(draft: CreateProjectTemplateDraft | null): {
  readonly workflowCount: number;
  readonly paymentCount: number;
} {
  return {
    workflowCount: draft?.workflowTasksPayload.length ?? 0,
    paymentCount: draft?.paymentsPayload.length ?? 0,
  };
}
