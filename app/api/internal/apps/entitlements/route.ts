import { NextRequest, NextResponse } from 'next/server';
import { inactiveAppEntitlementSnapshot, type SaaSEntitlementSnapshot } from '@zenformed/core';
import { ORGANIZATION_WORKSPACE_NO_STORE_HEADERS } from '@/infrastructure/coreApi/zenformedCoreRelayHttp';import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { env } from '@/infrastructure/config/env';
import { fetchCoreAppEntitlementSnapshot } from '@/infrastructure/coreApi/coreAppEntitlementRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

function entitlementsJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...ORGANIZATION_WORKSPACE_NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

const BUILD_CORE_SUITE_APP_SLUGS = ['buildcore', 'forgecore', 'formcore', 'analyticscore'] as const;

export async function GET(request: NextRequest): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return entitlementsJson(
      {
        error: 'bad_request',
        message: 'Entitlement resolution requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  const authHeader = request.headers.get('Authorization');
  const user = await getSupabaseUserFromToken(authHeader);
  if (!user || !authHeader?.startsWith('Bearer ')) {
    return entitlementsJson({ error: 'unauthenticated' }, { status: 401 });
  }
  const raw = authHeader.slice('Bearer '.length).trim();
  if (!raw) {
    return entitlementsJson({ error: 'unauthenticated' }, { status: 401 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return entitlementsJson(
      {
        error: 'server_misconfigured',
        message: 'ZENFORMED_CORE_API_URL is required for entitlement resolution.',
      },
      { status: 503 }
    );
  }

  const entitlements: Partial<Record<(typeof BUILD_CORE_SUITE_APP_SLUGS)[number], SaaSEntitlementSnapshot>> =
    {};
  let hadUnreachable = false;

  await Promise.all(
    BUILD_CORE_SUITE_APP_SLUGS.map(async (appSlug) => {      const result = await fetchCoreAppEntitlementSnapshot(appSlug, raw);
      if (result.ok) {
        entitlements[appSlug] = result.snapshot;
        return;
      }
      if (result.kind === 'unauthenticated') {
        return;
      }
      if (result.kind === 'unreachable') {
        hadUnreachable = true;
      }
      entitlements[appSlug] = inactiveAppEntitlementSnapshot(appSlug);
    })
  );

  if (hadUnreachable && Object.keys(entitlements).length === 0) {
    return entitlementsJson(
      {
        error: 'zenformed_core_unreachable',
        message: 'Could not load app entitlements from ZenformedCore.',
      },
      { status: 502 }
    );
  }

  return entitlementsJson({
    relay: 'zenformed_core',
    entitlements,
  });
}
