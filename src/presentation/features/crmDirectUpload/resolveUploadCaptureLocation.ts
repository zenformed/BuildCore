'use client';

import type { CrmDocumentLocationSource } from '@/domain/crm';

export type UploadCaptureSource = 'camera' | 'files';

export type ResolvedUploadCaptureLocation = {
  readonly latitude: number;
  readonly longitude: number;
  readonly locationAccuracyMeters: number | null;
  readonly locationSource: CrmDocumentLocationSource;
  readonly locationCapturedAt: string;
};

function isFiniteCoordinate(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isValidLatLng(latitude: number, longitude: number): boolean {
  return Math.abs(latitude) <= 90 && Math.abs(longitude) <= 180;
}

async function readExifGps(
  file: File
): Promise<{ latitude: number; longitude: number } | null> {
  const mime = (file.type || '').toLowerCase();
  const name = file.name.toLowerCase();
  const looksLikeImage =
    mime.startsWith('image/') ||
    /\.(jpe?g|tiff?|heic|heif|png|webp)$/i.test(name);
  if (!looksLikeImage) return null;

  try {
    const exifr = await import('exifr');
    const gps = await exifr.gps(file);
    if (gps == null) return null;
    const latitude = Number(gps.latitude);
    const longitude = Number(gps.longitude);
    if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
      return null;
    }
    if (!isValidLatLng(latitude, longitude)) return null;
    return { latitude, longitude };
  } catch {
    return null;
  }
}

function readDeviceGeolocation(): Promise<{
  latitude: number;
  longitude: number;
  accuracyMeters: number | null;
  capturedAt: string;
} | null> {
  if (typeof navigator === 'undefined' || navigator.geolocation == null) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    const timeoutId = window.setTimeout(() => resolve(null), 8_000);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        window.clearTimeout(timeoutId);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        if (!isFiniteCoordinate(latitude) || !isFiniteCoordinate(longitude)) {
          resolve(null);
          return;
        }
        if (!isValidLatLng(latitude, longitude)) {
          resolve(null);
          return;
        }
        const accuracy = position.coords.accuracy;
        resolve({
          latitude,
          longitude,
          accuracyMeters:
            typeof accuracy === 'number' && Number.isFinite(accuracy)
              ? accuracy
              : null,
          capturedAt: new Date(position.timestamp || Date.now()).toISOString(),
        });
      },
      () => {
        window.clearTimeout(timeoutId);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 7_000,
        maximumAge: 30_000,
      }
    );
  });
}

/**
 * Resolve capture location for a document upload.
 * Prefer device geolocation for camera captures; otherwise EXIF GPS when present.
 */
export async function resolveUploadCaptureLocation(
  file: File,
  captureSource: UploadCaptureSource = 'files'
): Promise<ResolvedUploadCaptureLocation | null> {
  if (captureSource === 'camera') {
    const device = await readDeviceGeolocation();
    if (device != null) {
      return {
        latitude: device.latitude,
        longitude: device.longitude,
        locationAccuracyMeters: device.accuracyMeters,
        locationSource: 'device_capture',
        locationCapturedAt: device.capturedAt,
      };
    }
  }

  const exif = await readExifGps(file);
  if (exif == null) return null;

  return {
    latitude: exif.latitude,
    longitude: exif.longitude,
    locationAccuracyMeters: null,
    locationSource: 'exif',
    locationCapturedAt: new Date().toISOString(),
  };
}

/**
 * Resolve locations for a batch. Camera capture requests device geolocation once.
 */
export async function resolveUploadCaptureLocations(
  files: readonly File[],
  captureSource: UploadCaptureSource = 'files'
): Promise<(ResolvedUploadCaptureLocation | null)[]> {
  if (files.length === 0) return [];

  if (captureSource === 'camera') {
    const device = await readDeviceGeolocation();
    const results: (ResolvedUploadCaptureLocation | null)[] = [];
    for (const file of files) {
      if (device != null) {
        results.push({
          latitude: device.latitude,
          longitude: device.longitude,
          locationAccuracyMeters: device.accuracyMeters,
          locationSource: 'device_capture',
          locationCapturedAt: device.capturedAt,
        });
        continue;
      }
      const exif = await readExifGps(file);
      results.push(
        exif == null
          ? null
          : {
              latitude: exif.latitude,
              longitude: exif.longitude,
              locationAccuracyMeters: null,
              locationSource: 'exif',
              locationCapturedAt: new Date().toISOString(),
            }
      );
    }
    return results;
  }

  return Promise.all(files.map((file) => resolveUploadCaptureLocation(file, 'files')));
}
