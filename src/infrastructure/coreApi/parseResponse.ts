import type { SaaSEntitlementSnapshot, SaaSEntitlementResolutionSource } from '@/application/ports';
import type {
  ZenformedCoreAppEntitlementEnvelope,
  ZenformedCoreAppEntitlementWireResponse,
  ZenformedCoreEntitlementAuthorityMeta,
  ZenformedCoreAppConfigPatchOk,
  ZenformedCoreHealthBody,
  ZenformedCoreProfileEnvelope,
  ZenformedCoreRegisteredAppEnvelope,
  ZenformedCoreSessionMeBody,
  ZenformedCoreStaffDeleteOk,
  ZenformedCoreUserAvatarMeta,
  ZenformedCoreOrganizationBranding,
  ZenformedCoreStaffMemberDto,
  ZenformedCoreStaffMemberEnvelope,
  ZenformedCoreStaffMembersListEnvelope,
  ZenformedCoreUserAppConfigEnvelope,
  ZenformedCoreUserSettingsEnvelope,
} from '@/infrastructure/coreApi/types';

const RESOLUTION_SOURCES = new Set<SaaSEntitlementResolutionSource>([
  'legacy_profiles',
  'platform_tables',
  'offline_snapshot',
  'dual_read_legacy_authoritative',
]);

export function parseHealthJson(body: unknown): ZenformedCoreHealthBody | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.ok !== 'boolean') return null;
  if (typeof o.service !== 'string') return null;
  return { ok: o.ok, service: o.service };
}

export function parseSessionMeJson(body: unknown): ZenformedCoreSessionMeBody | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const user = o.user;
  const session = o.session;
  if (user == null || typeof user !== 'object') return null;
  if (session == null || typeof session !== 'object') return null;
  const u = user as Record<string, unknown>;
  const s = session as Record<string, unknown>;
  if (typeof u.id !== 'string') return null;
  const email = u.email;
  if (email != null && typeof email !== 'string') return null;
  const exp = s.expiresAt;
  if (exp != null && typeof exp !== 'number') return null;
  return {
    user: { id: u.id, email: email == null ? null : email },
    session: { expiresAt: exp == null ? null : exp },
  };
}

export function parseProfileEnvelopeJson(body: unknown): ZenformedCoreProfileEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const profile = o.profile;
  if (profile == null || typeof profile !== 'object') return null;
  const p = profile as Record<string, unknown>;
  if (typeof p.id !== 'string') return null;
  if (typeof p.subscription_status !== 'string') return null;
  if (p.license_tier !== 'STANDARD' && p.license_tier !== 'PRO') return null;
  if (typeof p.force_password_reset !== 'boolean') return null;
  if (typeof p.updated_at !== 'string') return null;
  const email = p.email;
  const company = p.company_name;
  const industry = p.industry;
  if (email != null && typeof email !== 'string') return null;
  if (company != null && typeof company !== 'string') return null;
  if (industry != null && typeof industry !== 'string') return null;
  return {
    profile: {
      id: p.id,
      email: email == null ? null : email,
      subscription_status: p.subscription_status,
      license_tier: p.license_tier,
      company_name: company == null ? null : company,
      industry: industry == null ? null : industry,
      force_password_reset: p.force_password_reset,
      updated_at: p.updated_at,
    },
  };
}

export function parseUserSettingsEnvelopeJson(body: unknown): ZenformedCoreUserSettingsEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const settings = o.settings;
  if (settings == null || typeof settings !== 'object') return null;
  const s = settings as Record<string, unknown>;
  const email = s.email;
  if (email != null && typeof email !== 'string') return null;
  const firstName = s.firstName;
  if (firstName != null && typeof firstName !== 'string') return null;
  const lastName = s.lastName;
  if (lastName != null && typeof lastName !== 'string') return null;
  if (typeof s.marketingEmailOptIn !== 'boolean') return null;
  if (typeof s.smsOptIn !== 'boolean') return null;
  return {
    settings: {
      email: email ?? null,
      firstName: firstName ?? null,
      lastName: lastName ?? null,
      marketingEmailOptIn: s.marketingEmailOptIn,
      smsOptIn: s.smsOptIn,
    },
  };
}

