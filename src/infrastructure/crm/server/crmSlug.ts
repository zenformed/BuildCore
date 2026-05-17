export function slugifyProjectName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return base.length > 0 ? base : 'project';
}

export async function ensureUniqueProjectSlug(
  supabase: import('@supabase/supabase-js').SupabaseClient,
  organizationId: string,
  baseSlug: string
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 2;

  while (true) {
    const { data } = await supabase
      .from('crm_projects')
      .select('id')
      .eq('organization_id', organizationId)
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
    candidate = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}
