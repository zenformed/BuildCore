export type CoreRelayBody = {
  readonly relay?: string;
  readonly error?: string;
};

export function parseCoreRelayBody(body: unknown): CoreRelayBody {
  if (body == null || typeof body !== 'object') return {};
  const record = body as Record<string, unknown>;
  return {
    relay: typeof record.relay === 'string' ? record.relay : undefined,
    error: typeof record.error === 'string' ? record.error : undefined,
  };
}

/** Core BFF is not configured (mock / missing ZENFORMED_CORE_API_URL). */
export function isCoreRelayUnconfigured(body: CoreRelayBody): boolean {
  return body.relay === 'client_supabase_deprecated';
}

/** ZenformedCore was expected but the BFF could not reach it. */
export function isCoreRelayUnreachable(
  response: Pick<Response, 'status'>,
  body: CoreRelayBody
): boolean {
  if (isCoreRelayUnconfigured(body)) return false;
  if (body.error === 'zenformed_core_unreachable') return true;
  if (body.error === 'branding_unavailable') return true;
  if (response.status === 502) return true;
  return false;
}

export function isCoreRelaySuccess(body: CoreRelayBody): boolean {
  return body.relay === 'zenformed_core';
}
