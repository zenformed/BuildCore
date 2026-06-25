import type { LeadCaptureContactRow } from '@/infrastructure/lead/leadCaptureContactMerge';

export type LeadCaptureContactLookupRow = LeadCaptureContactRow & {
  readonly updated_at: string;
  readonly created_at: string;
};

/**
 * Duplicate org contacts may share the same email (no unique constraint on email).
 * Lead capture reuses the most recently updated row; ties break on newest created_at.
 */
export function pickLeadCaptureContactFromRows(
  rows: readonly LeadCaptureContactLookupRow[]
): LeadCaptureContactRow | null {
  if (rows.length === 0) return null;

  const [best] = [...rows].sort((a, b) => {
    const byUpdated = b.updated_at.localeCompare(a.updated_at);
    if (byUpdated !== 0) return byUpdated;
    return b.created_at.localeCompare(a.created_at);
  });

  if (best == null) return null;

  return {
    id: best.id,
    full_name: best.full_name,
    email: best.email,
    phone: best.phone,
    client_id: best.client_id,
  };
}
