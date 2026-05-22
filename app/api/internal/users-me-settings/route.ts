/**
 * GET /api/internal/users-me-settings — read account + notification preferences via Core.
 * PATCH /api/internal/users-me-settings — partial updates via Core.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getMySettings, patchMySettings } from '@/infrastructure/coreApi/client';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import type { ZenformedCoreUserSettingsPatchRequest } from '@/infrastructure/coreApi/types';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export const dynamic = 'force-dynamic';

function readBearer(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader?.startsWith('Bearer ')) return null;
  const raw = authHeader.slice('Bearer '.length).trim();
  return raw || null;
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Settings relay requires SaaS mode with real Supabase auth.',
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

  const result = await getMySettings(raw);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 404) {
        return NextResponse.json({ relay: 'zenformed_core', settings: null }, { status: 404 });
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
    settings: result.data.settings,
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Settings relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const raw = readBearer(request);
  const user = await getSupabaseUserFromToken(request.headers.get('Authorization'));
  if (!user || !raw) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  let patchBody: unknown;
  try {
    patchBody = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }
  if (patchBody == null || typeof patchBody !== 'object') {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected JSON object' }, { status: 400 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json({
      relay: 'client_supabase_deprecated',
      reason: 'core_unconfigured',
    });
  }

  const result = await patchMySettings(raw, patchBody as ZenformedCoreUserSettingsPatchRequest);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 400 || st === 404 || st === 413) {
        return NextResponse.json(
          { relay: 'zenformed_core', error: 'settings_patch_rejected', detail: result.error },
          { status: st }
        );
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
    settings: result.data.settings,
  });
}
