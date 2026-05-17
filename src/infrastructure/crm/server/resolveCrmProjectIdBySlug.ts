import type { SupabaseClient } from '@supabase/supabase-js';

/** Resolve a project UUID from its slug within an organization (active projects only). */
export async function resolveCrmProjectIdBySlug(
  supabase: SupabaseClient,
  organizationId: string,
  slug: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('crm_projects')
    .select('id')
    .eq('organization_id', organizationId)
    .eq('slug', slug)
    .is('archived_at', null)
    .maybeSingle();

  if (error) throw new Error(error.message);
  return data?.id ?? null;
}
