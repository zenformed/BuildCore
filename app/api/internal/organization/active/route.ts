import { NextRequest, NextResponse } from 'next/server';
import { env } from '@/infrastructure/config/env';
import { runtimeModes } from '@/infrastructure/config/runtimeModes';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { readBearer } from '../coreOrganizationRelay';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

async function relay(request: NextRequest, method: 'GET' | 'PATCH'): Promise<NextResponse> {
  if (!runtimeModes.isSaasMode() || runtimeModes.useMockAuth()) {
    return NextResponse.json({ error: 'bad_request' }, { status: 400 });
  }
  const token = readBearer(request);
  const user = await getSupabaseUserFromToken(request.headers.get('Authorization'));
  if (!token || !user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
  const base = env.zenformedCoreApiBaseUrl?.replace(/\/+$/, '');
  if (!base) return NextResponse.json({ error: 'core_unconfigured' }, { status: 503 });

  const body = method === 'PATCH' ? await request.text() : undefined;
  const response = await fetch(`${base}/organizations/me/active`, {
    method,
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
      Authorization: `Bearer ${token}`,
      ...(method === 'PATCH' ? { 'Content-Type': 'application/json' } : {}),
    },
    body,
  });
  const payload = await response.json().catch(() => ({ error: 'invalid_core_response' }));
  return NextResponse.json(payload, {
    status: response.status,
    headers: { 'Cache-Control': 'private, no-store' },
  });
}

export function GET(request: NextRequest): Promise<NextResponse> {
  return relay(request, 'GET');
}

export function PATCH(request: NextRequest): Promise<NextResponse> {
  return relay(request, 'PATCH');
}
