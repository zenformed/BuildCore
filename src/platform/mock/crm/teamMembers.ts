import type { CrmTeamMemberRef } from '@/domain/crm';

export const MOCK_CRM_TEAM_MEMBERS: readonly CrmTeamMemberRef[] = [
  {
    id: 'tm-alex',
    displayName: 'Alex Rivera',
    initials: 'AR',
    avatarUrl: null,
  },
  {
    id: 'tm-jordan',
    displayName: 'Jordan Kim',
    initials: 'JK',
    avatarUrl: null,
  },
  {
    id: 'tm-sam',
    displayName: 'Sam Patel',
    initials: 'SP',
    avatarUrl: null,
  },
  {
    id: 'tm-casey',
    displayName: 'Casey Morgan',
    initials: 'CM',
    avatarUrl: null,
  },
  {
    id: 'tm-riley',
    displayName: 'Riley Brooks',
    initials: 'RB',
    avatarUrl: null,
  },
] as const;

export function getMockCrmTeamMember(id: string): CrmTeamMemberRef {
  const member = MOCK_CRM_TEAM_MEMBERS.find((m) => m.id === id);
  if (member == null) {
    throw new Error(`Unknown mock team member: ${id}`);
  }
  return member;
}
