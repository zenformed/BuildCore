/**
 * Extract Bearer access token from an incoming API request.
 */

export function readRequestBearerToken(request: Request): string | null {
  const auth = request.headers.get('Authorization');
  if (auth == null || !auth.toLowerCase().startsWith('bearer ')) {
    return null;
  }
  const token = auth.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
