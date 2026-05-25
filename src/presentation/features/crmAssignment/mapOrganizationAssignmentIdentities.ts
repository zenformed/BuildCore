import type { CrmTeamMemberRef } from '@/domain/crm';
import type { ZenformedCoreOrganizationAssignmentIdentity } from '@/infrastructure/coreApi/types';
import { buildAuthUserAvatarUrl } from '@/infrastructure/userAvatar/authUserAvatarUrl';
import { teamMemberRefFromOrgMember } from './assignmentIdentityModel';

export function mapOrganizationAssignmentIdentityToTeamMemberRef(
  identity: ZenformedCoreOrganizationAssignmentIdentity
): CrmTeamMemberRef {
  return teamMemberRefFromOrgMember({
    userId: identity.userId,
    displayName: identity.displayName,
    email: identity.email,
    firstName: identity.firstName,
    lastName: identity.lastName,
    avatarUrl: buildAuthUserAvatarUrl(identity.userId, identity.avatarRevision),
  });
}

export function mapOrganizationAssignmentIdentitiesToTeamMemberRefs(
  identities: readonly ZenformedCoreOrganizationAssignmentIdentity[]
): readonly CrmTeamMemberRef[] {
  return identities.map(mapOrganizationAssignmentIdentityToTeamMemberRef);
}
