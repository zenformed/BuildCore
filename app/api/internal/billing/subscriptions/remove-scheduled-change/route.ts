import { NextRequest, NextResponse } from 'next/server';
import { removeScheduledPlanChangeOnCore } from '@/infrastructure/coreApi/subscriptionRemoveScheduledChangeClient';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';

export const dynamic = 'force-dynamic';

function readProductSlug(body: unknown): string | null {
  if (body == null || typeof body !== 'object') return null;
  const raw = (body as Record<string, unknown>).productSlug;
  if (typeof raw !== 'string' || raw.trim() === '') return null;
  return raw.trim().toLowerCase();
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json(
      {
        error: 'bad_request',
        message: 'Removing scheduled plan changes requires SaaS mode with real Supabase auth.',
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
    return NextResponse.json(
      {
        relay: 'client_supabase_deprecated',
        reason: 'core_unconfigured',
      },
      { status: 503 }
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_body', message: 'JSON body required' }, { status: 400 });
  }

  const productSlug = readProductSlug(body);
  if (productSlug == null) {
    return NextResponse.json(
      { error: 'invalid_body', message: 'productSlug is required.' },
      { status: 400 }
    );
  }

  const result = await removeScheduledPlanChangeOnCore(raw, productSlug);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return NextResponse.json(upstream.json, { status: upstream.status });
      }
      return NextResponse.json(result.error.body ?? { error: 'remove_scheduled_change_failed' }, {
        status: result.error.status,
      });
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
    productSlug: result.data.productSlug,
    entitlement: result.data.entitlement,
  });
}
