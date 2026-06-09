'use client';

import { useState, type ReactElement } from 'react';
import type { CrmProjectSummary } from '@/domain/crm';
import {
  projectPrimaryPhotoCircleColor,
  projectPrimaryPhotoInitials,
} from '@/domain/crm/projectPrimaryPhoto';
import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';
import {
  buildProjectPrimaryPhotoApiPath,
  invalidateProjectPrimaryPhotoBlobCache,
  useProjectPrimaryPhotoBlob,
} from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoBlob';
import { useProjectPrimaryPhotoMutation } from '@/presentation/features/crmProjectDetail/useProjectPrimaryPhotoMutation';
import { ProjectPrimaryPhotoModal } from './ProjectPrimaryPhotoModal';
import styles from './ProjectDetail.module.css';

function ProjectPrimaryPhotoCameraIcon(): ReactElement {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}

export type ProjectPrimaryPhotoProps = {
  summary: CrmProjectSummary;
  parentSummary?: CrmProjectSummary | null;
  canEdit: boolean;
  onPhotoUpdated: (summary: CrmProjectSummary) => void;
  onError?: (message: string) => void;
};

export function ProjectPrimaryPhoto({
  summary,
  parentSummary = null,
  canEdit,
  onPhotoUpdated,
  onError,
}: ProjectPrimaryPhotoProps): ReactElement {
  const copy = content.projectDetail.primaryPhoto;
  const [modalOpen, setModalOpen] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const isSubproject = summary.parentProjectId != null;
  const displaySummary = isSubproject && parentSummary != null ? parentSummary : summary;
  const effectiveCanEdit = canEdit && !isSubproject;
  const apiPath = buildProjectPrimaryPhotoApiPath(
    displaySummary.slug,
    displaySummary.primaryPhotoPath
  );
  const photoUrl = useProjectPrimaryPhotoBlob(apiPath);
  const { uploading, removing, uploadPhoto, removePhoto } = useProjectPrimaryPhotoMutation(
    summary.slug
  );

  const initials = projectPrimaryPhotoInitials({
    parentProjectId: isSubproject ? null : summary.parentProjectId,
    projectName: summary.name,
    clientName: summary.client.name,
  });
  const initialsLabel = summary.client.name;

  const openModal = () => {
    if (!effectiveCanEdit) return;
    setModalError(null);
    setModalOpen(true);
  };

  const handleUpload = async (file: File) => {
    setModalError(null);
    try {
      invalidateProjectPrimaryPhotoBlobCache(apiPath);
      const updated = await uploadPhoto(file);
      onPhotoUpdated(updated.summary);
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.uploadError;
      setModalError(message);
      onError?.(message);
    }
  };

  const handleRemove = async () => {
    setModalError(null);
    try {
      invalidateProjectPrimaryPhotoBlobCache(apiPath);
      const updated = await removePhoto();
      onPhotoUpdated(updated.summary);
      setModalOpen(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : copy.removeError;
      setModalError(message);
      onError?.(message);
    }
  };

  return (
    <>
      <div className={styles.titleBlockImageWrap}>
        {effectiveCanEdit ? (
          <button
            type="button"
            className={styles.titleBlockImageBtn}
            onClick={openModal}
            title={copy.changeTitle}
            aria-label={copy.changeAriaLabel}
          >
            {photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={photoUrl} alt="" className={styles.titleBlockImagePhoto} />
            ) : (
              <span
                className={styles.titleBlockImageInitial}
                style={{ backgroundColor: projectPrimaryPhotoCircleColor(initialsLabel) }}
                aria-hidden
              >
                {initials}
              </span>
            )}
          </button>
        ) : photoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={photoUrl}
            alt=""
            className={styles.titleBlockImagePhoto}
            role="img"
            aria-label={copy.placeholderAriaLabel}
          />
        ) : (
          <span
            className={styles.titleBlockImageInitial}
            style={{ backgroundColor: projectPrimaryPhotoCircleColor(initialsLabel) }}
            role="img"
            aria-label={copy.placeholderAriaLabel}
          >
            {initials}
          </span>
        )}
        {effectiveCanEdit ? (
          <button
            type="button"
            className={styles.titleBlockImageCameraBtn}
            onClick={openModal}
            disabled={uploading || removing}
            title={copy.changeTitle}
            aria-label={copy.changeAriaLabel}
          >
            <ProjectPrimaryPhotoCameraIcon />
          </button>
        ) : null}
      </div>
      {effectiveCanEdit ? (
        <ProjectPrimaryPhotoModal
          open={modalOpen}
          hasPhoto={displaySummary.primaryPhotoPath != null}
          previewUrl={photoUrl}
          initials={initials}
          initialsBackground={projectPrimaryPhotoCircleColor(initialsLabel)}
          uploading={uploading}
          removing={removing}
          error={modalError}
          onClose={() => {
            setModalError(null);
            setModalOpen(false);
          }}
          onUpload={(file) => void handleUpload(file)}
          onRemove={() => void handleRemove()}
        />
      ) : null}
    </>
  );
}
