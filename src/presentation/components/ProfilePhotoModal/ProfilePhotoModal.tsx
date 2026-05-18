'use client';

import { useCallback, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { createCroppedImage } from './createCroppedImage';
import styles from './ProfilePhotoModal.module.css';

import {
  ZENFORMED_DEFAULT_AVATAR_SEEDS,
  zenformedDefaultAvatarSrc,
} from '@zenformed/core/dashboard-shell';

function TrashIcon(): React.ReactElement {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <line x1="10" y1="11" x2="10" y2="17" />
      <line x1="14" y1="11" x2="14" y2="17" />
    </svg>
  );
}

function UploadIcon(): React.ReactElement {
  return (
    <svg className={styles.optionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}

function ImageIcon(): React.ReactElement {
  return (
    <svg className={styles.optionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
      <circle cx="8.5" cy="8.5" r="1.5" />
      <polyline points="21 15 16 10 5 21" />
    </svg>
  );
}

function BackIcon(): React.ReactElement {
  return (
    <svg className={styles.optionIcon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <path d="M19 12H5M12 19l-7-7 7-7" />
    </svg>
  );
}

function getInitials(email: string): string {
  const local = (email || '').split('@')[0] || '';
  if (local.length >= 2) return local.slice(0, 2).toUpperCase();
  return local.slice(0, 1).toUpperCase() || '?';
}

function avatarColor(email: string): string {
  let h = 0;
  for (let i = 0; i < email.length; i++) h = (h * 31 + email.charCodeAt(i)) >>> 0;
  return `hsl(${h % 360}, 55%, 42%)`;
}

export interface ProfilePhotoModalProps {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string;
  avatarUrl: string | null;
  hasPhoto: boolean;
  onSuccess: () => void;
  /** In SaaS mode, pass () => session?.access_token so photo upload/delete are authorized. */
  getAccessToken?: () => string | null;
}

type ViewMode = 'main' | 'crop' | 'browse';

export function ProfilePhotoModal({
  isOpen,
  onClose,
  userEmail,
  getAccessToken,
  avatarUrl,
  hasPhoto,
  onSuccess,
}: ProfilePhotoModalProps): React.ReactElement | null {
  const [view, setView] = useState<ViewMode>('main');
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetView = useCallback(() => {
    setView('main');
    setImageToCrop(null);
    setError(null);
  }, []);

  const handleClose = useCallback(() => {
    resetView();
    onClose();
  }, [resetView, onClose]);

  const authHeaders = useCallback((): HeadersInit => {
    const token = getAccessToken?.() ?? null;
    return token ? { Authorization: `Bearer ${token}` } : {};
  }, [getAccessToken]);

  const uploadPhoto = useCallback(async (blob: Blob) => {
    setSaving(true);
    setError(null);
    try {
      const formData = new FormData();
      formData.set('photo', blob);
      const res = await fetch('/api/auth/me/photo', {
        method: 'POST',
        body: formData,
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? 'Failed to save photo');
      }
      onSuccess();
      resetView();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save photo');
    } finally {
      setSaving(false);
    }
  }, [onSuccess, resetView, authHeaders]);

  const handleCropComplete = useCallback((_croppedArea: Area, pixels: Area) => {
    setCroppedAreaPixels(pixels);
  }, []);

  const handleSaveCrop = useCallback(async () => {
    if (!imageToCrop || !croppedAreaPixels) return;
    setSaving(true);
    setError(null);
    try {
      const blob = await createCroppedImage(imageToCrop, croppedAreaPixels);
      await uploadPhoto(blob);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to crop');
    } finally {
      setSaving(false);
    }
  }, [imageToCrop, croppedAreaPixels, uploadPhoto]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      e.target.value = '';
      if (!file || !file.type.startsWith('image/')) return;
      const url = URL.createObjectURL(file);
      setImageToCrop(url);
      setView('crop');
      setCrop({ x: 0, y: 0 });
      setZoom(1);
    },
    []
  );

  const handleAvatarSelect = useCallback(
    async (seed: string) => {
      setSaving(true);
      setError(null);
      try {
        const postRes = await fetch('/api/auth/me/photo', {
          method: 'POST',
          credentials: 'include',
          headers: {
            ...authHeaders(),
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ dicebearSeed: seed }),
        });
        if (!postRes.ok) {
          const data = await postRes.json().catch(() => ({}));
          throw new Error(data.error ?? 'Failed to save avatar');
        }
        onSuccess();
        resetView();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to save avatar');
      } finally {
        setSaving(false);
      }
    },
    [onSuccess, resetView, authHeaders]
  );

  const handleDelete = useCallback(async () => {
    if (!hasPhoto) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/me/photo', {
        method: 'DELETE',
        credentials: 'include',
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error('Failed to remove photo');
      onSuccess();
      resetView();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove photo');
    } finally {
      setSaving(false);
    }
  }, [hasPhoto, onSuccess, resetView, authHeaders]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} onClick={handleClose} role="presentation">
      <div
        className={`${styles.container} ${saving ? styles.saving : ''}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.header}>
          <button type="button" className={styles.closeBtn} onClick={handleClose} aria-label="Close">×</button>
          <h2 className={styles.title}>
            {view === 'crop' ? 'Crop photo' : view === 'browse' ? 'Browse avatars' : 'Change profile picture'}
          </h2>
        </div>
        <div className={styles.content}>
          {view === 'main' && (
            <>
              <div className={styles.profileModalLayout}>
                <div className={styles.profileModalTop} />
                <div className={styles.profileModalAction}>
                  <div className={styles.avatarWrap}>
                    <div
                      className={styles.avatarCircle}
                      style={!avatarUrl ? { backgroundColor: avatarColor(userEmail) } : undefined}
                    >
                      {avatarUrl ? (
                        /* eslint-disable-next-line @next/next/no-img-element */
                        <img src={avatarUrl} alt="" className={styles.avatarCircleImg} />
                      ) : (
                        <span aria-hidden>{getInitials(userEmail)}</span>
                      )}
                    </div>
                    {hasPhoto && (
                      <button
                        type="button"
                        className={styles.avatarRemoveBtn}
                        onClick={() => void handleDelete()}
                        disabled={saving}
                        title="Remove photo"
                        aria-label="Remove photo"
                      >
                        <TrashIcon />
                      </button>
                    )}
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                    onChange={handleFileChange}
                    style={{ position: 'absolute', width: 0, height: 0, opacity: 0 }}
                    aria-hidden
                  />
                  <div className={styles.optionsRow}>
                <button type="button" className={styles.optionCircleBtn} onClick={() => setView('browse')} disabled={saving}>
                  <span className={styles.optionCircleIcon}>
                    <ImageIcon />
                  </span>
                  <span className={styles.optionCircleLabel}>Browse Avatars</span>
                </button>
                <button
                  type="button"
                  className={styles.optionCircleBtn}
                  onClick={() => fileInputRef.current?.click()}
                  disabled={saving}
                >
                  <span className={styles.optionCircleIcon}>
                    <UploadIcon />
                  </span>
                  <span className={styles.optionCircleLabel}>Upload from Device</span>
                </button>
              </div>
                </div>
              </div>
            </>
          )}

          {view === 'crop' && imageToCrop && (
            <div className={styles.altContent}>
              <div className={styles.cropContainer}>
                <Cropper
                  image={imageToCrop}
                  crop={crop}
                  zoom={zoom}
                  aspect={1}
                  cropShape="round"
                  showGrid={false}
                  onCropChange={setCrop}
                  onZoomChange={setZoom}
                  onCropComplete={handleCropComplete}
                />
              </div>
              <div className={styles.cropActions}>
                <button
                  type="button"
                  onClick={() => {
                    if (imageToCrop?.startsWith('blob:')) URL.revokeObjectURL(imageToCrop);
                    setImageToCrop(null);
                    setCroppedAreaPixels(null);
                    setView('main');
                  }}
                >
                  Cancel
                </button>
                <button type="button" onClick={handleSaveCrop} disabled={saving}>
                  {saving ? 'Saving…' : 'Accept'}
                </button>
              </div>
            </div>
          )}


          {view === 'browse' && (
            <div className={styles.browseContent}>
              <div className={styles.browseGrid}>
                {ZENFORMED_DEFAULT_AVATAR_SEEDS.map((seed) => (
                  <button
                    key={seed}
                    type="button"
                    className={styles.browseItem}
                    onClick={() => handleAvatarSelect(seed)}
                    disabled={saving}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={zenformedDefaultAvatarSrc(seed)} alt="" />
                  </button>
                ))}
              </div>
              <div className={styles.browseBackRow}>
                <button
                  type="button"
                  className={styles.optionCircleBtn}
                  onClick={() => setView('main')}
                  disabled={saving}
                >
                  <span className={styles.optionCircleIcon}>
                    <BackIcon />
                  </span>
                  <span className={styles.optionCircleLabel}>Back</span>
                </button>
              </div>
            </div>
          )}

          {error && <p className={styles.error} role="alert">{error}</p>}
        </div>
      </div>
    </div>
  );
}
