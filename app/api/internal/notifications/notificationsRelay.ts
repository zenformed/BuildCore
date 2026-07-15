import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import {
  coreUpstreamHttpResponsePayload,
  ORGANIZATION_WORKSPACE_NO_STORE_HEADERS,
} from '@/infrastructure/coreApi/zenformedCoreRelayHttp';
import type { CoreApiResult } from '@/infrastructure/coreApi/types';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { fetchAuthoritativeMembershipContext } from '@/infrastructure/organization/organizationPermissionEnforcement';
import { readBearer } from '../organization/coreOrganizationRelay';

function relayJson(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, {
    ...init,
    headers: {
      ...ORGANIZATION_WORKSPACE_NO_STORE_HEADERS,
      ...(init?.headers ?? {}),
    },
  });
}

/**
 * Authenticated BuildCore → ZenformedCore notification consumer relay.
 * Active organization comes from membership context (not browser-supplied org ids).
 */
export async function relayNotifications(
  request: NextRequest,
  callCore: (
    accessToken: string,
    organizationId: string
  ) => Promise<CoreApiResult<Record<string, unknown>>>,
  options?: { successStatus?: number }
): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return relayJson(
      {
        error: 'bad_request',
        message: 'Notification relay requires SaaS mode with real Supabase auth.',
      },
      { status: 400 }
    );
  }

  if (runtimeModes.isDemoRuntime()) {
    return relayJson(
      {
        error: 'bad_request',
        message: 'Notifications are not available in demo mode.',
      },
      { status: 400 }
    );
  }

  const raw = readBearer(request);
  const user = await getSupabaseUserFromToken(request.headers.get('Authorization'));
  if (!user || !raw) {
    return relayJson({ error: 'unauthenticated' }, { status: 401 });
  }

  if (env.zenformedCoreApiBaseUrl == null) {
    return relayJson(
      {
        relay: 'error',
        error: 'core_unconfigured',
        message: 'ZenformedCore is not configured.',
      },
      { status: 503 }
    );
  }

  const membership = await fetchAuthoritativeMembershipContext(raw);
  if (!membership.ok) {
    if (membership.error.kind === 'http_error') {
      const st = membership.error.status;
      if (st === 401) {
        return relayJson({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 403) {
        return relayJson(
          { error: 'forbidden', message: 'You are not an active member of this organization.' },
          { status: 403 }
        );
      }
      const upstream = coreUpstreamHttpResponsePayload(membership.error);
      if (upstream != null) {
        return relayJson(upstream.json, { status: upstream.status });
      }
    }
    return relayJson(
      {
        relay: 'error',
        error: 'zenformed_core_unreachable',
        detail: membership.error,
      },
      { status: 502 }
    );
  }

  const organizationId = membership.data.organizationId?.trim() ?? '';
  if (!membership.data.hasActiveMembership || !organizationId) {
    return relayJson(
      {
        error: 'forbidden',
        message: 'You are not an active member of this organization.',
      },
      { status: 403 }
    );
  }

  const result = await callCore(raw, organizationId);
  if (!result.ok) {
    if (result.error.kind === 'http_error') {
      const st = result.error.status;
      if (st === 401) {
        return relayJson({ error: 'unauthenticated' }, { status: 401 });
      }
      if (st === 403) {
        const upstream = coreUpstreamHttpResponsePayload(result.error);
        if (upstream != null) {
          return relayJson(upstream.json, { status: 403 });
        }
        return relayJson(
          { error: 'forbidden', message: 'You are not an active member of this organization.' },
          { status: 403 }
        );
      }
      if (st === 404) {
        const body =
          result.error.body != null &&
          typeof result.error.body === 'object' &&
          !Array.isArray(result.error.body)
            ? (result.error.body as Record<string, unknown>)
            : { error: 'not_found' };
        return relayJson({ relay: 'zenformed_core', ...body }, { status: 404 });
      }
      if (st === 400 || st === 409) {
        const body =
          result.error.body != null &&
          typeof result.error.body === 'object' &&
          !Array.isArray(result.error.body)
            ? (result.error.body as Record<string, unknown>)
            : { error: 'invalid_request' };
        return relayJson({ relay: 'zenformed_core', ...body }, { status: st });
      }
      const upstream = coreUpstreamHttpResponsePayload(result.error);
      if (upstream != null) {
        return relayJson(upstream.json, { status: upstream.status });
      }
      const body =
        result.error.body != null &&
        typeof result.error.body === 'object' &&
        !Array.isArray(result.error.body)
          ? (result.error.body as Record<string, unknown>)
          : { error: 'zenformed_core_upstream' };
      return relayJson({ relay: 'zenformed_core', ...body }, { status: st });
    }
    return relayJson(
      {
        relay: 'error',
        error: 'zenformed_core_unreachable',
        detail: result.error,
      },
      { status: 502 }
    );
  }

  return relayJson(
    {
      relay: 'zenformed_core',
      ...result.data,
    },
    { status: options?.successStatus ?? 200 }
  );
}

export function readOptionalQueryParam(request: NextRequest, name: string): string | null {
  const value = request.nextUrl.searchParams.get(name);
  if (value == null) return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}
