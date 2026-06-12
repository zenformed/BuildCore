/**
 * Organization-configurable sales/ops pipeline for construction and trades CRM.
 * `DEFAULT_PIPELINE_STAGES` remains the mock/offline fallback catalog.
 */
export type PipelineStageSlug = string;

export type PipelineStage = {
  readonly slug: PipelineStageSlug;
  readonly label: string;
  /** 1-based order for progress UI */
  readonly sortOrder: number;
};

export const DEFAULT_PIPELINE_STAGES: readonly PipelineStage[] = [
  { slug: 'new-lead', label: 'New Lead', sortOrder: 1 },
  { slug: 'contacted', label: 'Contacted', sortOrder: 2 },
  { slug: 'inspection-scheduled', label: 'Inspection Scheduled', sortOrder: 3 },
  { slug: 'inspection-complete', label: 'Inspection Complete', sortOrder: 4 },
  { slug: 'estimate-sent', label: 'Estimate Sent', sortOrder: 5 },
  { slug: 'waiting-on-approval', label: 'Waiting on Approval', sortOrder: 6 },
  { slug: 'approved', label: 'Approved', sortOrder: 7 },
  { slug: 'scheduled', label: 'Scheduled', sortOrder: 8 },
  { slug: 'in-progress', label: 'In Progress', sortOrder: 9 },
  { slug: 'completed', label: 'Completed', sortOrder: 10 },
  { slug: 'invoiced', label: 'Invoiced', sortOrder: 11 },
  { slug: 'complete', label: 'Complete', sortOrder: 12 },
] as const;

export function resolvePipelineStageCatalog(
  stages?: readonly PipelineStage[] | null
): readonly PipelineStage[] {
  return stages != null && stages.length > 0 ? stages : DEFAULT_PIPELINE_STAGES;
}

export function findPipelineStage(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): PipelineStage | null {
  const catalog = resolvePipelineStageCatalog(stages);
  return catalog.find((stage) => stage.slug === slug) ?? null;
}

export function getPipelineStage(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): PipelineStage {
  const stage = findPipelineStage(slug, stages);
  if (stage != null) return stage;
  return {
    slug,
    label: slug
      .split('-')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' '),
    sortOrder: Number.MAX_SAFE_INTEGER,
  };
}

export function getFirstPipelineStageSlug(
  stages?: readonly PipelineStage[] | null
): PipelineStageSlug {
  const catalog = resolvePipelineStageCatalog(stages);
  const sorted = [...catalog].sort((a, b) => a.sortOrder - b.sortOrder);
  return sorted[0]?.slug ?? DEFAULT_PIPELINE_STAGES[0].slug;
}

/** Stages strictly before `slug` (excludes the current stage). */
export function completedStagesBefore(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): PipelineStageSlug[] {
  const current = getPipelineStage(slug, stages).sortOrder;
  return resolvePipelineStageCatalog(stages)
    .filter((stage) => stage.sortOrder < current)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => stage.slug);
}

/** Stages reached when the project is on `slug` (includes the current stage). */
export function completedStagesThrough(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): PipelineStageSlug[] {
  const current = getPipelineStage(slug, stages).sortOrder;
  return resolvePipelineStageCatalog(stages)
    .filter((stage) => stage.sortOrder <= current)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((stage) => stage.slug);
}

export function isKnownPipelineStageSlug(
  slug: PipelineStageSlug,
  stages?: readonly PipelineStage[] | null
): boolean {
  return findPipelineStage(slug, stages) != null;
}

export function pipelineStageSlugSet(
  stages?: readonly PipelineStage[] | null
): ReadonlySet<string> {
  return new Set(resolvePipelineStageCatalog(stages).map((stage) => stage.slug));
}

export type ScopedPipelineStageCatalogs = {
  readonly project: readonly PipelineStage[];
  readonly subproject: readonly PipelineStage[];
};

export type OrganizationExportStageLabels = {
  readonly project: ReadonlyMap<string, string>;
  readonly subproject: ReadonlyMap<string, string>;
};

/** Resolve the workflow catalog for a parent project or subproject row. */
export function pipelineStageCatalogForProjectSummary(
  summary: { readonly parentProjectId: string | null },
  catalogs: ScopedPipelineStageCatalogs
): readonly PipelineStage[] {
  return summary.parentProjectId != null ? catalogs.subproject : catalogs.project;
}

export function pipelineStageLabelForProjectSummary(
  summary: {
    readonly parentProjectId: string | null;
    readonly currentStageSlug: PipelineStageSlug;
  },
  stageLabels: OrganizationExportStageLabels
): string {
  const labelMap =
    summary.parentProjectId != null ? stageLabels.subproject : stageLabels.project;
  return labelMap.get(summary.currentStageSlug) ?? summary.currentStageSlug;
}

export function organizationExportStageLabelsFromCatalogs(
  catalogs: ScopedPipelineStageCatalogs
): OrganizationExportStageLabels {
  return {
    project: new Map(catalogs.project.map((stage) => [stage.slug, stage.label])),
    subproject: new Map(catalogs.subproject.map((stage) => [stage.slug, stage.label])),
  };
}
