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

export async function relayOrganizationPublicGet<T extends Record<string, unknown>>(
  fetchCore: () => Promise<CoreApiResult<T>>
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

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json({
      relay: 'client_supabase_deprecated',
      reason: 'core_unconfigured',
    });
  }

  const result = await fetchCore();
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
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
      if (st === 401) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 403) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: 403 });
        }
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
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

export async function relayOrganizationMutate<T extends Record<string, unknown>>(
  request: NextRequest,
  mutateCore: (token: string) => Promise<CoreApiResult<T>>,
  options?: { rejectedError?: string; successStatus?: number }
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

  const result = await mutateCore(raw);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 403) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: 403 });
        }
        return NextResponse.json({ error: 'forbidden' }, { status: 403 });
      }
      if (st === 404) {
        return NextResponse.json({ relay: 'zenformed_core', error: 'organization_not_found' }, { status: 404 });
      }
      if (st === 400 || st === 409 || st === 413) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: upstream.status });
        }
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
        error: options?.rejectedError ?? 'zenformed_core_unreachable',
        detail: result.error,
      },
      { status: 502 }
    );
  }

  return NextResponse.json(
    {
      relay: 'zenformed_core',
      ...result.data,
    },
    { status: options?.successStatus ?? 200 }
  );
}
