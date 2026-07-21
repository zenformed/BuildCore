import type { CrmIndustry, CrmPriority, CrmProjectSummary } from './project';
import type { PipelineStageSlug } from './pipelineStage';
import type { BuildCoreProjectTemplateBlueprints } from './projectTemplate';

/** Input for creating a CRM project + linked client/contact. */
export type CreateCrmProjectInput = {
  readonly name: string;
  readonly industry: CrmIndustry;
  readonly customIndustry: string | null;
  readonly contactName: string;
  readonly emails: readonly string[];
  readonly phones: readonly string[];
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
  readonly latitude: number | null;
  readonly longitude: number | null;
  /** Applied after project insert when creating from a template-backed draft. */
  readonly initialTemplateBlueprints?: BuildCoreProjectTemplateBlueprints | null;
  /** When set, creates a subproject under the given parent project id. */
  readonly parentProjectId?: string | null;
  /** Custom field values keyed by field_key; null clears a value. */
  readonly customFieldValues?: Readonly<Record<string, string | null>>;
};

export type CreateCrmProjectResult = {
  readonly id: string;
  readonly slug: string;
  readonly summary: CrmProjectSummary;
};
