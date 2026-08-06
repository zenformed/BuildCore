/**
 * Seed ≥200 photo metadata rows for Photos list v2 pagination testing.
 * Does not upload real blobs.
 *
 * Usage:
 *   ALLOW_BUILDCORE_PHOTOS_PAGINATION_TEST_DATA=true npm run testdata:photos-pagination:seed
 *
 * Idempotent: skips document indexes that already exist (org + storage_key marker).
 */

import { generateCrmProjectLeadToken } from '../src/infrastructure/lead/generateLeadToken';
import {
  assertPhotosPaginationTestDataSafety,
  createdAtForPhotosPaginationIndex,
  formatPhotosPaginationTestFileName,
  formatPhotosPaginationTestProjectName,
  PHOTOS_PAGINATION_ALLOW_ENV_KEY,
  PHOTOS_PAGINATION_STORAGE_KEY_PREFIX,
  PHOTOS_PAGINATION_TEST_MARKER,
  PHOTOS_PAGINATION_TEST_ORG_ID,
  PHOTOS_PAGINATION_TEST_PHOTO_COUNT,
  requireCrmServiceRoleClient,
} from './photos-pagination-test-data-shared';

async function resolveUploaderUserId(
  supabase: ReturnType<typeof requireCrmServiceRoleClient>
): Promise<string> {
  const { data, error } = await supabase
    .from('platform_organization_members')
    .select('user_id')
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .limit(1)
    .maybeSingle();
  if (error != null) {
    throw new Error(`Failed to resolve uploader user: ${error.message}`);
  }
  const userId = (data as { user_id?: string } | null)?.user_id;
  if (!userId) {
    throw new Error(
      `No platform_organization_members row for org ${PHOTOS_PAGINATION_TEST_ORG_ID}; cannot seed photos.`
    );
  }
  return userId;
}

async function ensureProject(
  supabase: ReturnType<typeof requireCrmServiceRoleClient>,
  input: {
    readonly name: string;
    readonly slug: string;
    readonly parentProjectId: string | null;
  }
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .eq('notes', PHOTOS_PAGINATION_TEST_MARKER)
    .eq('name', input.name)
    .maybeSingle();
  if (existingError != null) {
    throw new Error(`Failed to load project ${input.name}: ${existingError.message}`);
  }
  if (existing?.id) return existing.id as string;

  const nowIso = new Date().toISOString();
  const { data, error } = await supabase
    .from('crm_projects')
    .insert({
      organization_id: PHOTOS_PAGINATION_TEST_ORG_ID,
      name: input.name,
      slug: input.slug,
      parent_project_id: input.parentProjectId,
      notes: PHOTOS_PAGINATION_TEST_MARKER,
      lead_token: generateCrmProjectLeadToken(),
      priority: 'normal',
      subproject_status: 'normal',
      industry: 'general-contractor',
      current_stage_slug: 'new-lead',
      deal_value_cents: 0,
      balance_cents: 0,
      last_activity_at: nowIso,
      archived_at: null,
    })
    .select('id')
    .single();
  if (error != null) {
    throw new Error(`Failed to create project ${input.name}: ${error.message}`);
  }
  return data.id as string;
}

async function ensureTask(
  supabase: ReturnType<typeof requireCrmServiceRoleClient>,
  input: {
    readonly projectId: string;
    readonly title: string;
    readonly assignedMemberId: string;
    readonly amountCents: number | null;
  }
): Promise<string> {
  const { data: existing, error: existingError } = await supabase
    .from('crm_workflow_tasks')
    .select('id')
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .eq('project_id', input.projectId)
    .eq('title', input.title)
    .is('archived_at', null)
    .maybeSingle();
  if (existingError != null) {
    throw new Error(`Failed to load task ${input.title}: ${existingError.message}`);
  }
  if (existing?.id) return existing.id as string;

  const { data, error } = await supabase
    .from('crm_workflow_tasks')
    .insert({
      organization_id: PHOTOS_PAGINATION_TEST_ORG_ID,
      project_id: input.projectId,
      title: input.title,
      stage_slug: 'new-lead',
      status: 'pending',
      sort_order: 0,
      assigned_member_id: input.assignedMemberId,
      amount_cents: input.amountCents,
      notes: PHOTOS_PAGINATION_TEST_MARKER,
    })
    .select('id')
    .single();
  if (error != null) {
    throw new Error(`Failed to create task ${input.title}: ${error.message}`);
  }
  return data.id as string;
}

