'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { shouldSimulateDemoOperation } from '@/infrastructure/demo/demoSafetyPolicy';
import {
  simulateDemoPrimaryPhotoRemoval,
  simulateDemoPrimaryPhotoUpload,
} from '@/infrastructure/demo/demoSimulatedDocumentUpload';
import { getSession } from '@/infrastructure/supabase/supabaseClient';
import { CrmApiError } from '@/infrastructure/crm/api/crmApiClient';
import {
  buildProjectPrimaryPhotoApiPath,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { projectPhotoApiPathCacheKey, seedSessionBlob } from '@/presentation/utils/sessionBlobCache';

async function getAccessToken(): Promise<string> {
  const session = await getSession();
  const token = session?.access_token;
  if (!token) throw new CrmApiError('unauthenticated', 401);
  return token;
}

export function useProjectPrimaryPhotoMutation(slug: string): {
  uploading: boolean;
  removing: boolean;
  uploadPhoto: (file: File) => Promise<CrmProjectDetail>;
  removePhoto: () => Promise<CrmProjectDetail>;
} {
  const [uploading, setUploading] = useState(false);
  const [removing, setRemoving] = useState(false);

  const uploadPhoto = useCallback(
    async (file: File): Promise<CrmProjectDetail> => {
      setUploading(true);
      try {
        if (shouldSimulateDemoOperation('project-primary-photo-upload')) {
          const updated = await simulateDemoPrimaryPhotoUpload(slug, file);
          const apiPath = buildProjectPrimaryPhotoApiPath(slug, updated.summary.primaryPhotoPath);
          if (apiPath != null) {
            seedSessionBlob(projectPhotoApiPathCacheKey(apiPath), file);
          }
          return updated;
        }

        const token = await getAccessToken();
        const formData = new FormData();
        formData.append('photo', file);
        const response = await fetch(`/api/crm/projects/${encodeURIComponent(slug)}/photo`, {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
          cache: 'no-store',
        });
        const body = await response.json().catch(() => null);
        if (!response.ok) {
          const message =
            body != null && typeof body === 'object' && typeof (body as { message?: string }).message === 'string'
              ? (body as { message: string }).message
              : 'Failed to upload project photo.';
          throw new Error(message);
        }
        return body as CrmProjectDetail;
      } finally {
        setUploading(false);
      }
    },
    [slug]
  );

  const removePhoto = useCallback(async (): Promise<CrmProjectDetail> => {
    setRemoving(true);
    try {
      if (shouldSimulateDemoOperation('project-primary-photo-upload')) {
        return simulateDemoPrimaryPhotoRemoval(slug);
      }

      const token = await getAccessToken();
      const response = await fetch(`/api/crm/projects/${encodeURIComponent(slug)}/photo`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      });
      const body = await response.json().catch(() => null);
      if (!response.ok) {
        const message =
          body != null && typeof body === 'object' && typeof (body as { message?: string }).message === 'string'
            ? (body as { message: string }).message
            : 'Failed to remove project photo.';
        throw new Error(message);
      }
      return body as CrmProjectDetail;
    } finally {
      setRemoving(false);
    }
  }, [slug]);

  return { uploading, removing, uploadPhoto, removePhoto };
}
