import { runInFlight } from '@/infrastructure/coreApi/clientRequestDedupe';

const blobByKey = new Map<string, string>();
const absentKeys = new Set<string>();

/** Undefined = not loaded yet; null = known absent. */
export function peekSessionBlobUrl(cacheKey: string): string | null | undefined {
  if (absentKeys.has(cacheKey)) return null;
  if (blobByKey.has(cacheKey)) return blobByKey.get(cacheKey) ?? null;
  return undefined;
}

export function invalidateSessionBlob(cacheKey: string): void {
  const existing = blobByKey.get(cacheKey);
  if (existing) URL.revokeObjectURL(existing);
  blobByKey.delete(cacheKey);
  absentKeys.delete(cacheKey);
}

export function seedSessionBlob(cacheKey: string, blob: Blob): string {
  const existing = blobByKey.get(cacheKey);
  if (existing) URL.revokeObjectURL(existing);
  const url = URL.createObjectURL(blob);
  blobByKey.set(cacheKey, url);
  absentKeys.delete(cacheKey);
  return url;
}

export async function loadSessionBlob(
  cacheKey: string,
  fetchBlob: () => Promise<Blob | null>
): Promise<string | null> {
  const peek = peekSessionBlobUrl(cacheKey);
  if (peek !== undefined) return peek;

  return runInFlight(`blob:${cacheKey}`, async () => {
    const cached = peekSessionBlobUrl(cacheKey);
    if (cached !== undefined) return cached;

    try {
      const blob = await fetchBlob();
      if (!blob) {
        absentKeys.add(cacheKey);
        return null;
      }
      const url = URL.createObjectURL(blob);
      blobByKey.set(cacheKey, url);
      return url;
    } catch {
      return null;
    }
  });
}

export function avatarApiPathCacheKey(apiPath: string): string {
  try {
    const parsed = new URL(apiPath, 'http://local');
    if (apiPath.startsWith('/api/auth/avatar')) {
      return `auth-avatar:self:${parsed.searchParams.get('t') ?? '0'}`;
    }
    const userId = parsed.searchParams.get('userId') ?? '';
    const token = parsed.searchParams.get('t') ?? '';
    return `user-avatar:${userId}:${token}`;
  } catch {
    return apiPath;
  }
}

export function projectPhotoApiPathCacheKey(apiPath: string): string {
  try {
    const parsed = new URL(apiPath, 'http://local');
    return `project-photo:${parsed.searchParams.get('t') ?? apiPath}`;
  } catch {
    return apiPath;
  }
}

export function brandingLogoCacheKey(userId: string | null, version: number): string {
  return `branding-logo:${userId ?? 'anonymous'}:${version}`;
}
