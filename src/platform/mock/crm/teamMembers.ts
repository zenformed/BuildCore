import type { CrmTeamMemberRef } from '@/domain/crm';

export const MOCK_CRM_TEAM_MEMBERS: readonly CrmTeamMemberRef[] = [
  {
    id: 'tm-alex',
    displayName: 'Alex Rivera',
    initials: 'AR',
    avatarUrl: null,
    email: 'alex.rivera@zenformed.test',
  },
  {
    id: 'tm-jordan',
    displayName: 'Jordan Kim',
    initials: 'JK',
    avatarUrl: null,
    email: 'jordan.kim@zenformed.test',
  },
  {
    id: 'tm-sam',
    displayName: 'Sam Patel',
    initials: 'SP',
    avatarUrl: null,
    email: 'sam.patel@zenformed.test',
  },
  {
    id: 'tm-casey',
    displayName: 'Casey Morgan',
    initials: 'CM',
    avatarUrl: null,
    email: 'casey.morgan@zenformed.test',
  },
  {
    id: 'tm-riley',
    displayName: 'Riley Brooks',
    initials: 'RB',
    avatarUrl: null,
    email: 'riley.brooks@zenformed.test',
  },
] as const;

/** Canonical demo / mock CRM team member (Alex Rivera). */
export const MOCK_CRM_DEMO_TEAM_MEMBER_ID = 'tm-alex';

const MOCK_TEAM_MEMBER_ID_ALIASES: Readonly<Record<string, string>> = {
  'demo-user-alex': MOCK_CRM_DEMO_TEAM_MEMBER_ID,
  'mock-user': MOCK_CRM_DEMO_TEAM_MEMBER_ID,
};

export function resolveMockCrmTeamMemberId(id: string): string {
  return MOCK_TEAM_MEMBER_ID_ALIASES[id] ?? id;
}

export function resolveMockCrmTeamMember(id: string | null | undefined): CrmTeamMemberRef | null {
  const trimmed = id?.trim();
  if (!trimmed) return null;
  const canonicalId = resolveMockCrmTeamMemberId(trimmed);
  return MOCK_CRM_TEAM_MEMBERS.find((member) => member.id === canonicalId) ?? null;
}

export function getMockCrmTeamMember(id: string): CrmTeamMemberRef {
  const member = resolveMockCrmTeamMember(id);
  if (member == null) {
    throw new Error(`Unknown mock team member: ${id}`);
  }
  return member;
}
