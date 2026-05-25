'use client';

import type { CrmTeamMemberRef } from '@/domain/crm';
import { resolveAssignmentTeamMemberRef } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { useAssignmentIdentityCatalog } from '@/presentation/providers/AssignmentIdentityProvider';

export function useResolvedTeamMemberRef(ref: CrmTeamMemberRef | null): CrmTeamMemberRef | null {
  const catalog = useAssignmentIdentityCatalog();
  return resolveAssignmentTeamMemberRef(ref, catalog);
}
