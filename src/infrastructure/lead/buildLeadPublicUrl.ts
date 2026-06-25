import { joinBuildCorePublicAppUrl } from '@/infrastructure/config/buildCorePublicAppUrl';
import { env } from '@/infrastructure/config/env';

export const LEAD_PUBLIC_PATH_PREFIX = '/lead';

export function buildLeadPublicPath(leadToken: string): string {
  const token = leadToken.trim();
  if (!token) {
    throw new Error('Lead token is required.');
  }
  return `${LEAD_PUBLIC_PATH_PREFIX}/${encodeURIComponent(token)}`;
}

/** Builds the absolute public lead URL for QR codes and copy-link actions. */
export function buildLeadPublicUrl(leadToken: string): string {
  const path = buildLeadPublicPath(leadToken);
  if (typeof window !== 'undefined') {
    const base = env.appUrl.replace(/\/+$/, '');
    return `${base}${path}`;
  }
  return joinBuildCorePublicAppUrl(path);
}
