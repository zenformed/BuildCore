import { NextRequest, NextResponse } from 'next/server';
import {
  buildCoreLaunchTargetApp,
  exchangeAppLaunchCode,
} from '@/infrastructure/coreApi/appLaunchClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';

export const dynamic = 'force-dynamic';

function redactLaunchCode(value: string): string {
  const trimmed = value.trim();
  if (trimmed.length <= 8) return '[redacted]';
  return `${trimmed.slice(0, 4)}…[redacted]`;
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'App launch exchange requires SaaS mode with real Supabase auth.',
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
  const code = typeof record.code === 'string' ? record.code.trim() : '';
  const targetApp = record.targetApp;

  if (!code) {
    return NextResponse.json({ error: 'invalid_body', message: 'code is required' }, { status: 400 });
  }
  if (targetApp !== buildCoreLaunchTargetApp) {
    return NextResponse.json({ error: 'invalid_target_app', message: 'Invalid target app.' }, { status: 400 });
  }

  const result = await exchangeAppLaunchCode({ code, targetApp: buildCoreLaunchTargetApp });
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 404) {
        return NextResponse.json(
          { error: 'launch_code_invalid', message: 'Launch code is invalid.' },
          { status: 404 }
        );
      }
      if (st === 410) {
        return NextResponse.json(
          { error: 'launch_code_expired', message: 'Launch code has expired.' },
          { status: 410 }
        );
      }
      if (st === 409) {
        return NextResponse.json(
          { error: 'launch_code_used', message: 'Launch code has already been used.' },
          { status: 409 }
        );
      }
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
    }
    console.error(
      JSON.stringify({
        buildCoreAppLaunchExchange: 'failed',
        targetApp: buildCoreLaunchTargetApp,
        code: redactLaunchCode(code),
      })
    );
    return NextResponse.json(
      {
        relay: 'error',
        error: 'zenformed_core_unreachable',
        detail: result.error.kind === 'network' ? { kind: 'network' } : { kind: result.error.kind },
      },
      { status: 502 }
    );
  }

  return NextResponse.json({
    relay: 'zenformed_core',
    targetApp: result.data.targetApp,
    returnPath: result.data.returnPath,
    session: result.data.session,
  });
}
