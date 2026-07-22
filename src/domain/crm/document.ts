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

export type CrmDocumentLocationSource = 'device_capture' | 'exif' | 'manual';

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
  /** Optional capture location (WGS84). Null for legacy uploads. */
  readonly latitude: number | null;
  readonly longitude: number | null;
  readonly locationAccuracyMeters: number | null;
  readonly locationSource: CrmDocumentLocationSource | null;
  readonly locationCapturedAt: string | null;
};

/** Defaults for records that do not yet have capture coordinates. */
export const EMPTY_CRM_DOCUMENT_LOCATION = {
  latitude: null,
  longitude: null,
  locationAccuracyMeters: null,
  locationSource: null,
  locationCapturedAt: null,
} as const satisfies Pick<
  CrmDocumentMetadata,
  | 'latitude'
  | 'longitude'
  | 'locationAccuracyMeters'
  | 'locationSource'
  | 'locationCapturedAt'
>;
