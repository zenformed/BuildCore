/**
 * Canonical Projects/Subprojects list sort bucket.
 * Must stay aligned with SQL public.crm_project_list_sort_bucket during dual-read:
 * lost/cancelled ≡ legacy inactive (3), completed (2), urgent priority (0), else (1).
 */

import type { CrmPriority } from '../project';
import type { CrmProjectStatus } from '../projectStatus';

/** Urgent=0, Normal=1, Completed=2, Lost/Cancelled=3 */
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
  readonly status?: CrmProjectStatus | string | null | undefined;
  /** @deprecated Phase 0 dual-read — prefer status */
  readonly subprojectStatus?: string | null | undefined;
  readonly completedAt: string | null | undefined;
  readonly priority: CrmPriority | string | null | undefined;
}): CrmProjectListSortBucket {
  // New status model
  if (input.status === 'lost' || input.status === 'cancelled') return 3;
  if (input.status === 'completed') return 2;
  if (input.status === 'active') {
    if (input.completedAt != null) return 2;
    return input.priority === 'urgent' ? 0 : 1;
  }

  // Legacy dual-read (SQL parity on subproject_status)
  if (input.subprojectStatus === 'inactive') return 3;
  if (input.subprojectStatus === 'completed' || input.completedAt != null) return 2;
  if (input.subprojectStatus === 'urgent' || input.priority === 'urgent') return 0;
  return 1;
}
