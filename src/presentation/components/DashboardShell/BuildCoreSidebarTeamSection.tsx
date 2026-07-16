'use client';

import { useMemo, type ReactElement } from 'react';
import { useZenformedOrganizationWorkspace } from '@zenformed/core/organization-settings';
import { getUserInitials, userCircleColor } from '@zenformed/core/dashboard-shell';
import { buildCoreDashboardNavigation as nav } from '@/platform/navigation/buildCoreDashboardNavigation';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { createDemoOrganizationWorkspaceSnapshot } from '@/infrastructure/demo/demoOrganizationTeamsFixtures';
import { buildBuildCoreTeamsPageModel } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import styles from './BuildCoreCollapsibleSidebar.module.css';

export type BuildCoreSidebarTeamSectionProps = {
  readonly getAccessToken: () => string | null;
  readonly subscriptionActive: boolean;
};

/** Capitalize the first letter of each whitespace-separated word. */
function toTitleCaseName(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function memberDisplayName(name: string): { firstLast: string; initialsSource: string } {
  const trimmed = toTitleCaseName(name) || 'Member';
  return { firstLast: trimmed, initialsSource: trimmed };
}

/**
 * Host-supplied Team section: BuildCore-access members only.
 * Only the member list scrolls after ~5 visible rows.
 * Keep this component mounted across sidebar expand/collapse — do not recreate its element each render.
 */
export function BuildCoreSidebarTeamSection({
  getAccessToken,
  subscriptionActive,
}: BuildCoreSidebarTeamSectionProps): ReactElement {
  const isDemoRuntime = runtimeModes.isDemoRuntime();
  const workspace = useZenformedOrganizationWorkspace({
    apiUrls: {
      membershipContext: nav.apis.organizationMembershipContext,
      members: nav.apis.organizationMembers,
      invites: nav.apis.organizationInvites,
      seats: nav.apis.organizationSeats,
      appAccess: nav.apis.organizationAppAccess,
      memberRole: nav.apis.organizationMemberRole,
    },
    getAccessToken,
    enabled: !isDemoRuntime,
  });

  const demoSnapshot = useMemo(
    () => (isDemoRuntime ? createDemoOrganizationWorkspaceSnapshot() : null),
    [isDemoRuntime]
  );

  const members = useMemo(() => {
    const snapshot = isDemoRuntime ? demoSnapshot : workspace.snapshot;
    const model = buildBuildCoreTeamsPageModel(snapshot, subscriptionActive);
    const currentUserId = snapshot?.membershipContext?.currentUserId?.trim() || null;
    return model.rows.filter((row) => {
      if (row.membershipStatus !== 'active' || row.buildCoreAccessStatus !== 'enabled') {
        return false;
      }
      if (currentUserId && row.userId === currentUserId) {
        return false;
      }
      return true;
    });
  }, [demoSnapshot, isDemoRuntime, subscriptionActive, workspace.snapshot]);

  if (workspace.isLoading && !isDemoRuntime && members.length === 0) {
    return <p className={styles.teamHint}>Loading team…</p>;
  }

  if (members.length === 0) {
    return <p className={styles.teamHint}>No BuildCore team members yet.</p>;
  }

  return (
    <ul className={styles.teamList} aria-label="BuildCore team members">
      {members.map((member) => {
        const { firstLast, initialsSource } = memberDisplayName(member.name);
        const email = member.email ?? member.id;
        return (
          <li key={member.id} className={styles.teamRow} title={firstLast}>
            <span
              className={styles.teamAvatar}
              style={{ backgroundColor: userCircleColor(email) }}
              aria-hidden
            >
              {getUserInitials({ email }, initialsSource)}
            </span>
            <span className={styles.teamMeta}>
              <span className={styles.teamName}>{firstLast}</span>
              <span
                className={styles.teamRolePill}
                data-role={member.organizationRole}
              >
                {member.organizationRoleLabel}
              </span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
