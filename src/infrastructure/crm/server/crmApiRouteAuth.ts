import { NextResponse } from 'next/server';
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import { crmSupabaseNoStoreFetch } from '@/infrastructure/crm/server/crmSupabaseFetch';
import { createCrmSupabaseClient } from './createCrmSupabaseClient';
import { resolveCrmOrganizationId } from './resolveCrmOrganizationId';

export type CrmApiAuthContext = {
  readonly authHeader: string;
  readonly user: User;
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
};

export type CrmApiAuthResult =
  | { ok: true; context: CrmApiAuthContext }
  | { ok: false; response: NextResponse };

function getEnv(): { url: string; key: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return { url, key };
}

async function getCrmApiUserFromToken(bearerToken: string | null): Promise<User | null> {
  const env = getEnv();
  if (!env) return null;
  if (!bearerToken?.startsWith('Bearer ')) return null;
  const token = bearerToken.slice(7).trim();
  if (!token) return null;

  const supabase = createClient(env.url, env.key, {
    global: { fetch: crmSupabaseNoStoreFetch },
  });
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

function unauthenticated(): NextResponse {
  return NextResponse.json({ error: 'unauthenticated' }, { status: 401 });
}

function misconfigured(): NextResponse {
  return NextResponse.json(
    { error: 'misconfigured', message: 'Supabase is not configured for CRM API.' },
    { status: 503 }
  );
}

function noOrganization(): NextResponse {
  return NextResponse.json(
    { error: 'forbidden', message: 'No active organization membership for CRM access.' },
    { status: 403 }
  );
}

export async function requireCrmApiAuth(authHeader: string | null): Promise<CrmApiAuthResult> {
  if (!authHeader?.startsWith('Bearer ')) {
    return { ok: false, response: unauthenticated() };
  }

  const user = await getCrmApiUserFromToken(authHeader);
  if (!user) {
    return { ok: false, response: unauthenticated() };
  }

  const supabase = createCrmSupabaseClient(authHeader);
  if (!supabase) {
    return { ok: false, response: misconfigured() };
  }

  const preferredOrgId =
    typeof user.app_metadata?.tenant_id === 'string' ? user.app_metadata.tenant_id : null;

  const organizationId = await resolveCrmOrganizationId(supabase, user.id, preferredOrgId);
  if (!organizationId) {
    return { ok: false, response: noOrganization() };
  }

  return {
    ok: true,
    context: { authHeader, user, supabase, organizationId },
  };
}
