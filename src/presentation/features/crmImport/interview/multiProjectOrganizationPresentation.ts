/**
 * Pure helpers for multi-project organization UI (no React).
 */

import type { CrmImportMultiProjectOrganization } from '@/presentation/features/crmImport/interview/interviewState';

/** Any chosen organization option can continue from the organization screen. */
export function isMultiProjectOrganizationSelectable(
  choice: CrmImportMultiProjectOrganization | null
): boolean {
  return choice != null;
}
