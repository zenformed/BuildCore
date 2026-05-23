import type { User } from '@/domain/entities/User';
import type { TenantId } from '@/domain/value-objects/TenantId';
import { createTenantId } from '@/domain/value-objects/TenantId';
import type { IAuthService, SignInResult, SignUpResult } from '@/application/ports/IAuthService';
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
function persistElectronSession(session: {
  access_token: string;
  refresh_token: string | null;
  expires_at?: number;
}): void {
  if (typeof window !== 'undefined' && window.electronAuth?.saveSession) {
    window.electronAuth.saveSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token ?? null,
      expires_at: session.expires_at ?? undefined,
    });
  }
}

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

  async signUp(
    email: string,
    password: string,
    options?: { firstName?: string | null; lastName?: string | null }
  ): Promise<SignUpResult> {
    const firstName = options?.firstName?.trim() ?? '';
    const lastName = options?.lastName?.trim() ?? '';
    const fullName = `${firstName} ${lastName}`.trim();

    const { data, error } = await this.client.auth.signUp({
      email,
      password,
      options: {
        data: {
          ...(firstName ? { first_name: firstName } : {}),
          ...(lastName ? { last_name: lastName } : {}),
          ...(fullName ? { full_name: fullName } : {}),
        },
      },
    });

    if (error) {
      return { success: false, error: error.message };
    }

    if (data.session && data.user) {
      persistElectronSession(data.session);
      return {
        success: true,
        user: mapSupabaseUserToDomain(data.user),
      };
    }

    if (data.user && !data.session) {
      return {
        success: false,
        needsEmailConfirmation: true,
        error: 'Check your email to confirm your account before signing in.',
      };
    }

    return { success: false, error: 'Account could not be created.' };
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
