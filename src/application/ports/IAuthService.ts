import type { User } from '@/domain/entities/User';
import type { TenantId } from '@/domain/value-objects/TenantId';

/**
 * Result of a sign-in attempt.
 * @expandable Add MFA or redirect URL when needed.
 */
export interface SignInResult {
  success: boolean;
  error?: string;
  user?: User;
}

export interface SignUpResult {
  success: boolean;
  error?: string;
  user?: User;
  needsEmailConfirmation?: boolean;
}

/**
 * Port for authentication and session management.
 * UI and use cases depend on this interface only; concrete implementation (Supabase, NextAuth, etc.) lives in infrastructure.
 * @expandable Add methods: signUp, resetPassword, refreshSession, getTenantsForUser.
 */
export interface IAuthService {
  /**
   * Returns the currently authenticated user and tenant context, or null if not authenticated.
   * @returns User with tenantId, or null.
   */
  getCurrentUser(): Promise<User | null>;

  /**
   * Signs in with email and password; resolves tenant (e.g. from first membership or subdomain).
   * @param email - User email.
   * @param password - User password.
   * @returns SignInResult with user on success.
   */
  signIn(email: string, password: string): Promise<SignInResult>;

  /**
   * Creates a new auth user with email and password.
   */
  signUp(
    email: string,
    password: string,
    options?: { firstName?: string | null; lastName?: string | null }
  ): Promise<SignUpResult>;

  /**
   * Signs out the current user and clears session.
   */
  signOut(): Promise<void>;

  /**
   * Ensures the current session belongs to the given tenant; used for tenant switching or validation.
   * @param tenantId - Tenant to require.
   * @returns User if session is valid and user belongs to tenant; null otherwise.
   * @expandable Throw or return error reason for UI feedback.
   */
  requireTenantContext(tenantId: TenantId): Promise<User | null>;
}
