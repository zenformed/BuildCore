import { NextRequest, NextResponse } from 'next/server';

import { fetchAuthoritativeMembershipContext } from '@/infrastructure/organization/organizationPermissionEnforcement';
import { coreUpstreamHttpResponsePayload } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { readBearer } from '../coreOrganizationRelay';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
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

  const result = await fetchAuthoritativeMembershipContext(raw);
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
