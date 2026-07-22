import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  CrmOrganizationPhoto,
  CrmOrganizationPhotosPage,
  PipelineStageSlug,
} from '@/domain/crm';
import {
  mapDbDocument,
  type DbCrmDocumentRow,
} from '@/infrastructure/crm/mappers/mapCrmFromDb';
import { loadCrmMemberMap } from './crmMemberMap';
import {
  loadOrganizationPhotoAccessContext,
  resolveOrganizationPhotoDocumentAccess,
  type OrganizationPhotoProjectRow,
  type OrganizationPhotoTaskRow,
} from './crmOrganizationPhotoAccess';

const DOCUMENT_SELECT =
  'id, project_id, workflow_task_id, budget_entry_id, document_type, file_name, mime_type, file_size_bytes, upload_status, uploaded_by_member_id, reviewed_by_member_id, reviewed_at, created_at, safe_file_name, storage_provider, storage_bucket, storage_key, storage_path, deleted_at, latitude, longitude, location_accuracy_meters, location_source, location_captured_at';

type Cursor = { readonly createdAt: string; readonly id: string };

function encodeCursor(cursor: Cursor): string {
  return Buffer.from(JSON.stringify(cursor), 'utf8').toString('base64url');
}

function decodeCursor(value: string | null | undefined): Cursor | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(Buffer.from(value, 'base64url').toString('utf8')) as Partial<Cursor>;
    if (typeof parsed.createdAt !== 'string' || typeof parsed.id !== 'string') return null;
    return { createdAt: parsed.createdAt, id: parsed.id };
  } catch {
    return null;
  }
}

function joinedName(
  value:
    | OrganizationPhotoProjectRow['crm_clients']
    | OrganizationPhotoProjectRow['crm_contacts'],
  key: 'company_name' | 'full_name'
): string | null {
  const row = Array.isArray(value) ? value[0] : value;
  const candidate =
    row == null
      ? null
      : key === 'company_name' && 'company_name' in row
        ? row.company_name
        : key === 'full_name' && 'full_name' in row
          ? row.full_name
          : null;
  return typeof candidate === 'string' && candidate.trim() ? candidate.trim() : null;
}

function includesQuery(value: string | null | undefined, query: string): boolean {
  return Boolean(value?.toLocaleLowerCase().includes(query));
}

export async function listCrmOrganizationPhotosForViewer(
  supabase: SupabaseClient,
  organizationId: string,
  userId: string,
  input: {
    readonly search?: string;
    readonly cursor?: string | null;
    readonly limit?: number;
  }
): Promise<CrmOrganizationPhotosPage> {
  const limit = Math.min(100, Math.max(1, Math.floor(input.limit ?? 40)));
  const search = input.search?.trim().toLocaleLowerCase() ?? '';
  const initialCursor = decodeCursor(input.cursor);

  const accessContext = await loadOrganizationPhotoAccessContext(
    supabase,
    organizationId,
    userId
  );
  const projectById = accessContext.projectById;
  const projectIds = [...projectById.keys()];
  if (projectIds.length === 0) return { photos: [], nextCursor: null };

  const accepted: CrmOrganizationPhoto[] = [];
  let scanCursor = initialCursor;
  let exhausted = false;
  const batchSize = Math.max(100, Math.min(250, limit * 3));

  while (accepted.length <= limit && !exhausted) {
    let query = supabase
      .from('crm_documents')
      .select(DOCUMENT_SELECT)
      .eq('organization_id', organizationId)
      .in('project_id', projectIds)
      .like('mime_type', 'image/%')
      .eq('upload_status', 'ready')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .order('id', { ascending: false })
      .limit(batchSize);
    if (scanCursor) {
      query = query.or(
        `created_at.lt.${scanCursor.createdAt},and(created_at.eq.${scanCursor.createdAt},id.lt.${scanCursor.id})`
      );
    }

    const { data: documentData, error: documentError } = await query;
    if (documentError) throw new Error(documentError.message);
    const rows = (documentData ?? []) as DbCrmDocumentRow[];
    if (rows.length === 0) break;
    exhausted = rows.length < batchSize;

    const taskIds = [
      ...new Set(
        rows
          .map((row) => row.workflow_task_id)
          .filter((id): id is string => typeof id === 'string' && id.length > 0)
      ),
    ];
    const { data: taskData, error: taskError } =
      taskIds.length === 0
        ? { data: [] as OrganizationPhotoTaskRow[], error: null }
        : await supabase
            .from('crm_workflow_tasks')
            .select('id, project_id, title, stage_slug, assigned_member_id, amount_cents')
            .eq('organization_id', organizationId)
            .in('id', taskIds)
            .is('archived_at', null);
    if (taskError) throw new Error(taskError.message);
    const taskById = new Map(
      ((taskData ?? []) as OrganizationPhotoTaskRow[]).map(
        (task) => [task.id, task] as const
      )
    );

    const memberById = await loadCrmMemberMap(
      supabase,
      rows
        .flatMap((row) => [row.uploaded_by_member_id, row.reviewed_by_member_id])
        .filter((id): id is string => typeof id === 'string' && id.length > 0),
      { organizationId }
    );
    const stageByTaskId = new Map<string, PipelineStageSlug>();
    for (const task of taskById.values()) {
      stageByTaskId.set(task.id, task.stage_slug as PipelineStageSlug);
    }

    for (const row of rows) {
      scanCursor = { createdAt: row.created_at, id: row.id };
      const project = projectById.get(row.project_id);
      if (!project) continue;
      const parent = project.parent_project_id
        ? projectById.get(project.parent_project_id) ?? null
        : null;
      const task = row.workflow_task_id ? taskById.get(row.workflow_task_id) ?? null : null;
      const { visible, canDownload, canDelete } =
        resolveOrganizationPhotoDocumentAccess(accessContext, row, task);
      if (!visible) continue;

      const customerName =
        joinedName(project.crm_clients, 'company_name') ??
        joinedName(project.crm_contacts, 'full_name');
      if (
        search &&
        ![
          row.file_name,
          project.name,
          parent?.name,
          task?.title,
          customerName,
        ].some((value) => includesQuery(value, search))
      ) {
        continue;
      }

      accepted.push({
        document: mapDbDocument(row, stageByTaskId, memberById),
        projectId: project.id,
        projectSlug: project.slug,
        projectName: project.name,
        parentProjectId: parent?.id ?? null,
        parentProjectSlug: parent?.slug ?? null,
        parentProjectName: parent?.name ?? null,
        taskName: task?.title ?? null,
        customerName,
        canDownload,
        canDelete,
      });
      if (accepted.length > limit) break;
    }
  }

  const page = accepted.slice(0, limit);
  const last = page[page.length - 1];
  return {
    photos: page,
    nextCursor:
      accepted.length > limit || !exhausted
        ? last
          ? encodeCursor({
              createdAt: last.document.uploadedAt,
              id: last.document.id,
            })
          : scanCursor
            ? encodeCursor(scanCursor)
            : null
        : null,
  };
}
