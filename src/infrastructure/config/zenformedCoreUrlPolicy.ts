/**
 * ZenformedCore base URL policy (ForgeCore server + Electron).
 *
 * Production must not call a remote ZenformedCore over cleartext HTTP. Local dev may use
 * `http://localhost`, `http://127.0.0.1`, or `http://[::1]` / `http://::1` only.
 */

let warnedInsecureZenformedCoreUrl = false;

const LOCAL_HTTP_HOSTNAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

function isLocalHttpDevUrl(hostname: string): boolean {
  return LOCAL_HTTP_HOSTNAMES.has(hostname);
}

/**
 * Normalize optional `ZENFORMED_CORE_API_URL` for runtime use.
 *
 * @returns trimmed base URL without trailing slashes, or `null` when unset, empty, or rejected by policy.
 */
export function resolveZenformedCoreApiBaseUrl(raw: string | undefined): string | null {
  const v = raw?.trim();
  if (!v) return null;
  const normalized = v.replace(/\/+$/, '');

  let parsed: URL;
  try {
    parsed = new URL(normalized);
  } catch {
    // Preserve prior behavior for non-URL strings (call sites may still fail at fetch).
    return normalized;
  }

  if (parsed.protocol !== 'http:') {
    return normalized;
  }

  if (isLocalHttpDevUrl(parsed.hostname)) {
    return normalized;
  }

  if (process.env.NODE_ENV === 'production') {
    if (!warnedInsecureZenformedCoreUrl) {
      warnedInsecureZenformedCoreUrl = true;
      console.warn(
        '[BuildCore] ZENFORMED_CORE_API_URL ignored: in production, use https:// for remote ZenformedCore. ' +
          'http:// is allowed only for localhost, 127.0.0.1, and ::1.'
      );
    }
    return null;
  }

  return normalized;
}
