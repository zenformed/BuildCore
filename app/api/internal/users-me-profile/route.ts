/**
 * GET /api/internal/users-me-profile — read profile via Core.
 * PATCH /api/internal/users-me-profile — partial profile updates (onboarding, password flag) via Core.
 *
 * Relays **`GET` / `PATCH /users/me/profile`** on ZenformedCore when **`ZENFORMED_CORE_API_URL`** is set.
 * **`profiles`** remain runtime authority; Core returns a sanitized DTO only.
 * When Core is unset or unreachable, the client may fall back to **temporary** direct
 * **`profiles`** reads/writes (see **`useSaaSProfile`**, **`useIndustryLabels`**, **`WelcomeOnboardingScreen`**, **`UpdatePasswordScreen`**).
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getMyProfile, patchMyProfile } from '@/infrastructure/coreApi/client';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import type { ZenformedCoreProfilePatchRequest } from '@/infrastructure/coreApi/types';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Profile relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const user = await getSupabaseUserFromToken(authHeader);
  if (!user || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const raw = authHeader.slice('Bearer '.length).trim();
  if (!raw) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return NextResponse.json({
      relay: 'client_supabase_deprecated',
      reason: 'core_unconfigured',
    });
  }

  const result = await getMyProfile(raw);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 404) {
        return NextResponse.json({ relay: 'zenformed_core', profile: null }, { status: 404 });
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
    profile: result.data.profile,
  });
}

export async function PATCH(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Profile relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const user = await getSupabaseUserFromToken(authHeader);
  if (!user || !authHeader?.startsWith('Bearer ')) {
    return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  }
  const raw = authHeader.slice('Bearer '.length).trim();
  if (!raw) {
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

  const result = await patchMyProfile(raw, patchBody as ZenformedCoreProfilePatchRequest);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 400 || st === 404 || st === 413) {
        return NextResponse.json(
          { relay: 'zenformed_core', error: 'profile_patch_rejected', detail: result.error },
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
    profile: result.data.profile,
  });
}
