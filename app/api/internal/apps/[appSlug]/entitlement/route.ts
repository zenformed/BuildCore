/**
 * GET /api/internal/apps/:appSlug/entitlement
 *
 * Relays **`GET /apps/:appSlug/entitlement`** on ZenformedCore when **`ZENFORMED_CORE_API_URL`** is set.
 */

import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getAppEntitlement, type GetAppEntitlementOptions } from '@/infrastructure/coreApi/client';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET(
  request: NextRequest,
  context: { params: { appSlug: string } }
): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Entitlement relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const { appSlug } = context.params;
  if (typeof appSlug !== 'string' || appSlug.trim() === '') {
    return NextResponse.json({ error: 'bad_request', message: 'Missing appSlug.' }, { status: 400 });
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

  const authorityRaw = request.nextUrl.searchParams.get('authority_mode')?.trim().toLowerCase() ?? '';
  const authorityMode: GetAppEntitlementOptions['authorityMode'] | undefined =
    authorityRaw === 'platform' || authorityRaw === 'dual_read_legacy_authoritative' ? authorityRaw : undefined;

  const result = await getAppEntitlement(
    appSlug,
    raw,
    authorityMode != null ? { authorityMode } : undefined
  );
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 404) {
        let coreError: string | undefined;
        if (result.error.body != null && typeof result.error.body === 'object') {
          const o = result.error.body as Record<string, unknown>;
          if (typeof o.error === 'string') coreError = o.error;
        }
        return NextResponse.json(
          {
            relay: 'zenformed_core',
            appSlug,
            entitlement: null,
            error: coreError ?? 'not_found',
          },
          { status: 404 }
        );
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
