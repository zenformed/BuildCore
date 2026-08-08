/**
 * BuildCore image derivative contracts (Phase 1).
 * Generation runs in ZenformedCore; BuildCore consumes durable keys + status.
 */

export const CRM_IMAGE_DERIVATIVE_VERSION = 1;
export const CRM_IMAGE_THUMBNAIL_MAX_PX = 320;
export const CRM_IMAGE_PREVIEW_MAX_PX = 1600;

export type CrmImageDerivativeStatus = 'pending' | 'ready' | 'failed' | 'skipped';

export type CrmDocumentImageDerivativeFields = {
  readonly imageWidth: number | null;
  readonly imageHeight: number | null;
  readonly thumbnailStorageKey: string | null;
  readonly previewStorageKey: string | null;
  readonly derivativeStatus: CrmImageDerivativeStatus | null;
  readonly derivativeError: string | null;
  readonly derivativeVersion: number;
};

export const EMPTY_CRM_DOCUMENT_IMAGE_DERIVATIVES = {
  imageWidth: null,
  imageHeight: null,
  thumbnailStorageKey: null,
  previewStorageKey: null,
  derivativeStatus: null,
  derivativeError: null,
  derivativeVersion: 0,
} as const satisfies CrmDocumentImageDerivativeFields;

export const CRM_DOCUMENT_IMAGE_DERIVATIVE_COLUMNS =
  'image_width, image_height, thumbnail_storage_key, preview_storage_key, derivative_status, derivative_error, derivative_version, derivatives_updated_at';

export function parseCrmImageDerivativeStatus(
  value: string | null | undefined
): CrmImageDerivativeStatus | null {
  if (
    value === 'pending' ||
    value === 'ready' ||
    value === 'failed' ||
    value === 'skipped'
  ) {
    return value;
  }
  return null;
}
