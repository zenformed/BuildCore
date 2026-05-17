import { NextResponse } from 'next/server';
import type { User } from '@supabase/supabase-js';
import { getSupabaseUserFromToken } from '@/infrastructure/supabase/supabaseServer';
import { createCrmSupabaseClient } from './createCrmSupabaseClient';
import { resolveCrmOrganizationId } from './resolveCrmOrganizationId';
import type { SupabaseClient } from '@supabase/supabase-js';

export type CrmApiAuthContext = {
  readonly authHeader: string;
  readonly user: User;
  readonly supabase: SupabaseClient;
  readonly organizationId: string;
};

export type CrmApiAuthResult =
  | { ok: true; context: CrmApiAuthContext }
  | { ok: false; response: NextResponse };

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

  const user = await getSupabaseUserFromToken(authHeader);
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