export function parseEntitlementSnapshotJson(raw: unknown): SaaSEntitlementSnapshot | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.subscriptionActive !== 'boolean') return null;
  if (o.licenseTier !== 'STANDARD' && o.licenseTier !== 'PRO') return null;
  const src = o.resolutionSource;
  if (typeof src !== 'string' || !RESOLUTION_SOURCES.has(src as SaaSEntitlementResolutionSource)) {
    return null;
  }
  const offline = o.offlineExpiresAt;
  if (offline != null && typeof offline !== 'string') return null;
  return {
    subscriptionActive: o.subscriptionActive,
    licenseTier: o.licenseTier,
    resolutionSource: src as SaaSEntitlementResolutionSource,
    ...(typeof offline === 'string' ? { offlineExpiresAt: offline } : {}),
  };
}

export function parseAppEntitlementEnvelopeJson(
  body: unknown
): ZenformedCoreAppEntitlementEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.appSlug !== 'string') return null;
  const ent = parseEntitlementSnapshotJson(o.entitlement);
  if (ent == null) return null;
  return { appSlug: o.appSlug, entitlement: ent };
}

/** Full Core `GET /apps/:slug/entitlement` body including optional dual-read fields (`authority_mode` query). */
export function parseAppEntitlementWireResponse(body: unknown): ZenformedCoreAppEntitlementWireResponse | null {
  const base = parseAppEntitlementEnvelopeJson(body);
  if (base == null) return null;
  const o = body as Record<string, unknown>;
  const out: ZenformedCoreAppEntitlementWireResponse = { ...base };

  const auth = o.authority;
  if (auth != null && typeof auth === 'object') {
    const a = auth as Record<string, unknown>;
    const es = a.effectiveSource;
    const ar = a.authoritativeForRuntime;
    if (
      (es === 'legacy_profiles' || es === 'platform_tables') &&
      (ar === 'legacy_profiles' || ar === 'platform_tables')
    ) {
      const meta: ZenformedCoreEntitlementAuthorityMeta = {
        effectiveSource: es,
        authoritativeForRuntime: ar,
      };
      const rm = a.requestedMode;
      if (rm === 'platform' || rm === 'dual_read_legacy_authoritative') {
        meta.requestedMode = rm;
      }
      const sca = a.serverConfiguredAuthority;
      if (sca === 'legacy' || sca === 'platform') {
        meta.serverConfiguredAuthority = sca;
      }
      const fr = a.fallbackReason;
      if (typeof fr === 'string' && fr.length > 0) {
        meta.fallbackReason = fr;
      }
      const pfd = a.platformFailureDetail;
      if (pfd === null) {
        meta.platformFailureDetail = null;
      } else if (typeof pfd === 'string') {
        meta.platformFailureDetail = pfd;
      }
      out.authority = meta;
    }
  }

  if ('platformEntitlement' in o) {
    const pe = o.platformEntitlement;
    if (pe === null) {
      out.platformEntitlement = null;
    } else {
      const snap = parseEntitlementSnapshotJson(pe);
      if (snap != null) out.platformEntitlement = snap;
    }
  }

  const pme = o.profilesMappedEntitlement;
  if (pme != null && typeof pme === 'object') {
    const snap = parseEntitlementSnapshotJson(pme);
    if (snap != null) out.profilesMappedEntitlement = snap;
  }

  const lvp = o.legacyVsPlatform;
  if (lvp != null && typeof lvp === 'object') {
    const c = lvp as Record<string, unknown>;
    if (typeof c.comparable === 'boolean') {
      out.legacyVsPlatform = {
        comparable: c.comparable,
        subscriptionActiveMatch:
          typeof c.subscriptionActiveMatch === 'boolean' ? c.subscriptionActiveMatch : null,
        licenseTierMatch: typeof c.licenseTierMatch === 'boolean' ? c.licenseTierMatch : null,
        mismatch: typeof c.mismatch === 'boolean' ? c.mismatch : false,
      };
    }
  }

  return out;
}

export function parseUserAppConfigEnvelopeJson(body: unknown): ZenformedCoreUserAppConfigEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const ac = o.appConfig;
  if (ac == null || typeof ac !== 'object') return null;
  const c = ac as Record<string, unknown>;
  if (c.dataSource !== 'excel' && c.dataSource !== 'database') return null;
  if (c.licenseTier !== 'STANDARD' && c.licenseTier !== 'PRO') return null;
  return {
    appConfig: {
      dataSource: c.dataSource,
      licenseTier: c.licenseTier,
    },
  };
}

