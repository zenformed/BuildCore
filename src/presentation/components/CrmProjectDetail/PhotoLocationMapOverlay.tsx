'use client';

import {
  AdvancedMarker,
  ColorScheme,
  Map,
  Pin,
  useMap,
} from '@vis.gl/react-google-maps';
import {
  useEffect,
  useState,
  type ReactElement,
} from 'react';
import { env } from '@/infrastructure/config/env';
import { CRM_MAP_SELECTION_ZOOM } from '@/presentation/features/crmMap';
import styles from './PhotoLocationMapOverlay.module.css';

export type PhotoLocationMapOverlayProps = {
  readonly open: boolean;
  readonly onClose: () => void;
  readonly latitude: number;
  readonly longitude: number;
  /** Accessible title for the dialog (e.g. photo file name). */
  readonly photoName?: string;
};

function resolveColorScheme(): (typeof ColorScheme)[keyof typeof ColorScheme] {
  if (typeof document === 'undefined') return ColorScheme.LIGHT;
  return document.documentElement.getAttribute('data-theme') === 'dark'
    ? ColorScheme.DARK
    : ColorScheme.LIGHT;
}

function MapCenterPin({
  latitude,
  longitude,
}: {
  readonly latitude: number;
  readonly longitude: number;
}): null {
  const map = useMap();
  useEffect(() => {
    if (!map) return;
    map.panTo({ lat: latitude, lng: longitude });
    map.setZoom(CRM_MAP_SELECTION_ZOOM);
  }, [latitude, longitude, map]);
  return null;
}

function PhotoLocationMapInner({
  latitude,
  longitude,
}: {
  readonly latitude: number;
  readonly longitude: number;
}): ReactElement {
  const [colorScheme, setColorScheme] = useState(resolveColorScheme);

  useEffect(() => {
    const observer = new MutationObserver(() => setColorScheme(resolveColorScheme()));
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['data-theme'],
    });
    return () => observer.disconnect();
  }, []);

  const position = { lat: latitude, lng: longitude };

  return (
    <Map
      className={styles.mapCanvas}
      defaultCenter={position}
      defaultZoom={CRM_MAP_SELECTION_ZOOM}
      mapId={env.googleMapsMapId}
      colorScheme={colorScheme}
      gestureHandling="greedy"
      disableDefaultUI={false}
      mapTypeControl={false}
      streetViewControl={false}
      fullscreenControl={false}
    >
      <MapCenterPin latitude={latitude} longitude={longitude} />
      <AdvancedMarker position={position} title="Photo location">
        <Pin background="#2563eb" borderColor="#1e3a8a" glyphColor="#ffffff" />
      </AdvancedMarker>
    </Map>
  );
}

/**
 * Full-screen map overlay for a single photo capture location.
 * Mounts above the shared gallery preview; closing restores the same photo.
 */
export function PhotoLocationMapOverlay({
  open,
  onClose,
  latitude,
  longitude,
  photoName,
}: PhotoLocationMapOverlayProps): ReactElement | null {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', onKey, true);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey, true);
      document.body.style.overflow = previousOverflow;
    };
  }, [onClose, open]);

  if (!open) return null;

  const apiKey = env.googleMapsApiKey;
  const title = photoName?.trim() || 'Photo location';

  return (
    <div
      className={styles.overlay}
      role="dialog"
      aria-modal="true"
      aria-label={title}
    >
      <button
        type="button"
        className={styles.closeBtn}
        onClick={onClose}
        aria-label="Close map"
        title="Close map"
      >
        ✕
      </button>
      <div className={styles.mapPane}>
        {!apiKey ? (
          <div className={styles.mapMissing}>
            Google Maps is not configured. Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to
            enable the map.
          </div>
        ) : (
          <PhotoLocationMapInner latitude={latitude} longitude={longitude} />
        )}
      </div>
    </div>
  );
}

/** True when both coordinates are finite numbers suitable for a map pin. */
export function hasValidPhotoCoordinates(
  latitude: number | null | undefined,
  longitude: number | null | undefined
): boolean {
  return (
    typeof latitude === 'number' &&
    typeof longitude === 'number' &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude) &&
    Math.abs(latitude) <= 90 &&
    Math.abs(longitude) <= 180
  );
}

export function formatPhotoCoordinates(
  latitude: number,
  longitude: number
): string {
  return `${latitude.toFixed(6)}, ${longitude.toFixed(6)}`;
}
