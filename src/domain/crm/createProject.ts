import type { CrmIndustry, CrmPriority } from './project';
import type { PipelineStageSlug } from './pipelineStage';
import type { BuildCoreProjectTemplateBlueprints } from './projectTemplate';

/** Input for creating a CRM project + linked client/contact. */
export type CreateCrmProjectInput = {
  readonly name: string;
  readonly industry: CrmIndustry;
  readonly customIndustry: string | null;
  readonly contactName: string;
  readonly email: string;
  readonly phone: string;
  readonly priority: CrmPriority;
  readonly currentStageSlug: PipelineStageSlug;
  readonly notes: string | null;
  readonly dealValueCents: number;
  readonly balanceRemainingCents: number;
  readonly assignedMemberId: string | null;
  readonly addressLine1: string | null;
  readonly addressLine2: string | null;
  readonly city: string | null;
  readonly state: string | null;
  readonly postalCode: string | null;
  /** Applied after project insert when creating from a template-backed draft. */
  readonly initialTemplateBlueprints?: BuildCoreProjectTemplateBlueprints | null;
  /** When set, creates a subproject under the given parent project id. */
  readonly parentProjectId?: string | null;
};

export type CreateCrmProjectResult = {
  readonly id: string;
  readonly slug: string;
};
