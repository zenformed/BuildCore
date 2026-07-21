import { env } from '@/infrastructure/config/env';
import { getSession } from '@/infrastructure/supabase/supabaseClient';

export async function deleteCrmOrganizationPhotos(
  documentIds: readonly string[]
): Promise<{ readonly deletedCount: number; readonly failedCount: number }> {
  const session = await getSession();
  const token = session?.access_token;
  if (env.isSaasMode && !token) throw new Error('You must be signed in.');
  const response = await fetch('/api/crm/photos', {
    method: 'DELETE',
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ documentIds: [...documentIds] }),
  });
  const body = (await response.json()) as {
    deletedCount?: number;
    failedCount?: number;
    message?: string;
  };
  if (!response.ok) throw new Error(body.message ?? 'Could not delete photos.');
  return {
    deletedCount: body.deletedCount ?? 0,
    failedCount: body.failedCount ?? 0,
  };
}
