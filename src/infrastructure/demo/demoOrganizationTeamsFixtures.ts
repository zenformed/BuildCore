import type { OrganizationWorkspaceSnapshot } from '@zenformed/core/organization-settings';
import type { OrganizationMemberRole } from '@zenformed/core/organization-settings';
import { resolveOrganizationPermissionsFromRole } from '@zenformed/core/organization-settings';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { BUILD_CORE_APP_SLUG } from '@/infrastructure/entitlements/buildCoreZenformedAppContext';
import { MOCK_CRM_TEAM_MEMBERS } from '@/platform/mock/crm/teamMembers';
import {
  DEMO_ORGANIZATION_ID,
  DEMO_USER_ID,
  createDemoOrganizationMembershipContext,
} from '@/infrastructure/demo/demoProfileFixtures';

const DEMO_NOW = '2026-01-01T00:00:00.000Z';

const ORGANIZATION_ROLES: Record<string, OrganizationMemberRole> = {
  'tm-alex': 'owner',
  'tm-jordan': 'admin',
  'tm-sam': 'coordinator',
  'tm-casey': 'member',
  'tm-riley': 'member',
};

const BUILDCORE_APP_ROLES: Record<string, string> = {
  'tm-alex': 'admin',
  'tm-jordan': 'admin',
  'tm-sam': 'coordinator',
  'tm-casey': 'member',
};

function splitDisplayName(displayName: string): { firstName: string; lastName: string | null } {
  const parts = displayName.trim().split(/\s+/);
  if (parts.length === 0) return { firstName: 'Member', lastName: null };
  if (parts.length === 1) return { firstName: parts[0] ?? 'Member', lastName: null };
  return {
    firstName: parts[0] ?? 'Member',
    lastName: parts.slice(1).join(' '),
  };
}

export function createDemoOrganizationWorkspaceSnapshot(): OrganizationWorkspaceSnapshot {
  const membership = createDemoOrganizationMembershipContext();

  const members = MOCK_CRM_TEAM_MEMBERS.map((member) => {
    const { firstName, lastName } = splitDisplayName(member.displayName);
    return {
      id: `org-member-${member.id}`,
      userId: member.id,
      displayName: member.displayName,
      firstName,
      lastName,
      email: member.email,
      role: ORGANIZATION_ROLES[member.id] ?? 'member',
      status: 'active' as const,
    };
  });

  const appAccessEntries = MOCK_CRM_TEAM_MEMBERS.filter(
    (member) => BUILDCORE_APP_ROLES[member.id] != null
  ).map((member) => ({
    userId: member.id,
    displayName: member.displayName,
    email: member.email,
    appSlug: BUILD_CORE_APP_SLUG,
    appName: buildcoreAppDefinition.displayName,
    accessStatus: 'active',
    role: BUILDCORE_APP_ROLES[member.id] ?? 'member',
    planLabel: 'Pro',
  }));

  return {
    membershipContext: {
      hasActiveMembership: membership.hasActiveMembership,
      hasNonPersonalOrganizationMembership: membership.hasNonPersonalOrganizationMembership,
      membershipKind: membership.membershipKind,
      organizationId: DEMO_ORGANIZATION_ID,
      currentUserId: DEMO_USER_ID,
      role: membership.role,
      permissions: resolveOrganizationPermissionsFromRole(membership.role),
    },
    members,
    invites: [
      {
        id: 'demo-invite-taylor',
        email: 'taylor.nguyen@zenformed.test',
        firstName: 'Taylor',
        lastName: 'Nguyen',
        displayName: 'Taylor Nguyen',
        status: 'pending',
        role: 'member',
        invitedBy: DEMO_USER_ID,
        expiresAt: '2026-04-01T00:00:00.000Z',
        createdAt: DEMO_NOW,
        sentLabel: 'Sent 3 days ago',
        emailDeliveryStatus: 'sent',
      },
    ],
    seats: {
      organizationId: DEMO_ORGANIZATION_ID,
      seatsUsed: 4,
      seatLimit: 10,
      seatsAvailable: 6,
      source: 'demo',
      notes: null,
      planName: 'Pro',
      appBreakdown: [
        {
          appSlug: BUILD_CORE_APP_SLUG,
          appName: buildcoreAppDefinition.displayName,
          planCode: 'pro',
          entitlementStatus: 'active',
        },
      ],
    },
    appAccess: {
      organizationId: DEMO_ORGANIZATION_ID,
      entries: appAccessEntries,
      orgApps: [
        {
          appSlug: BUILD_CORE_APP_SLUG,
          appName: buildcoreAppDefinition.displayName,
          planLabel: 'Pro',
          statusLabel: 'Active',
          isActive: true,
        },
      ],
    },
    appEntitlements: {
      entitlements: {},
    },
  };
}
