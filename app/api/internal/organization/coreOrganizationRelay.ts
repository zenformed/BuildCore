import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export function readBearer(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const raw = authHeader.slice('Bearer '.length).trim();
  return raw || null;
}

export async function relayOrganizationGet<T extends Record<string, unknown>>(
  request: NextRequest,
  fetchCore: (token: string) => Promise<CoreApiResult<T>>
): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Organization relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const raw = readBearer(request);
  const user = await getSupabaseUserFromToken(request.headers.get('Authorization'));
  if (!user || !raw) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json({
      relay: 'client_supabase_deprecated',
      reason: 'core_unconfigured',
    });
  }

  const result = await fetchCore(raw);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 404) {
        return NextResponse.json({ relay: 'zenformed_core', error: 'organization_not_found' }, { status: 404 });
      }
      if (st === 502 || st === 503) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: upstream.status });
        }
      }
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
    }
    return NextResponse.json(
      {
        relay: 'error',
        error: 'zenformed_core_unreachable',
        detail: result.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    relay: 'zenformed_core',
    ...result.data,
  });
}
