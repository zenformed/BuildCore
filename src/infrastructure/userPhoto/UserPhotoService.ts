/**
 * Server-side user photo storage (local fallback when Core avatars are not configured).
 * Saves to data/user-photos/{emailHash}.png
 *
 * SaaS with `ZENFORMED_CORE_API_URL` uses ZenformedCore `users/me/avatar` instead — see
 * `userPhotoAuthority.ts` and `userAvatarClient.ts`.
 * Only import from server code (API routes).
 */

import { createHash } from 'crypto';
import { mkdir, readFile, unlink, writeFile } from 'fs/promises';
import path from 'path';
import { getDataDir } from '@/infrastructure/dataPath';

const USER_PHOTOS_DIR = () => path.join(getDataDir(), 'user-photos');

function emailToFilename(email: string): string {
  const normalized = email.trim().toLowerCase();
  const hash = createHash('sha256').update(normalized).digest('hex').slice(0, 32);
  return `${hash}.png`;
}

function getPhotoPath(email: string): string {
  return path.join(USER_PHOTOS_DIR(), emailToFilename(email));
}

async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

/**
 * Save user photo. Overwrites existing.
 */
export async function saveUserPhoto(email: string, buffer: Buffer): Promise<void> {
  await ensureDir(USER_PHOTOS_DIR());
  await writeFile(getPhotoPath(email), buffer);
}

/**
 * Check if user has a custom photo.
 */
export async function hasUserPhoto(email: string): Promise<boolean> {
  try {
    await readFile(getPhotoPath(email));
    return true;
  } catch {
    return false;
  }
}

/**
 * Read photo buffer. Returns null if none.
 */
export async function getUserPhotoBuffer(email: string): Promise<Buffer | null> {
  try {
    return await readFile(getPhotoPath(email));
  } catch {
    return null;
  }
}

/**
 * Remove user photo.
 */
export async function deleteUserPhoto(email: string): Promise<boolean> {
  try {
    await unlink(getPhotoPath(email));
    return true;
  } catch {
    return false;
  }
}

// ---------- Staff member photos (keyed by staff_members.id) ----------
const STAFF_PHOTOS_DIR = () => path.join(getDataDir(), 'staff-photos');

function getStaffPhotoPath(staffMemberId: string): string {
  const safe = staffMemberId.replace(/[^a-zA-Z0-9-]/g, '');
  return path.join(STAFF_PHOTOS_DIR(), `${safe}.png`);
}

export async function saveStaffPhoto(staffMemberId: string, buffer: Buffer): Promise<void> {
  await ensureDir(STAFF_PHOTOS_DIR());
  await writeFile(getStaffPhotoPath(staffMemberId), buffer);
}

export async function hasStaffPhoto(staffMemberId: string): Promise<boolean> {
  try {
    await readFile(getStaffPhotoPath(staffMemberId));
    return true;
  } catch {
    return false;
  }
}

export async function getStaffPhotoBuffer(staffMemberId: string): Promise<Buffer | null> {
  try {
    return await readFile(getStaffPhotoPath(staffMemberId));
  } catch {
    return null;
  }
}

export async function deleteStaffPhoto(staffMemberId: string): Promise<boolean> {
  try {
    await unlink(getStaffPhotoPath(staffMemberId));
    return true;
  } catch {
    return false;
  }
}
