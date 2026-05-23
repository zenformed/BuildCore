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
  ZenformedCoreOrganizationMembersResponse,
  ZenformedCoreOrganizationInvite,
  ZenformedCoreOrganizationInviteAcceptResponse,
  ZenformedCoreOrganizationInviteLookupResponse,
  ZenformedCoreOrganizationInviteMutationResponse,
  ZenformedCoreOrganizationInvitesResponse,
  ZenformedCoreOrganizationSeatsResponse,
  ZenformedCoreOrganizationAppAccessResponse,
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

export function parseOrganizationMembersJson(
  body: unknown
): ZenformedCoreOrganizationMembersResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  if (!Array.isArray(o.members)) return null;
  const members: ZenformedCoreOrganizationMembersResponse['members'] = [];
  for (const m of o.members) {
    if (m == null || typeof m !== 'object') return null;
    const row = m as Record<string, unknown>;
    if (typeof row.id !== 'string' || typeof row.userId !== 'string') return null;
    if (typeof row.displayName !== 'string') return null;
    if (row.email != null && typeof row.email !== 'string') return null;
    if (row.role !== 'owner' && row.role !== 'admin' && row.role !== 'member') return null;
    if (row.status !== 'active' && row.status !== 'invited' && row.status !== 'removed') return null;
    members.push({
      id: row.id,
      userId: row.userId,
      displayName: row.displayName,
      email: row.email ?? null,
      role: row.role,
      status: row.status,
    });
  }
  return { organizationId: o.organizationId, members };
}

function parseOrganizationInviteRecord(row: unknown): ZenformedCoreOrganizationInvite | null {
  if (row == null || typeof row !== 'object') return null;
  const inv = row as Record<string, unknown>;
  if (typeof inv.id !== 'string' || typeof inv.email !== 'string') return null;
  if (typeof inv.displayName !== 'string') return null;
  if (
    inv.status !== 'pending' &&
    inv.status !== 'accepted' &&
    inv.status !== 'revoked' &&
    inv.status !== 'expired' &&
    inv.status !== 'canceled'
  ) {
    return null;
  }
  if (inv.role !== 'owner' && inv.role !== 'admin' && inv.role !== 'member') return null;
  if (inv.invitedBy != null && typeof inv.invitedBy !== 'string') return null;
  if (inv.expiresAt != null && typeof inv.expiresAt !== 'string') return null;
  if (inv.firstName != null && typeof inv.firstName !== 'string') return null;
  if (inv.lastName != null && typeof inv.lastName !== 'string') return null;
  if (typeof inv.createdAt !== 'string' || typeof inv.sentLabel !== 'string') return null;
  return {
    id: inv.id,
    email: inv.email,
    firstName: inv.firstName ?? null,
    lastName: inv.lastName ?? null,
    displayName: inv.displayName,
    status: inv.status,
    role: inv.role,
    invitedBy: inv.invitedBy ?? null,
    expiresAt: inv.expiresAt ?? null,
    createdAt: inv.createdAt,
    sentLabel: inv.sentLabel,
  };
}

export function parseOrganizationInvitesJson(
  body: unknown
): ZenformedCoreOrganizationInvitesResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  if (!Array.isArray(o.invites)) return null;
  const invites: ZenformedCoreOrganizationInvitesResponse['invites'] = [];
  for (const inv of o.invites) {
    const parsed = parseOrganizationInviteRecord(inv);
    if (parsed == null) return null;
    invites.push(parsed);
  }
  return { organizationId: o.organizationId, invites };
}

export function parseOrganizationInviteMutationJson(
  body: unknown
): ZenformedCoreOrganizationInviteMutationResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  const invite = parseOrganizationInviteRecord(o.invite);
  if (invite == null) return null;
  if (o.acceptUrl != null && typeof o.acceptUrl !== 'string') return null;
  return {
    organizationId: o.organizationId,
    invite,
    ...(typeof o.acceptUrl === 'string' ? { acceptUrl: o.acceptUrl } : {}),
  };
}

export function parseOrganizationInviteLookupJson(
  body: unknown
): ZenformedCoreOrganizationInviteLookupResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationName !== 'string' || typeof o.invitedEmail !== 'string') return null;
  if (o.invitedFirstName != null && typeof o.invitedFirstName !== 'string') return null;
  if (o.invitedLastName != null && typeof o.invitedLastName !== 'string') return null;
  if (o.role !== 'owner' && o.role !== 'admin' && o.role !== 'member') return null;
  if (o.expiresAt != null && typeof o.expiresAt !== 'string') return null;
  return {
    organizationName: o.organizationName,
    invitedEmail: o.invitedEmail,
    invitedFirstName: typeof o.invitedFirstName === 'string' ? o.invitedFirstName : null,
    invitedLastName: typeof o.invitedLastName === 'string' ? o.invitedLastName : null,
    role: o.role,
    expiresAt: typeof o.expiresAt === 'string' ? o.expiresAt : null,
  };
}

