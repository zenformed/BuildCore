/**
 * Stable, isomorphic fingerprint encoding (not a security boundary).
 * Cursor integrity is enforced by HMAC/JWS in the server codec.
 */

export function encodeCrmProjectsListV2FingerprintCanonical(canonicalJson: string): string {
  const bytes = new TextEncoder().encode(canonicalJson);
  let binary = '';
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof btoa === 'function') {
    return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
  }
  return Buffer.from(canonicalJson, 'utf8').toString('base64url');
}
