/**
 * Typed shapes for ZenformedCore HTTP responses (health, registry, session/profile/entitlement).
 * These types describe the wire format only.
 */

import type { SaaSEntitlementSnapshot } from '@/application/ports';

export type ZenformedCoreHealthBody = {
  ok: boolean;
  service: string;
};

/** `GET /session/me` — JWT-derived identity + session expiry hint (no secrets). */
export type ZenformedCoreSessionMeBody = {
  user: { id: string; email: string | null };
  session: { expiresAt: number | null };
};

/** `GET /users/me/profile` — sanitized `profiles` row subset. */
export type ZenformedCoreProfileDto = {
  id: string;
  email: string | null;
  subscription_status: string;
  license_tier: 'STANDARD' | 'PRO';
  company_name: string | null;
  industry: string | null;
  force_password_reset: boolean;
  updated_at: string;
};

export type ZenformedCoreProfileEnvelope = {
  profile: ZenformedCoreProfileDto;
};

/** Request body for `PATCH /users/me/profile` (camelCase wire shape). */
export type ZenformedCoreProfilePatchRequest = {
  companyName?: string;
  industry?: string;
  forcePasswordReset?: false;
};

/** `GET|PATCH /users/me/settings` — account name + communication preferences. */
export type ZenformedCoreUserSettingsDto = {
  email: string | null;
  firstName: string | null;
  lastName: string | null;
  marketingEmailOptIn: boolean;
  smsOptIn: boolean;
};

export type ZenformedCoreUserSettingsEnvelope = {
  settings: ZenformedCoreUserSettingsDto;
};

export type ZenformedCoreUserSettingsPatchRequest = {
  firstName?: string | null;
  lastName?: string | null;
  marketingEmailOptIn?: boolean;
  smsOptIn?: boolean;
};

/** `GET /apps/:appSlug/entitlement` — entitlement snapshot for the app context (platform-first on ZenformedCore). */
export type ZenformedCoreAppEntitlementEnvelope = {
  appSlug: string;
  entitlement: SaaSEntitlementSnapshot;
};

/** Query `authority_mode` on `GET /apps/:appSlug/entitlement` (ZenformedCore). Default response body is minimal (`appSlug` + `entitlement`); non-default modes add authority / dual-read fields. */
export type ZenformedCoreEntitlementAuthorityMode =
  | 'legacy'
  | 'platform'
  | 'dual_read_legacy_authoritative';

/** ZenformedCore `authority.serverConfiguredAuthority` when present — current servers emit **`platform`** (platform-first policy). Historical **`legacy`** may appear in older payloads. */
export type ZenformedCoreEntitlementServerAuthority = 'legacy' | 'platform';

/**
 * Present when Core returns an `authority` object (dual-read / extended `authority_mode` query).
 * `effectiveSource` / `authoritativeForRuntime` describe the **`entitlement`** field in the same response.
 */
export type ZenformedCoreEntitlementAuthorityMeta = {
  requestedMode?: Exclude<ZenformedCoreEntitlementAuthorityMode, 'legacy'>;
  serverConfiguredAuthority?: ZenformedCoreEntitlementServerAuthority;
  effectiveSource: 'legacy_profiles' | 'platform_tables';
  authoritativeForRuntime: 'legacy_profiles' | 'platform_tables';
  /** Core used profiles-backed snapshot because platform mirror had no usable row (server `platform` mode). */
  fallbackReason?: string;
  platformFailureDetail?: string | null;
};

export type ZenformedCoreLegacyVsPlatformComparison = {
  comparable: boolean;
  subscriptionActiveMatch: boolean | null;
  licenseTierMatch: boolean | null;
  mismatch: boolean;
};

/** Extended entitlement response when `authority_mode` is `platform` or `dual_read_legacy_authoritative`. */
export type ZenformedCoreAppEntitlementWireResponse = ZenformedCoreAppEntitlementEnvelope & {
  authority?: ZenformedCoreEntitlementAuthorityMeta;
  /** Dual-read only: `profiles` → mapper snapshot on Core (always legacy-shaped). */
  profilesMappedEntitlement?: SaaSEntitlementSnapshot;
  platformEntitlement?: SaaSEntitlementSnapshot | null;
  legacyVsPlatform?: ZenformedCoreLegacyVsPlatformComparison;
};

