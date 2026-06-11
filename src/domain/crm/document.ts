import type { PipelineStageSlug } from './pipelineStage';
import type { CrmTeamMemberRef } from './teamMember';

export type CrmDocumentKind =
  | 'estimate'
  | 'contract'
  | 'photo'
  | 'video'
  | 'invoice'
  | 'permit'
  | 'inspection_report'
  | 'other';

export type CrmDocumentMetadata = {
  readonly id: string;
  readonly workflowTaskId: string | null;
  readonly budgetEntryId: string | null;
  readonly name: string;
  readonly kind: CrmDocumentKind;
  readonly stageSlug: PipelineStageSlug | null;
  readonly uploadedAt: string;
  readonly uploadedBy: CrmTeamMemberRef;
  readonly reviewedAt: string | null;
  readonly reviewedBy: CrmTeamMemberRef | null;
  readonly mimeType: string;
  readonly sizeBytes: number;
};
