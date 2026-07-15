import type { SaaSEntitlementSnapshot } from '@/application/ports';
import type { User } from '@/domain/entities/User';
import { createTenantId } from '@/domain/value-objects/TenantId';
import type { Session, User as SupabaseUser } from '@supabase/supabase-js';
import type {
  OrganizationMembershipContext,
  SaaSProfile,
} from '@/presentation/providers/SaaSProfileProvider';
import { resolveOrganizationPermissionsFromRole } from '@zenformed/core/organization-settings';
import { BUILD_CORE_APP_SLUG } from '@/infrastructure/entitlements/buildCoreZenformedAppContext';
import { MOCK_CRM_DEMO_TEAM_MEMBER_ID } from '@/platform/mock/crm/teamMembers';

export const DEMO_ORGANIZATION_ID = 'demo-org';
/** Matches seeded mock CRM team member Alex Rivera (`tm-alex`). */
export const DEMO_USER_ID = MOCK_CRM_DEMO_TEAM_MEMBER_ID;
export const DEMO_TEAM_MEMBER_ID = MOCK_CRM_DEMO_TEAM_MEMBER_ID;
export const DEMO_USER_EMAIL = 'alex.rivera@zenformed.test';

const DEMO_NOW = '2026-01-01T00:00:00.000Z';

export function createDemoDomainUser(): User {
  const now = new Date(DEMO_NOW);
  return {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    tenantId: createTenantId(DEMO_ORGANIZATION_ID),
    displayName: 'Alex Rivera',
    createdAt: now,
    updatedAt: now,
  };
}

export function createDemoSaaSProfile(): SaaSProfile {
  return {
    id: DEMO_USER_ID,
    email: DEMO_USER_EMAIL,
    subscription_status: 'active',
    license_tier: 'PRO',
    company_name: 'BuildCore Demo Co.',
    industry: 'general_contractor',
    force_password_reset: false,
    updated_at: DEMO_NOW,
  };
}

export function createDemoEntitlementSnapshot(): SaaSEntitlementSnapshot {
  return {
    appSlug: BUILD_CORE_APP_SLUG,
    subscriptionActive: true,
    planCodeOriginal: 'pro',
    planSlugNormalized: 'pro',
    entitlementStatus: 'active',
    effectiveFrom: DEMO_NOW,
    effectiveTo: null,
    resolutionSource: 'offline_snapshot',
  };
}

export function createDemoOrganizationMembershipContext(): OrganizationMembershipContext {
  return {
    hasActiveMembership: true,
    hasNonPersonalOrganizationMembership: true,
    membershipKind: 'organization_bootstrap_owner',
    organizationId: DEMO_ORGANIZATION_ID,
    role: 'owner',
    permissions: resolveOrganizationPermissionsFromRole('owner'),
  };
}

export function createDemoSupabaseUser(): SupabaseUser {
  return {
    id: DEMO_USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: DEMO_USER_EMAIL,
    email_confirmed_at: DEMO_NOW,
    phone: '',
    confirmed_at: DEMO_NOW,
    last_sign_in_at: DEMO_NOW,
    app_metadata: { tenant_id: DEMO_ORGANIZATION_ID },
    user_metadata: { full_name: 'Alex Rivera' },
    identities: [],
    created_at: DEMO_NOW,
    updated_at: DEMO_NOW,
    is_anonymous: false,
  };
}

export function createDemoSupabaseSession(): Session {
  return {
    access_token: 'demo-access-token',
    refresh_token: 'demo-refresh-token',
    expires_in: 60 * 60 * 24,
    expires_at: Math.floor(Date.now() / 1000) + 60 * 60 * 24,
    token_type: 'bearer',
    user: createDemoSupabaseUser(),
  };
}
