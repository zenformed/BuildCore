import type { CrmProjectSummary } from '@/domain/crm';
import { normalizeUsPostalCode } from './normalizeUsPostalCode';

/** Postal code used for radius filtering (ZIP centroid lookup). */
export function resolveProjectPostalCode(project: CrmProjectSummary): string | null {
  const postalCode = project.address.postalCode?.trim();
  if (!postalCode) {
    return null;
  }
  return normalizeUsPostalCode(postalCode);
}
