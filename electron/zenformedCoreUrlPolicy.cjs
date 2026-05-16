'use strict';

/**
 * Keep behavior aligned with `src/infrastructure/config/zenformedCoreUrlPolicy.ts`
 * (Electron main cannot import that module without a bundler step).
 */
function resolveZenformedCoreApiBaseUrl(raw) {
  const v = (raw || '').trim();
  if (!v) return '';
  const normalized = v.replace(/\/+$/, '');
  let u;
  try {
    u = new URL(normalized);
  } catch {
    return normalized;
  }
  if (u.protocol !== 'http:') return normalized;
  const h = u.hostname;
  const local = h === 'localhost' || h === '127.0.0.1' || h === '[::1]' || h === '::1';
  if (local) return normalized;
  if (process.env.NODE_ENV === 'production') {
    console.warn(
      '[BuildCore Electron] ZENFORMED_CORE_API_URL ignored: production requires https:// for remote ZenformedCore; http:// allowed only for localhost, 127.0.0.1, and ::1.'
    );
    return '';
  }
  return normalized;
}

module.exports = { resolveZenformedCoreApiBaseUrl };
