/**
 * CD Key activation: validate key in valid_keys, mark used, set profile subscription_status to 'active'.
 * Uses Supabase RPC activate_license (SECURITY DEFINER) so valid_keys is not exposed to client.
 */
import { getSupabaseClient } from './supabaseClient';

export type ActivateLicenseResult =
  | { success: true }
  | { success: false; error: string };

export async function activateLicense(key: string): Promise<ActivateLicenseResult> {
  const trimmed = key?.trim();
  if (!trimmed) return { success: false, error: 'Key is required' };

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.rpc('activate_license', {
    key_input: trimmed,
  });

  if (error) return { success: false, error: error.message };
  const result = data as { success?: boolean; error?: string } | null;
  if (!result) return { success: false, error: 'No response' };
  if (result.success) return { success: true };
  return { success: false, error: result.error ?? 'Invalid or already used key' };
}
