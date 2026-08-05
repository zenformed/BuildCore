/**
 * Remove Projects list v2 pagination test fixtures created by the seed script.
 *
 * Usage:
 *   ALLOW_BUILDCORE_PAGINATION_TEST_DATA=true npm run testdata:projects-pagination:cleanup
 *
 * Deletes only rows matching BOTH:
 *   - organization_id = pinned test org UUID
 *   - notes = BUILDCORE_PAGINATION_TEST_DATA
 *
 * Never deletes by name alone.
 */

import {
  ALLOW_ENV_KEY,
  assertPaginationTestDataSafety,
  PAGINATION_TEST_MARKER,
  PAGINATION_TEST_ORG_ID,
  requireCrmServiceRoleClient,
} from './projects-pagination-test-data-shared';

async function main(): Promise<void> {
  assertPaginationTestDataSafety('cleanup');

  if (!PAGINATION_TEST_MARKER.trim() || !PAGINATION_TEST_ORG_ID.trim()) {
    throw new Error('Refusing cleanup: marker or organization constraint is absent.');
  }

  const supabase = requireCrmServiceRoleClient();

  const { data: projects, error: projectSelectError } = await supabase
    .from('crm_projects')
    .select('id, client_id, primary_contact_id, name')
    .eq('organization_id', PAGINATION_TEST_ORG_ID)
    .eq('notes', PAGINATION_TEST_MARKER);

  if (projectSelectError) {
    throw new Error(`Failed to select test projects: ${projectSelectError.message}`);
  }

  const projectRows = projects ?? [];
  const projectIds = projectRows.map((row) => row.id as string);
  const clientIdsFromProjects = [
    ...new Set(
      projectRows
        .map((row) => row.client_id as string | null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];
  const contactIdsFromProjects = [
    ...new Set(
      projectRows
        .map((row) => row.primary_contact_id as string | null)
        .filter((id): id is string => typeof id === 'string' && id.length > 0)
    ),
  ];

  const { data: markedClients, error: clientSelectError } = await supabase
    .from('crm_clients')
    .select('id')
    .eq('organization_id', PAGINATION_TEST_ORG_ID)
    .eq('notes', PAGINATION_TEST_MARKER);
  if (clientSelectError) {
    throw new Error(`Failed to select test clients: ${clientSelectError.message}`);
  }
  const clientIds = [
    ...new Set([
      ...clientIdsFromProjects,
      ...(markedClients ?? []).map((row) => row.id as string),
    ]),
  ];

  console.log(
    JSON.stringify(
      {
        action: 'cleanup',
        organizationId: PAGINATION_TEST_ORG_ID,
        marker: PAGINATION_TEST_MARKER,
        wouldRemoveProjects: projectIds.length,
        wouldRemoveClients: clientIds.length,
        wouldRemoveContacts: contactIdsFromProjects.length,
        allowEnv: ALLOW_ENV_KEY,
      },
      null,
      2
    )
  );

  if (projectIds.length === 0 && clientIds.length === 0) {
    console.log(
      JSON.stringify(
        {
          summary: true,
          deletedProjects: 0,
          deletedClients: 0,
          deletedContacts: 0,
          remainingMatchingProjects: 0,
        },
        null,
        2
      )
    );
    return;
  }

  // Projects first (client FK is ON DELETE RESTRICT).
  if (projectIds.length > 0) {
    const { error: deleteProjectsError } = await supabase
      .from('crm_projects')
      .delete()
      .eq('organization_id', PAGINATION_TEST_ORG_ID)
      .eq('notes', PAGINATION_TEST_MARKER)
      .in('id', projectIds);
    if (deleteProjectsError) {
      throw new Error(`Failed to delete test projects: ${deleteProjectsError.message}`);
    }
  }

  let deletedContacts = 0;
  if (clientIds.length > 0) {
    const { data: contacts, error: contactSelectError } = await supabase
      .from('crm_contacts')
      .select('id')
      .eq('organization_id', PAGINATION_TEST_ORG_ID)
      .in('client_id', clientIds);
    if (contactSelectError) {
      throw new Error(`Failed to select test contacts: ${contactSelectError.message}`);
    }
    const contactIds = [
      ...new Set([
        ...contactIdsFromProjects,
        ...(contacts ?? []).map((row) => row.id as string),
      ]),
    ];
    if (contactIds.length > 0) {
      const { error: deleteContactsError } = await supabase
        .from('crm_contacts')
        .delete()
        .eq('organization_id', PAGINATION_TEST_ORG_ID)
        .in('id', contactIds);
      if (deleteContactsError) {
        throw new Error(`Failed to delete test contacts: ${deleteContactsError.message}`);
      }
      deletedContacts = contactIds.length;
    }
  }

  let deletedClients = 0;
  if (clientIds.length > 0) {
    const { error: deleteClientsError } = await supabase
      .from('crm_clients')
      .delete()
      .eq('organization_id', PAGINATION_TEST_ORG_ID)
      .eq('notes', PAGINATION_TEST_MARKER)
      .in('id', clientIds);
    if (deleteClientsError) {
      throw new Error(`Failed to delete test clients: ${deleteClientsError.message}`);
    }
    deletedClients = clientIds.length;
  }

  const { count: remaining, error: verifyError } = await supabase
    .from('crm_projects')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', PAGINATION_TEST_ORG_ID)
    .eq('notes', PAGINATION_TEST_MARKER);
  if (verifyError) {
    throw new Error(`Failed to verify cleanup: ${verifyError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        summary: true,
        deletedProjects: projectIds.length,
        deletedClients,
        deletedContacts,
        remainingMatchingProjects: remaining ?? 0,
      },
      null,
      2
    )
  );

  if ((remaining ?? 0) !== 0) {
    throw new Error(
      `Cleanup incomplete: ${remaining} matching test projects still remain (org + marker).`
    );
  }
}

main().catch((err) => {
  console.error(err instanceof Error ? err.stack ?? err.message : err);
  process.exit(1);
});