/** `GET /users/me/app-config` — `data_source` + tier slice for SaaS app config (Forge `/api/config`). */
export type ZenformedCoreUserAppConfigEnvelope = {
  appConfig: {
    dataSource: 'excel' | 'database';
    licenseTier: 'STANDARD' | 'PRO';
  };
};

/** `PATCH /users/me/app-config` success body. */
export type ZenformedCoreAppConfigPatchOk = {
  ok: true;
};

export type ZenformedCoreRegisteredApp = {
  appSlug: string;
  displayName: string;
  description?: string;
  status?: string;
};

export type ZenformedCoreRegisteredAppEnvelope = {
  app: ZenformedCoreRegisteredApp;
};

/** `staff_members` row subset (same columns as Supabase). */
export type ZenformedCoreStaffMemberRole = 'member' | 'admin' | 'lead';

export type ZenformedCoreStaffMemberDto = {
  id: string;
  owner_id: string;
  name: string;
  role: ZenformedCoreStaffMemberRole;
  created_at: string;
  updated_at: string;
};

export type ZenformedCoreStaffMembersListEnvelope = {
  staffMembers: ZenformedCoreStaffMemberDto[];
};

export type ZenformedCoreStaffMemberEnvelope = {
  staffMember: ZenformedCoreStaffMemberDto;
};

export type ZenformedCoreStaffDeleteOk = {
  ok: true;
};

/** `GET /users/me/avatar/meta` and successful PUT/DELETE avatar responses on ZenformedCore. */
export type ZenformedCoreUserAvatarMeta = {
  hasAvatar: boolean;
  contentType?: string;
  updatedAt?: string;
  revision?: string;
};

/** `GET|PATCH /users/me/organization/branding` and successful logo PUT/DELETE on ZenformedCore. */
export type ZenformedCoreOrganizationBranding = {
  organizationId: string;
  displayName: string;
  industry: string | null;
  timezone: string | null;
  hasLogo: boolean;
  logoContentType?: string;
  logoUpdatedAt?: string;
  revision?: string;
};

/** `GET /organizations/me/members` */
export type ZenformedCoreOrganizationMembersResponse = {
  organizationId: string;
  members: Array<{
    id: string;
    userId: string;
    displayName: string;
    email: string | null;
    role: 'owner' | 'admin' | 'member';
    status: 'active' | 'invited' | 'removed';
  }>;
};

/** Shared invite record shape for organization workspace APIs. */
export type ZenformedCoreOrganizationInvite = {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  displayName: string;
  status: 'pending' | 'accepted' | 'revoked' | 'expired' | 'canceled';
  role: 'owner' | 'admin' | 'member';
  invitedBy: string | null;
  expiresAt: string | null;
  createdAt: string;
  sentLabel: string;
};

/** `GET /organizations/me/invites` */
export type ZenformedCoreOrganizationInvitesResponse = {
  organizationId: string;
  invites: ZenformedCoreOrganizationInvite[];
};

/** `POST /organizations/me/invites`, `PATCH /organizations/me/invites/:id/cancel` */
export type ZenformedCoreOrganizationInviteMutationResponse = {
  organizationId: string;
  invite: ZenformedCoreOrganizationInvite;
};

export type ZenformedCoreOrganizationInviteCreateRequest = {
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  role?: 'owner' | 'admin' | 'member';
};

/** `GET /organizations/me/seats` */
export type ZenformedCoreOrganizationSeatsResponse = {
  organizationId: string;
  seatsUsed: number;
  seatLimit: number;
  seatsAvailable: number;
  source: string;
  notes: string | null;
  planName: string | null;
  appBreakdown: Array<{
    appSlug: string;
    appName: string;
    planCode: string | null;
    entitlementStatus: string;
  }>;
};

/** `GET /organizations/me/app-access` */
export type ZenformedCoreOrganizationAppAccessResponse = {
  organizationId: string;
  entries: Array<{
    userId: string;
    displayName: string;
    email: string | null;
    appSlug: string;
    appName: string;
    accessStatus: string;
    role: string;
    planLabel: string | null;
  }>;
  orgApps: Array<{
    appSlug: string;
    appName: string;
    planLabel: string | null;
    statusLabel: string;
    isActive: boolean;
  }>;
};

export type CoreApiError =
  | { kind: 'unconfigured' }
  | { kind: 'http_error'; status: number; body?: unknown }
  | { kind: 'timeout' }
  | { kind: 'network'; message?: string }
  | { kind: 'invalid_payload' };

export type CoreApiResult<T> =
  | { ok: true; data: T }
  | { ok: false; error: CoreApiError };
