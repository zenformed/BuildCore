/**
 * Cleanup Photos list v2 pagination test fixtures.
 * Deletes only rows constrained by org + marker / storage_key prefix.
 *
 * Usage:
 *   ALLOW_BUILDCORE_PHOTOS_PAGINATION_TEST_DATA=true npm run testdata:photos-pagination:cleanup
 */

import {
  assertPhotosPaginationTestDataSafety,
  PHOTOS_PAGINATION_ALLOW_ENV_KEY,
  PHOTOS_PAGINATION_STORAGE_KEY_PREFIX,
  PHOTOS_PAGINATION_TEST_MARKER,
  PHOTOS_PAGINATION_TEST_ORG_ID,
  requireCrmServiceRoleClient,
} from './photos-pagination-test-data-shared';

async function main(): Promise<void> {
  assertPhotosPaginationTestDataSafety('cleanup');
  const supabase = requireCrmServiceRoleClient();

  const { data: docs, error: docsError } = await supabase
    .from('crm_documents')
    .delete()
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .like('storage_key', `${PHOTOS_PAGINATION_STORAGE_KEY_PREFIX}/%`)
    .select('id');
  if (docsError != null) {
    throw new Error(`Failed to delete test photos: ${docsError.message}`);
  }

  const { data: tasks, error: tasksError } = await supabase
    .from('crm_workflow_tasks')
    .delete()
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .eq('notes', PHOTOS_PAGINATION_TEST_MARKER)
    .select('id');
  if (tasksError != null) {
    throw new Error(`Failed to delete test tasks: ${tasksError.message}`);
  }

  // Children first (parent_project_id FK).
  const { data: childProjects, error: childError } = await supabase
    .from('crm_projects')
    .delete()
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .eq('notes', PHOTOS_PAGINATION_TEST_MARKER)
    .not('parent_project_id', 'is', null)
    .select('id');
  if (childError != null) {
    throw new Error(`Failed to delete child test projects: ${childError.message}`);
  }

  const { data: rootProjects, error: rootError } = await supabase
    .from('crm_projects')
    .delete()
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .eq('notes', PHOTOS_PAGINATION_TEST_MARKER)
    .is('parent_project_id', null)
    .select('id');
  if (rootError != null) {
    throw new Error(`Failed to delete root test projects: ${rootError.message}`);
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orgId: PHOTOS_PAGINATION_TEST_ORG_ID,
        marker: PHOTOS_PAGINATION_TEST_MARKER,
        deletedDocuments: (docs ?? []).length,
        deletedTasks: (tasks ?? []).length,
        deletedChildProjects: (childProjects ?? []).length,
        deletedRootProjects: (rootProjects ?? []).length,
        allowEnv: PHOTOS_PAGINATION_ALLOW_ENV_KEY,
      },
      null,
      2
    )
  );
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
