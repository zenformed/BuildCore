import type { User } from '@/domain/entities/User';
import type { TenantId } from '@/domain/value-objects/TenantId';
import { createTenantId } from '@/domain/value-objects/TenantId';
import type { IAuthService, SignInResult } from '@/application/ports/IAuthService';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { getSupabaseClient } from '@/infrastructure/supabase/supabaseClient';

/**
 * Supabase user app_metadata shape for tenant association.
 * @expandable Add role, permissions, or multiple tenant IDs.
 */
interface AppMetadata {
  tenant_id?: string;
}

function mapSupabaseUserToDomain(su: SupabaseUser): User {
  const meta = (su.app_metadata ?? {}) as AppMetadata;
  const tenantId = meta.tenant_id ?? su.id; // fallback for single-tenant or dev
  return {
    id: su.id,
    email: su.email ?? '',
    tenantId: createTenantId(tenantId),
    displayName: su.user_metadata?.full_name ?? su.user_metadata?.name ?? undefined,
    createdAt: new Date(su.created_at),
    updatedAt: new Date(su.updated_at ?? su.created_at),
  };
}

/**
 * Auth adapter implementing IAuthService using the shared browser Supabase singleton.
 * Must not call `createClient` here — a second GoTrueClient desyncs sign-in from `SaaSProfileProvider`.
 */
export class SupabaseAuthAdapter implements IAuthService {
  private get client() {
    return getSupabaseClient();
  }

  async getCurrentUser(): Promise<User | null> {
    const {
      data: { user },
    } = await this.client.auth.getUser();
    if (!user) return null;
    return mapSupabaseUserToDomain(user);
  }

  async signIn(email: string, password: string): Promise<SignInResult> {
    const { data, error } = await this.client.auth.signInWithPassword({ email, password });
    if (error) {
      return { success: false, error: error.message };
    }
    if (!data.session || !data.user) {
      return { success: false, error: 'No user returned' };
    }
    // Persist session to Electron main (safeStorage) so user stays logged in next launch
    if (typeof window !== 'undefined' && window.electronAuth?.saveSession) {
      window.electronAuth.saveSession({
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token ?? null,
        expires_at: data.session.expires_at ?? undefined,
      });
    }
    return {
      success: true,
      user: mapSupabaseUserToDomain(data.user),
    };
  }

  async signOut(): Promise<void> {
    await this.client.auth.signOut();
    if (typeof window !== 'undefined' && window.electronAuth?.clearSession) {
      await window.electronAuth.clearSession();
    }
  }

  async requireTenantContext(tenantId: TenantId): Promise<User | null> {
    const user = await this.getCurrentUser();
    if (!user) return null;
    if (user.tenantId !== tenantId) return null;
    return user;
  }
}
