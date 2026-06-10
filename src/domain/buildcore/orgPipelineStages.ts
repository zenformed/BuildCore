import {
  DEFAULT_PIPELINE_STAGES,
  type PipelineStage,
} from '@/domain/crm/pipelineStage';
import { PAYMENT_WORKFLOW_STAGE_SLUG } from '@/domain/crm/paymentWorkflow';

export type OrgPipelineStageRecord = {
  readonly id: string;
  readonly organizationId: string;
  readonly slug: string;
  readonly label: string;
  readonly sortOrder: number;
  readonly isActive: boolean;
};

/** Reserved slugs that power payment/completion semantics and cannot be deleted. */
export const BUILDCORE_RESERVED_PIPELINE_STAGE_SLUGS: ReadonlySet<string> = new Set([
  PAYMENT_WORKFLOW_STAGE_SLUG,
]);

export function isReservedPipelineStageSlug(slug: string): boolean {
  return BUILDCORE_RESERVED_PIPELINE_STAGE_SLUGS.has(slug.trim());
}

export function slugifyPipelineStageLabel(label: string): string {
  const slug = label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
  return slug.length > 0 ? slug : 'stage';
}

export function ensureUniquePipelineStageSlug(
  baseSlug: string,
  takenSlugs: ReadonlySet<string>
): string {
  const normalized = slugifyPipelineStageLabel(baseSlug);
  if (!takenSlugs.has(normalized)) return normalized;
  let suffix = 2;
  while (takenSlugs.has(`${normalized}-${suffix}`)) {
    suffix += 1;
  }
  return `${normalized}-${suffix}`;
}

export function orgPipelineStageRecordsToPipelineStages(
  records: readonly OrgPipelineStageRecord[]
): readonly PipelineStage[] {
  return [...records]
    .filter((record) => record.isActive)
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((record) => ({
      slug: record.slug,
      label: record.label,
      sortOrder: record.sortOrder,
    }));
}

export function defaultOrgPipelineStageRecords(organizationId: string): OrgPipelineStageRecord[] {
  return DEFAULT_PIPELINE_STAGES.map((stage, index) => ({
    id: `mock-stage-${stage.slug}`,
    organizationId,
    slug: stage.slug,
    label: stage.label,
    sortOrder: index + 1,
    isActive: true,
  }));
}

export function organizationRoleCanManagePipelineStages(
  role: string | null | undefined
): boolean {
  return role === 'owner' || role === 'admin';
}

export function organizationRoleCanAccessPipelineStagesAdmin(
  role: string | null | undefined
): boolean {
  return role === 'owner' || role === 'admin';
}
