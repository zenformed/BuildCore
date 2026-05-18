/**
 * Default sales/ops pipeline for construction and trades CRM (mock + future UI).
 */
export type PipelineStageSlug =
  | 'new-lead'
  | 'contacted'
  | 'inspection-scheduled'
  | 'inspection-complete'
  | 'estimate-sent'
  | 'waiting-on-approval'
  | 'approved'
  | 'scheduled'
  | 'in-progress'
  | 'completed'
  | 'invoiced'
  | 'paid';

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
  { slug: 'paid', label: 'Paid', sortOrder: 12 },
] as const;

export function getPipelineStage(slug: PipelineStageSlug): PipelineStage {
  const stage = DEFAULT_PIPELINE_STAGES.find((s) => s.slug === slug);
  if (stage == null) {
    throw new Error(`Unknown pipeline stage: ${slug}`);
  }
  return stage;
}

/** Stages strictly before `slug` (excludes the current stage). */
export function completedStagesBefore(slug: PipelineStageSlug): PipelineStageSlug[] {
  const current = getPipelineStage(slug).sortOrder;
  return DEFAULT_PIPELINE_STAGES.filter((s) => s.sortOrder < current).map((s) => s.slug);
}

/** Stages reached when the project is on `slug` (includes the current stage). */
export function completedStagesThrough(slug: PipelineStageSlug): PipelineStageSlug[] {
  const current = getPipelineStage(slug).sortOrder;
  return DEFAULT_PIPELINE_STAGES.filter((s) => s.sortOrder <= current).map((s) => s.slug);
}
