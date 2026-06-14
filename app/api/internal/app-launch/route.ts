import { NextRequest, NextResponse } from 'next/server';
import { mintAppLaunch } from '@/infrastructure/coreApi/appLaunchClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import {
  isBuildCoreLaunchTargetApp,
} from '@/platform/appDefinitions/zenformedApps';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export const dynamic = 'force-dynamic';

/**
 * BFF: POST /api/internal/app-launch → ZenformedCore POST /auth/app-launch
 * Mints a one-time cross-app launch URL for outbound handoff (BuildCore → sibling apps).
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'App launch requires SaaS mode with real Supabase auth.',
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

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }
  if (body == null || typeof body !== 'object') {
    return NextResponse.json({ error: 'invalid_body', message: 'Expected JSON object' }, { status: 400 });
  }

  const record = body as Record<string, unknown>;
  const targetApp = record.targetApp;
  if (typeof targetApp !== 'string' || !isBuildCoreLaunchTargetApp(targetApp)) {
    return NextResponse.json({ error: 'invalid_target_app', message: 'Invalid target app.' }, { status: 400 });
  }

  const returnPath =
    typeof record.returnPath === 'string' && record.returnPath.trim() !== ''
      ? record.returnPath.trim()
      : '/dashboard';

  const result = await mintAppLaunch(raw, { targetApp, returnPath });
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401 || st === 403) {
        return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 400) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return NextResponse.json(upstream.json, { status: 400 });
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

  return NextResponse.json(
    {
      relay: 'zenformed_core',
      targetApp: result.data.targetApp,
      launchUrl: result.data.launchUrl,
      expiresAt: result.data.expiresAt,
      returnPath: result.data.returnPath,
    },
    { status: 201 }
  );
}
