'use client';

import { useCallback, useEffect, useMemo, useState, type ReactElement } from 'react';
import { formatOrganizationRoleLabel, getUserInitials, userCircleColor } from '@zenformed/core/dashboard-shell';
import {
  PRESENCE_EFFECTIVE_STATUS_LABELS,
  ZenformedPresenceAvatarBadge,
  useUserPresence,
  useZenformedPresenceOptional,
} from '@zenformed/core/presence';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import type { ZenformedCoreOrganizationAssignmentIdentitiesResponse } from '@/infrastructure/coreApi/types';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { createDemoOrganizationWorkspaceSnapshot } from '@/infrastructure/demo/demoOrganizationTeamsFixtures';
import { buildBuildCoreTeamsPageModel } from '@/presentation/features/buildCoreTeams/buildCoreTeamsViewModel';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';
import styles from './BuildCoreCollapsibleSidebar.module.css';

export type BuildCoreSidebarTeamSectionProps = {
  readonly getAccessToken: () => string | null;
  readonly subscriptionActive: boolean;
};

type SidebarTeamRow = {
  readonly id: string;
  readonly name: string;
  readonly email: string | null;
  readonly organizationRole: string;
  readonly organizationRoleLabel: string;
};

type AssignmentIdentitiesRelayResponse = ZenformedCoreOrganizationAssignmentIdentitiesResponse & {
  error?: string;
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

async function fetchSidebarTeamRoster(accessToken: string): Promise<readonly SidebarTeamRow[]> {
  const appSlug = buildcoreAppDefinition.appSlug;
  const cacheKey = `sidebar-team-roster:${appSlug}:${accessToken}`;
  return runSessionCached(cacheKey, async () => {
    const res = await fetch(
      `/api/internal/organization/assignment-identities?appSlug=${encodeURIComponent(appSlug)}`,
      {
        headers: {
          Accept: 'application/json',
          Authorization: `Bearer ${accessToken}`,
        },
      }
    );
    const json = (await res.json()) as AssignmentIdentitiesRelayResponse;
    if (!res.ok) {
      throw new Error(json.error ?? 'Failed to load team roster');
    }
    if (!Array.isArray(json.identities)) return [];
    return json.identities.map((identity) => ({
      id: identity.userId,
      name: identity.displayName.trim() || 'Member',
      email: identity.email,
      organizationRole: identity.organizationRole,
      organizationRoleLabel:
        formatOrganizationRoleLabel(identity.organizationRole) ?? identity.organizationRole,
    }));
  });
}

/**
 * Host-supplied Team section — org communications roster (not admin Team Settings).
 * Uses assignment-identities so every BuildCore org member can see teammates.
 * Keep this component mounted across sidebar expand/collapse — do not recreate its element each render.
 */
export function BuildCoreSidebarTeamSection({
  getAccessToken,
  subscriptionActive,
}: BuildCoreSidebarTeamSectionProps): ReactElement {
  const isDemoRuntime = runtimeModes.isDemoRuntime();
  const { user } = useBuildCoreDashboardContext();
  const presence = useZenformedPresenceOptional();
  const currentUserId =
    user?.id?.trim() || presence?.currentUserId?.trim() || null;

  const [liveRows, setLiveRows] = useState<readonly SidebarTeamRow[] | null>(null);
  const [isLoading, setIsLoading] = useState(!isDemoRuntime);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadRoster = useCallback(async (): Promise<void> => {
    if (isDemoRuntime) return;
    const token = getAccessToken()?.trim();
    if (!token) {
      setLiveRows([]);
      setLoadError('Not signed in');
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      setLiveRows(await fetchSidebarTeamRoster(token));
    } catch (err) {
      setLiveRows([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load team roster');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, isDemoRuntime]);

  useEffect(() => {
    return deferNonCriticalWork(() => {
      void loadRoster();
    });
  }, [loadRoster]);

  const demoRows = useMemo(() => {
    if (!isDemoRuntime) return [];
    const snapshot = createDemoOrganizationWorkspaceSnapshot();
    const model = buildBuildCoreTeamsPageModel(snapshot, subscriptionActive);
    const demoCurrentUserId = snapshot.membershipContext?.currentUserId?.trim() || null;
    return model.rows
      .filter((row) => {
        if (row.membershipStatus !== 'active' || row.buildCoreAccessStatus !== 'enabled') {
          return false;
        }
        if (demoCurrentUserId && row.userId === demoCurrentUserId) {
          return false;
        }
        return true;
      })
      .map(
        (row): SidebarTeamRow => ({
          id: row.userId,
          name: row.name,
          email: row.email,
          organizationRole: row.organizationRole,
          organizationRoleLabel: row.organizationRoleLabel,
        })
      );
  }, [isDemoRuntime, subscriptionActive]);

  const members = useMemo(() => {
    const rows = isDemoRuntime ? demoRows : (liveRows ?? []);
    if (!currentUserId) return rows;
    return rows.filter((row) => row.id !== currentUserId);
  }, [currentUserId, demoRows, isDemoRuntime, liveRows]);

  if (!isDemoRuntime && isLoading && members.length === 0) {
    return <p className={styles.teamHint}>Loading team…</p>;
  }

  if (!isDemoRuntime && loadError && members.length === 0) {
    return <p className={styles.teamHint}>Unable to load team.</p>;
  }

  if (members.length === 0) {
    return <p className={styles.teamHint}>No BuildCore team members yet.</p>;
  }

  return (
    <ul className={styles.teamList} aria-label="BuildCore team members">
      {members.map((member) => (
        <BuildCoreSidebarTeamMemberRow key={member.id} member={member} />
      ))}
    </ul>
  );
}

function BuildCoreSidebarTeamMemberRow({
  member,
}: {
  readonly member: SidebarTeamRow;
}): ReactElement {
  const { firstLast, initialsSource } = memberDisplayName(member.name);
  const email = member.email ?? member.id;
  const status = useUserPresence(member.id);
  const statusLabel = PRESENCE_EFFECTIVE_STATUS_LABELS[status];

  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;
    console.info('[zenformed-presence] Team row indicator', {
      memberId: member.id,
      status,
      statusLabel,
    });
  }, [member.id, status, statusLabel]);

  return (
    <li className={styles.teamRow} title={`${firstLast} · ${statusLabel}`}>
      <ZenformedPresenceAvatarBadge status={status} announceDot={false}>
        <span
          className={styles.teamAvatar}
          style={{ backgroundColor: userCircleColor(email) }}
          aria-hidden
        >
          {getUserInitials({ email }, initialsSource)}
        </span>
      </ZenformedPresenceAvatarBadge>
      <span className={styles.teamMeta}>
        <span className={styles.teamName}>{firstLast}</span>
        <span className={styles.teamMetaRow}>
          {member.email ? (
            <span className={styles.teamEmail} title={member.email}>
              {member.email}
            </span>
          ) : (
            <span className={styles.teamEmailSpacer} aria-hidden />
          )}
          <span className={styles.teamRolePill} data-role={member.organizationRole}>
            {member.organizationRoleLabel}
          </span>
        </span>
        <span className={styles.teamPresenceSrOnly}>{statusLabel}</span>
      </span>
    </li>
  );
}