async function main(): Promise<void> {
  assertPhotosPaginationTestDataSafety('seed');
  const supabase = requireCrmServiceRoleClient();
  const uploaderId = await resolveUploaderUserId(supabase);

  const rootAId = await ensureProject(supabase, {
    name: formatPhotosPaginationTestProjectName('root-a'),
    slug: 'photos-pagination-root-a',
    parentProjectId: null,
  });
  const rootBId = await ensureProject(supabase, {
    name: formatPhotosPaginationTestProjectName('root-b'),
    slug: 'photos-pagination-root-b',
    parentProjectId: null,
  });
  const childId = await ensureProject(supabase, {
    name: formatPhotosPaginationTestProjectName('child'),
    slug: 'photos-pagination-child',
    parentProjectId: rootAId,
  });

  const taskA = await ensureTask(supabase, {
    projectId: rootAId,
    title: 'Photos Pagination Task A',
    assignedMemberId: uploaderId,
    amountCents: null,
  });
  const taskB = await ensureTask(supabase, {
    projectId: childId,
    title: 'Photos Pagination Task B',
    assignedMemberId: uploaderId,
    amountCents: null,
  });
  const paymentTask = await ensureTask(supabase, {
    projectId: rootBId,
    title: 'Photos Pagination Payment',
    assignedMemberId: uploaderId,
    amountCents: 2500,
  });

  const { data: existingDocs, error: existingDocsError } = await supabase
    .from('crm_documents')
    .select('id, storage_key')
    .eq('organization_id', PHOTOS_PAGINATION_TEST_ORG_ID)
    .like('storage_key', `${PHOTOS_PAGINATION_STORAGE_KEY_PREFIX}/%`);
  if (existingDocsError != null) {
    throw new Error(`Failed to load existing test photos: ${existingDocsError.message}`);
  }
  const existingKeys = new Set(
    ((existingDocs ?? []) as { storage_key: string | null }[])
      .map((row) => row.storage_key)
      .filter((key): key is string => typeof key === 'string')
  );

  const projectIds = [rootAId, rootBId, childId];
  const taskIds = [taskA, taskB, paymentTask, null as string | null];
  let inserted = 0;
  let skipped = 0;

  for (let index = 1; index <= PHOTOS_PAGINATION_TEST_PHOTO_COUNT; index += 1) {
    const isPdfExclusion = index % 40 === 0;
    const isDeleted = index % 37 === 0;
    const isPending = index % 41 === 0;
    const mime = isPdfExclusion ? 'application/pdf' : 'image/jpeg';
    const fileName = formatPhotosPaginationTestFileName(
      index,
      isPdfExclusion ? 'pdf' : 'image'
    );
    const storageKey = `${PHOTOS_PAGINATION_STORAGE_KEY_PREFIX}/${String(index).padStart(3, '0')}-${fileName}`;
    if (existingKeys.has(storageKey)) {
      skipped += 1;
      continue;
    }

    const projectId = projectIds[(index - 1) % projectIds.length]!;
    const taskId = taskIds[(index - 1) % taskIds.length] ?? null;
    const createdAt = createdAtForPhotosPaginationIndex(index);

    const { error } = await supabase.from('crm_documents').insert({
      organization_id: PHOTOS_PAGINATION_TEST_ORG_ID,
      project_id: projectId,
      workflow_task_id: taskId,
      budget_entry_id: null,
      document_type: 'photo',
      file_name: fileName,
      safe_file_name: fileName,
      mime_type: mime,
      file_size_bytes: 1024 + index,
      upload_status: isPending ? 'pending' : 'ready',
      uploaded_by_member_id: uploaderId,
      storage_provider: 'supabase',
      storage_bucket: 'buildcore-documents',
      storage_key: storageKey,
      storage_path: storageKey,
      created_at: createdAt,
      deleted_at: isDeleted ? createdAt : null,
    });
    if (error != null) {
      throw new Error(`Failed to insert photo ${index}: ${error.message}`);
    }
    inserted += 1;
  }

  console.log(
    JSON.stringify(
      {
        ok: true,
        orgId: PHOTOS_PAGINATION_TEST_ORG_ID,
        marker: PHOTOS_PAGINATION_TEST_MARKER,
        inserted,
        skipped,
        targetCount: PHOTOS_PAGINATION_TEST_PHOTO_COUNT,
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
