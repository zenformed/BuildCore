import type { User } from '@/domain/entities/User';
import type { TenantId } from '@/domain/value-objects/TenantId';
import { createTenantId } from '@/domain/value-objects/TenantId';
import type { IAuthService, SignInResult, SignUpResult } from '@/application/ports/IAuthService';
import type { User as SupabaseUser } from '@supabase/supabase-js';
import { signInWithPassword, signUpWithPassword } from '@zenformed/core/auth';
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
    const result = await signInWithPassword(this.client, email, password);
    if (!result.ok) {
      return { success: false, error: result.error };
    }
    if (typeof window !== 'undefined' && window.electronAuth?.saveSession) {
      window.electronAuth.saveSession({
        access_token: result.session.access_token,
        refresh_token: result.session.refresh_token ?? null,
        expires_at: result.session.expires_at ?? undefined,
      });
    }
    return {
      success: true,
      user: mapSupabaseUserToDomain(result.user),
    };
  }

  async signUp(
    email: string,
    password: string,
    options?: { firstName?: string | null; lastName?: string | null }
  ): Promise<SignUpResult> {
    const result = await signUpWithPassword(this.client, email, password, options);
    if (!result.ok) {
      return {
        success: false,
        error: result.error,
        needsEmailConfirmation: result.needsEmailConfirmation,
      };
    }

    if (result.session && result.user) {
      persistElectronSession(result.session);
      return {
        success: true,
        user: mapSupabaseUserToDomain(result.user),
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
