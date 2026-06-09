'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import type { CrmTeamMemberRef } from '@/domain/crm';
import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';
import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';
import { runSessionCached } from '@/infrastructure/coreApi/clientRequestDedupe';
import type { ZenformedCoreOrganizationAssignmentIdentitiesResponse } from '@/infrastructure/coreApi/types';
import {
  buildAssignmentIdentityCatalogFromMembers,
  mergeAssignmentIdentityCatalog,
  teamMemberRefFromSignedInUser,
} from '@/presentation/features/crmAssignment/buildAssignmentIdentityCatalogFromMembers';
import { mapOrganizationAssignmentIdentitiesToTeamMemberRefs } from '@/presentation/features/crmAssignment/mapOrganizationAssignmentIdentities';
import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';
import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';
import { deferNonCriticalWork } from '@/presentation/utils/deferNonCriticalWork';

type AssignmentIdentitiesRelayResponse = ZenformedCoreOrganizationAssignmentIdentitiesResponse & {
  relay?: string;
  error?: string;
};

function parseAssignmentIdentitiesPayload(json: unknown): readonly CrmTeamMemberRef[] {
  if (json == null || typeof json !== 'object') return [];
  const o = json as AssignmentIdentitiesRelayResponse;
  if (!Array.isArray(o.identities)) return [];
  return mapOrganizationAssignmentIdentitiesToTeamMemberRefs(o.identities);
}

async function fetchAssignmentIdentities(accessToken: string): Promise<readonly CrmTeamMemberRef[]> {
  const appSlug = buildcoreAppDefinition.appSlug;
  const cacheKey = `assignment-identities:${appSlug}:${accessToken}`;
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
      throw new Error(json.error ?? 'Failed to load assignment identities');
    }
    return parseAssignmentIdentitiesPayload(json);
  });
}

export function useBuildCoreAssignmentCatalog(): {
  catalog: AssignmentIdentityCatalog | null;
  isLoading: boolean;
  loadError: string | null;
} {
  const { getAccessToken, user } = useBuildCoreDashboardContext();
  const isApiSource = getCrmDataSource() === 'api';
  const [members, setMembers] = useState<readonly CrmTeamMemberRef[] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadIdentities = useCallback(async (): Promise<void> => {
    if (!isApiSource) {
      setMembers([]);
      setIsLoading(false);
      return;
    }

    const token = getAccessToken()?.trim();
    if (!token) {
      setMembers([]);
      setLoadError('Not signed in');
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setLoadError(null);
    try {
      setMembers(await fetchAssignmentIdentities(token));
    } catch (err) {
      setMembers([]);
      setLoadError(err instanceof Error ? err.message : 'Failed to load assignment identities');
    } finally {
      setIsLoading(false);
    }
  }, [getAccessToken, isApiSource]);

  useEffect(() => {
    return deferNonCriticalWork(() => {
      void loadIdentities();
    });
  }, [loadIdentities]);

  const fallbackMember = useMemo(() => {
    if (user?.id == null) return null;
    return teamMemberRefFromSignedInUser({
      userId: user.id,
      email: user.email,
    });
  }, [user?.email, user?.id]);

  const catalog = useMemo(() => {
    if (!isApiSource) return null;
    const primary =
      members != null && members.length > 0
        ? buildAssignmentIdentityCatalogFromMembers(members)
        : null;
    return mergeAssignmentIdentityCatalog(primary, fallbackMember);
  }, [fallbackMember, isApiSource, members]);

  return { catalog, isLoading, loadError };
}