export function parseAppConfigPatchOkJson(body: unknown): ZenformedCoreAppConfigPatchOk | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.ok !== true) return null;
  return { ok: true };
}

function parseStaffMemberDtoJson(raw: unknown): ZenformedCoreStaffMemberDto | null {
  if (raw == null || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (typeof o.id !== 'string') return null;
  if (typeof o.owner_id !== 'string') return null;
  if (typeof o.name !== 'string') return null;
  if (typeof o.created_at !== 'string') return null;
  if (typeof o.updated_at !== 'string') return null;
  if (o.role !== 'member' && o.role !== 'admin' && o.role !== 'lead') return null;
  return {
    id: o.id,
    owner_id: o.owner_id,
    name: o.name,
    role: o.role,
    created_at: o.created_at,
    updated_at: o.updated_at,
  };
}

export function parseStaffMembersListEnvelopeJson(body: unknown): ZenformedCoreStaffMembersListEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const list = o.staffMembers;
  if (!Array.isArray(list)) return null;
  const staffMembers: ZenformedCoreStaffMemberDto[] = [];
  for (const item of list) {
    const row = parseStaffMemberDtoJson(item);
    if (row == null) return null;
    staffMembers.push(row);
  }
  return { staffMembers };
}

export function parseStaffMemberEnvelopeJson(body: unknown): ZenformedCoreStaffMemberEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const sm = parseStaffMemberDtoJson(o.staffMember);
  if (sm == null) return null;
  return { staffMember: sm };
}

export function parseStaffDeleteOkJson(body: unknown): ZenformedCoreStaffDeleteOk | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (o.ok !== true) return null;
  return { ok: true };
}

export function parseOrganizationBrandingJson(body: unknown): ZenformedCoreOrganizationBranding | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  if (typeof o.displayName !== 'string') return null;
  if (typeof o.hasLogo !== 'boolean') return null;
  const industry = o.industry;
  const timezone = o.timezone;
  if (industry != null && typeof industry !== 'string') return null;
  if (timezone != null && typeof timezone !== 'string') return null;
  const logoContentType = o.logoContentType;
  const logoUpdatedAt = o.logoUpdatedAt;
  const revision = o.revision;
  if (logoContentType != null && typeof logoContentType !== 'string') return null;
  if (logoUpdatedAt != null && typeof logoUpdatedAt !== 'string') return null;
  if (revision != null && typeof revision !== 'string') return null;
  return {
    organizationId: o.organizationId,
    displayName: o.displayName,
    industry: typeof industry === 'string' ? industry : null,
    timezone: typeof timezone === 'string' ? timezone : null,
    hasLogo: o.hasLogo,
    ...(typeof logoContentType === 'string' ? { logoContentType } : {}),
    ...(typeof logoUpdatedAt === 'string' ? { logoUpdatedAt } : {}),
    ...(typeof revision === 'string' ? { revision } : {}),
  };
}

export function parseUserAvatarMetaJson(body: unknown): ZenformedCoreUserAvatarMeta | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.hasAvatar !== 'boolean') return null;
  const contentType = o.contentType;
  const updatedAt = o.updatedAt;
  const revision = o.revision;
  if (contentType != null && typeof contentType !== 'string') return null;
  if (updatedAt != null && typeof updatedAt !== 'string') return null;
  if (revision != null && typeof revision !== 'string') return null;
  return {
    hasAvatar: o.hasAvatar,
    ...(typeof contentType === 'string' ? { contentType } : {}),
    ...(typeof updatedAt === 'string' ? { updatedAt } : {}),
    ...(typeof revision === 'string' ? { revision } : {}),
  };
}

export function parseRegisteredAppEnvelopeJson(
  body: unknown
): ZenformedCoreRegisteredAppEnvelope | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  const app = o.app;
  if (app == null || typeof app !== 'object') return null;
  const a = app as Record<string, unknown>;
  if (typeof a.appSlug !== 'string') return null;
  if (typeof a.displayName !== 'string') return null;
  const description = a.description;
  const status = a.status;
  return {
    app: {
      appSlug: a.appSlug,
      displayName: a.displayName,
      ...(typeof description === 'string' ? { description } : {}),
      ...(typeof status === 'string' ? { status } : {}),
    },
  };
}
