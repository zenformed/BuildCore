'use client';

import { useCallback, useState } from 'react';
import type { CrmProjectDetail } from '@/domain/crm';
import { shouldSimulateDemoOperation } from '@/infrastructure/demo/demoSafetyPolicy';
import {
  simulateDemoPrimaryPhotoRemoval,
  simulateDemoPrimaryPhotoUpload,
} from '@/infrastructure/demo/demoSimulatedDocumentUpload';
import {
  crmApiDeleteJson,
  crmApiPostFormData,
} from '@/infrastructure/crm/api/crmApiClient';
import {
  buildProjectPrimaryPhotoApiPath,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { projectPhotoApiPathCacheKey, seedSessionBlob } from '@/presentation/utils/sessionBlobCache';

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

        const formData = new FormData();
        formData.append('photo', file);
        return crmApiPostFormData<CrmProjectDetail>(
          `/api/crm/projects/${encodeURIComponent(slug)}/photo`,
          formData
        );
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

      return crmApiDeleteJson<CrmProjectDetail>(
        `/api/crm/projects/${encodeURIComponent(slug)}/photo`
      );
    } finally {
      setRemoving(false);
    }
  }, [slug]);

  return { uploading, removing, uploadPhoto, removePhoto };
}
