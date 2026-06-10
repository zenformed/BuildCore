'use client';



import { useRef, type ChangeEvent, type ReactElement } from 'react';

import { buildCoreDashboardContent as content } from '@/platform/content/buildCoreDashboardContent';

import { CenterConfirmDialog } from '@/presentation/components/CenterConfirmDialog/CenterConfirmDialog';

import styles from './ProjectDetail.module.css';



function TrashIcon(): ReactElement {

  return (

    <svg

      width="16"

      height="16"

      viewBox="0 0 24 24"

      fill="none"

      stroke="currentColor"

      strokeWidth="2"

      strokeLinecap="round"

      strokeLinejoin="round"

      aria-hidden

    >

      <polyline points="3 6 5 6 21 6" />

      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />

      <line x1="10" y1="11" x2="10" y2="17" />

      <line x1="14" y1="11" x2="14" y2="17" />

    </svg>

  );

}



export type ProjectPrimaryPhotoModalProps = {

  open: boolean;

  hasPhoto: boolean;

  previewUrl: string | null;

  initials: string;

  initialsBackground: string;

  uploading: boolean;

  removing: boolean;

  error?: string | null;

  onClose: () => void;

  onUpload: (file: File) => void;

  onRemove: () => void;

};



export function ProjectPrimaryPhotoModal({

  open,

  hasPhoto,

  previewUrl,

  initials,

  initialsBackground,

  uploading,

  removing,

  error = null,

  onClose,

  onUpload,

  onRemove,

}: ProjectPrimaryPhotoModalProps): ReactElement {

  const copy = content.projectDetail.primaryPhoto;

  const fileInputRef = useRef<HTMLInputElement>(null);

  const busy = uploading || removing;



  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {

    const file = event.target.files?.[0];

    event.target.value = '';

    if (file != null) onUpload(file);

  };



  return (

    <>

      <input

        ref={fileInputRef}

        type="file"

        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"

        className={styles.titleBlockImageFileInput}

        aria-hidden

        tabIndex={-1}

        onChange={handleFileChange}

      />

      <CenterConfirmDialog

        isOpen={open}

        title={copy.modalTitle}

        closeAriaLabel={copy.modalTitle}

        cancelLabel={copy.cancelLabel}

        confirmLabel={copy.uploadLabel}

        confirmDisabled={busy}

        cancelDisabled={busy}

        titleClassName={styles.projectPrimaryPhotoModalTitle}

        actionsClassName={styles.projectPrimaryPhotoModalActions}

        leadingAction={

          hasPhoto ? (

            <button

              type="button"

              className={styles.projectPrimaryPhotoModalTrashBtn}

              disabled={busy}

              onClick={onRemove}

              title={copy.removeLabel}

              aria-label={copy.removeLabel}

            >

              <TrashIcon />

            </button>

          ) : null

        }

        onClose={onClose}

        onConfirm={() => fileInputRef.current?.click()}

        body={

          <div className={styles.projectPrimaryPhotoModalBody}>

            <div className={styles.projectPrimaryPhotoModalPreview}>

              {previewUrl ? (

                // eslint-disable-next-line @next/next/no-img-element

                <img src={previewUrl} alt="" className={styles.projectPrimaryPhotoModalPreviewImg} />

              ) : (

                <span

                  className={styles.projectPrimaryPhotoModalInitial}

                  style={{ backgroundColor: initialsBackground }}

                  aria-hidden

                >

                  {initials}

                </span>

              )}

            </div>

            <p className={styles.projectPrimaryPhotoModalHint}>{copy.uploadHint}</p>

            {error ? (

              <p className={styles.projectPrimaryPhotoModalError} role="alert">

                {error}

              </p>

            ) : null}

          </div>

        }

      />

    </>

  );

}


