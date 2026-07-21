import type { CrmOrganizationPhotosPage } from '@/domain/crm';
import { env } from '@/infrastructure/config/env';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';
import { isCrmDocumentImage } from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import { crmRepositories } from '@/shared/di/container';

export async function loadCrmOrganizationPhotos(input: {
  readonly search: string;
  readonly cursor?: string | null;
  readonly limit?: number;
}): Promise<CrmOrganizationPhotosPage> {
  if (isDemoRuntimeClient()) {
    const summaries = await resolveCrmRepositoryResult(
      crmRepositories.projects.listSummaries({ rootsOnly: false })
    );
    const summaryById = new Map(summaries.map((summary) => [summary.id, summary]));
    const details = await Promise.all(
      summaries.map((summary) =>
        resolveCrmRepositoryResult(crmRepositories.projectDetail.getById(summary.id))
      )
    );
    const normalizedSearch = input.search.trim().toLocaleLowerCase();
    const all = details
      .filter((detail): detail is NonNullable<typeof detail> => detail != null)
      .flatMap((detail) => {
        const summary = detail.summary;
        const parent = summary.parentProjectId
          ? summaryById.get(summary.parentProjectId) ?? null
          : null;
        const taskById = new Map(detail.workflowTasks.map((task) => [task.id, task]));
        return detail.documents
          .filter((document) => isCrmDocumentImage(document.name, document.mimeType))
          .filter((document) => {
            if (!normalizedSearch) return true;
            const taskName = document.workflowTaskId
              ? taskById.get(document.workflowTaskId)?.title
              : null;
            return [document.name, summary.name, parent?.name, taskName].some((value) =>
              value?.toLocaleLowerCase().includes(normalizedSearch)
            );
          })
          .map((document) => ({
            document,
            projectId: summary.id,
            projectSlug: summary.slug,
            projectName: summary.name,
            parentProjectId: parent?.id ?? null,
            parentProjectSlug: parent?.slug ?? null,
            parentProjectName: parent?.name ?? null,
            taskName: document.workflowTaskId
              ? taskById.get(document.workflowTaskId)?.title ?? null
              : null,
            customerName: summary.client.name || summary.contact.name || null,
            canDownload: false,
            canDelete: false,
          }));
      })
      .sort(
        (a, b) =>
          new Date(b.document.uploadedAt).getTime() -
          new Date(a.document.uploadedAt).getTime()
      );
    const offset = input.cursor?.startsWith('demo:')
      ? Number(input.cursor.slice('demo:'.length)) || 0
      : 0;
    const limit = input.limit ?? 40;
    const photos = all.slice(offset, offset + limit);
    return {
      photos,
      nextCursor: offset + photos.length < all.length ? `demo:${offset + photos.length}` : null,
    };
  }

  const session = await getSession();
  const token = session?.access_token;
  if (env.isSaasMode && !token) throw new Error('You must be signed in.');

  const params = new URLSearchParams({
    search: input.search.trim(),
    limit: String(input.limit ?? 40),
  });
  if (input.cursor) params.set('cursor', input.cursor);

  const response = await fetch(`/api/crm/photos?${params}`, {
    credentials: 'include',
    cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  const body = (await response.json()) as CrmOrganizationPhotosPage & {
    message?: string;
  };
  if (!response.ok) throw new Error(body.message ?? 'Could not load photos.');
  return body;
}
