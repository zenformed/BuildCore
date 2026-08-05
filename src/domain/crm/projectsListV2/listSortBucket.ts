/**
 * Canonical Projects/Subprojects list sort bucket.
 * Must stay byte-for-byte aligned with SQL:
 *   public.crm_project_list_sort_bucket(subproject_status, completed_at, priority)
 * and migration 00064_crm_projects_list_sort_bucket.sql.
 */

import type { CrmPriority } from '../project';
import type { CrmSubprojectStatus } from '../subprojectStatus';

/** Urgent=0, Normal=1, Completed=2, Inactive=3 */
export type CrmProjectListSortBucket = 0 | 1 | 2 | 3;

export const CRM_PROJECT_LIST_SORT_BUCKET_SQL = `
CASE
  WHEN subproject_status = 'inactive' THEN 3
  WHEN subproject_status = 'completed' OR completed_at IS NOT NULL THEN 2
  WHEN subproject_status = 'urgent' OR priority = 'urgent' THEN 0
  ELSE 1
END
`.trim();

export function computeCrmProjectListSortBucket(input: {
  readonly subprojectStatus: CrmSubprojectStatus | string | null | undefined;
  readonly completedAt: string | null | undefined;
  readonly priority: CrmPriority | string | null | undefined;
}): CrmProjectListSortBucket {
  if (input.subprojectStatus === 'inactive') return 3;
  if (input.subprojectStatus === 'completed' || input.completedAt != null) return 2;
  if (input.subprojectStatus === 'urgent' || input.priority === 'urgent') return 0;
  return 1;
}
