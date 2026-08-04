import type { CrmOrganizationPhotosPage } from '@/domain/crm';
import { env } from '@/infrastructure/config/env';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { isDemoRuntimeClient } from '@/infrastructure/runtime/buildCoreRuntime';
import { resolveCrmRepositoryResult } from '@/infrastructure/crm/types';
import { isCrmDocumentImage } from '@/presentation/features/crmProjectDetail/documentGalleryMedia';
import { crmRepositories } from '@/shared/di/container';
import { DEMO_TEAM_MEMBER_ID } from '@/infrastructure/demo/demoProfileFixtures';
import { resolveMockCrmTeamMember } from '@/platform/mock/crm/teamMembers';

export async function loadCrmOrganizationPhotos(input: {
  readonly search: string;
  readonly cursor?: string | null;
  readonly limit?: number;
}): Promise<CrmOrganizationPhotosPage> {
  const demoUploader = resolveMockCrmTeamMember(DEMO_TEAM_MEMBER_ID) ?? {
    id: DEMO_TEAM_MEMBER_ID,
    displayName: 'Alex Rivera',
    initials: 'AR',
    avatarUrl: null,
    email: 'alex.rivera@zenformed.test',
  };
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
    const primaryPhotoDocs = summaries
      .filter((summary) => summary.parentProjectId == null)
      .filter((summary) => {
        const path = summary.primaryPhotoPath?.trim() ?? '';
        return path.startsWith('/images/') || path.startsWith('images/');
      })
      .filter((summary) => {
        if (!normalizedSearch) return true;
        return [
          summary.primaryPhotoPath ?? null,
          summary.name,
          summary.client.name || null,
          summary.contact.name || null,
        ].some((value) => value?.toLocaleLowerCase().includes(normalizedSearch));
      })
      .map((summary) => {
        const path = summary.primaryPhotoPath!.trim();
        const normalizedPath = path.startsWith('/') ? path : `/${path}`;
        const lower = normalizedPath.toLowerCase();
        const mimeType = lower.endsWith('.png')
          ? 'image/png'
          : lower.endsWith('.webp')
            ? 'image/webp'
            : 'image/jpeg';
        return {
          document: {
            id: `demo-primary-photo-${summary.id}`,
            workflowTaskId: null,
            budgetEntryId: null,
            name: normalizedPath,
            kind: 'photo' as const,
            stageSlug: null,
            uploadedAt: summary.lastUpdatedAt,
            uploadedBy: summary.assignedTo ?? demoUploader,
            reviewedAt: null,
            reviewedBy: null,
            mimeType,
            sizeBytes: 0,
            latitude: null,
            longitude: null,
            locationAccuracyMeters: null,
            locationSource: null,
            locationCapturedAt: null,
          },
          projectId: summary.id,
          projectSlug: summary.slug,
          projectName: summary.name,
          parentProjectId: null,
          parentProjectSlug: null,
          parentProjectName: null,
          taskName: null,
          customerName: summary.client.name || summary.contact.name || null,
          canDownload: false,
          canDelete: false,
        };
      });

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
      .concat(primaryPhotoDocs)
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
