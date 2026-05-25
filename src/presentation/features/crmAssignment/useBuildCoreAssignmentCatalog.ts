'use client';



import { useCallback, useEffect, useMemo, useState } from 'react';

import type { CrmTeamMemberRef } from '@/domain/crm';

import { buildcoreAppDefinition } from '@/platform/appDefinitions/buildcore';

import { getCrmDataSource } from '@/infrastructure/config/crmDataSource';

import type { ZenformedCoreOrganizationAssignmentIdentitiesResponse } from '@/infrastructure/coreApi/types';

import {

  buildAssignmentIdentityCatalogFromMembers,

  mergeAssignmentIdentityCatalog,

  teamMemberRefFromSignedInUser,

} from '@/presentation/features/crmAssignment/buildAssignmentIdentityCatalogFromMembers';

import { mapOrganizationAssignmentIdentitiesToTeamMemberRefs } from '@/presentation/features/crmAssignment/mapOrganizationAssignmentIdentities';

import type { AssignmentIdentityCatalog } from '@/presentation/features/crmAssignment/assignmentIdentityModel';

import { useBuildCoreDashboardContext } from '@/presentation/providers/BuildCoreDashboardProvider';



type AssignmentIdentitiesRelayResponse = ZenformedCoreOrganizationAssignmentIdentitiesResponse & {

  relay?: string;

  error?: string;

};



function parseAssignmentIdentitiesPayload(

  json: unknown

): readonly CrmTeamMemberRef[] {

  if (json == null || typeof json !== 'object') return [];

  const o = json as AssignmentIdentitiesRelayResponse;

  if (!Array.isArray(o.identities)) return [];

  return mapOrganizationAssignmentIdentitiesToTeamMemberRefs(o.identities);

}



export function useBuildCoreAssignmentCatalog(): {

  catalog: AssignmentIdentityCatalog | null;

  isLoading: boolean;

  loadError: string | null;

} {

  const dash = useBuildCoreDashboardContext();

  const isApiSource = getCrmDataSource() === 'api';

  const [members, setMembers] = useState<readonly CrmTeamMemberRef[] | null>(null);

  const [isLoading, setIsLoading] = useState(isApiSource);

  const [loadError, setLoadError] = useState<string | null>(null);



  const fetchIdentities = useCallback(async () => {

    if (!isApiSource) {

      setMembers([]);

      setIsLoading(false);

      return;

    }



    const token = dash.getAccessToken()?.trim();

    if (!token) {

      setMembers([]);

      setLoadError('Not signed in');

      setIsLoading(false);

      return;

    }



    setIsLoading(true);

    setLoadError(null);

    try {

      const appSlug = buildcoreAppDefinition.appSlug;

      const res = await fetch(

        `/api/internal/organization/assignment-identities?appSlug=${encodeURIComponent(appSlug)}`,

        {

          headers: {

            Accept: 'application/json',

            Authorization: `Bearer ${token}`,

          },

        }

      );

      const json = (await res.json()) as AssignmentIdentitiesRelayResponse;

      if (!res.ok) {

        throw new Error(json.error ?? 'Failed to load assignment identities');

      }

      setMembers(parseAssignmentIdentitiesPayload(json));

    } catch (err) {

      setMembers([]);

      setLoadError(err instanceof Error ? err.message : 'Failed to load assignment identities');

    } finally {

      setIsLoading(false);

    }

  }, [dash, isApiSource]);



  useEffect(() => {

    void fetchIdentities();

  }, [fetchIdentities]);



  const fallbackMember = useMemo(() => {

    if (dash.user?.id == null) return null;

    return teamMemberRefFromSignedInUser({

      userId: dash.user.id,

      email: dash.user.email,

    });

  }, [dash.user?.email, dash.user?.id]);



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