export function parseOrganizationInviteAcceptJson(
  body: unknown
): ZenformedCoreOrganizationInviteAcceptResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string' || typeof o.organizationName !== 'string') return null;
  if (o.member == null || typeof o.member !== 'object') return null;
  const member = o.member as Record<string, unknown>;
  if (typeof member.id !== 'string' || typeof member.userId !== 'string') return null;
  if (typeof member.displayName !== 'string') return null;
  if (member.role !== 'owner' && member.role !== 'admin' && member.role !== 'member') return null;
  if (member.status !== 'active' && member.status !== 'invited' && member.status !== 'removed') {
    return null;
  }
  if (member.email != null && typeof member.email !== 'string') return null;
  if (o.seats == null || typeof o.seats !== 'object') return null;
  const seats = o.seats as Record<string, unknown>;
  if (
    typeof seats.seatsUsed !== 'number' ||
    typeof seats.seatLimit !== 'number' ||
    typeof seats.seatsAvailable !== 'number'
  ) {
    return null;
  }
  return {
    organizationId: o.organizationId,
    organizationName: o.organizationName,
    member: {
      id: member.id,
      userId: member.userId,
      displayName: member.displayName,
      email: typeof member.email === 'string' ? member.email : null,
      role: member.role,
      status: member.status,
    },
    seats: {
      seatsUsed: seats.seatsUsed,
      seatLimit: seats.seatLimit,
      seatsAvailable: seats.seatsAvailable,
    },
  };
}

export function parseOrganizationSeatsJson(
  body: unknown
): ZenformedCoreOrganizationSeatsResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  if (typeof o.seatsUsed !== 'number' || typeof o.seatLimit !== 'number') return null;
  if (typeof o.seatsAvailable !== 'number' || typeof o.source !== 'string') return null;
  if (o.notes != null && typeof o.notes !== 'string') return null;
  if (o.planName != null && typeof o.planName !== 'string') return null;
  if (!Array.isArray(o.appBreakdown)) return null;
  const appBreakdown: ZenformedCoreOrganizationSeatsResponse['appBreakdown'] = [];
  for (const a of o.appBreakdown) {
    if (a == null || typeof a !== 'object') return null;
    const row = a as Record<string, unknown>;
    if (typeof row.appSlug !== 'string' || typeof row.appName !== 'string') return null;
    if (row.planCode != null && typeof row.planCode !== 'string') return null;
    if (typeof row.entitlementStatus !== 'string') return null;
    appBreakdown.push({
      appSlug: row.appSlug,
      appName: row.appName,
      planCode: row.planCode ?? null,
      entitlementStatus: row.entitlementStatus,
    });
  }
  return {
    organizationId: o.organizationId,
    seatsUsed: o.seatsUsed,
    seatLimit: o.seatLimit,
    seatsAvailable: o.seatsAvailable,
    source: o.source,
    notes: o.notes ?? null,
    planName: o.planName ?? null,
    appBreakdown,
  };
}

export function parseOrganizationAppAccessJson(
  body: unknown
): ZenformedCoreOrganizationAppAccessResponse | null {
  if (body == null || typeof body !== 'object') return null;
  const o = body as Record<string, unknown>;
  if (typeof o.organizationId !== 'string') return null;
  if (!Array.isArray(o.entries) || !Array.isArray(o.orgApps)) return null;
  const entries: ZenformedCoreOrganizationAppAccessResponse['entries'] = [];
  for (const e of o.entries) {
    if (e == null || typeof e !== 'object') return null;
    const row = e as Record<string, unknown>;
    if (typeof row.userId !== 'string' || typeof row.displayName !== 'string') return null;
    if (row.email != null && typeof row.email !== 'string') return null;
    if (typeof row.appSlug !== 'string' || typeof row.appName !== 'string') return null;
    if (typeof row.accessStatus !== 'string' || typeof row.role !== 'string') return null;
    if (row.planLabel != null && typeof row.planLabel !== 'string') return null;
    entries.push({
      userId: row.userId,
      displayName: row.displayName,
      email: row.email ?? null,
      appSlug: row.appSlug,
      appName: row.appName,
      accessStatus: row.accessStatus,
      role: row.role,
      planLabel: row.planLabel ?? null,
    });
  }
  const orgApps: ZenformedCoreOrganizationAppAccessResponse['orgApps'] = [];
  for (const a of o.orgApps) {
    if (a == null || typeof a !== 'object') return null;
    const row = a as Record<string, unknown>;
    if (typeof row.appSlug !== 'string' || typeof row.appName !== 'string') return null;
    if (row.planLabel != null && typeof row.planLabel !== 'string') return null;
    if (typeof row.statusLabel !== 'string' || typeof row.isActive !== 'boolean') return null;
    orgApps.push({
      appSlug: row.appSlug,
      appName: row.appName,
      planLabel: row.planLabel ?? null,
      statusLabel: row.statusLabel,
      isActive: row.isActive,
    });
  }
  return { organizationId: o.organizationId, entries, orgApps };
}
