/**
 * Environment and feature configuration.
 * All env access is centralized here; no process.env in UI or domain.
 * @expandable Add feature flags, API base URLs, or tenant-specific config.
 */
import { getCrmDataSource, type CrmDataSource } from '@/infrastructure/config/crmDataSource';
import { getSaasEntitlementSourceMode, type SaasEntitlementSourceMode } from '@/infrastructure/config/entitlementSource';
import {
  normalizeBuildCorePublicAppOrigin,
  resolveBuildCorePublicAppUrl,
} from '@/infrastructure/config/buildCorePublicAppUrl';
import {
  normalizePlatformPublicAppOrigin,
  resolvePlatformPublicAppUrl,
} from '@/infrastructure/config/platformPublicAppUrl';
import { resolveZenformedCoreApiBaseUrl } from '@/infrastructure/config/zenformedCoreUrlPolicy';

export const env = {
  /** When true, work orders are stored in localStorage (forgecore_demo_db) and the app runs without a real database. */
  get isDemoMode(): boolean {
    return typeof window !== 'undefined' && process.env.NEXT_PUBLIC_DEMO_MODE === 'true';
  },
  /** When true, use MockAuthAdapter and dummy Supabase values so the app runs without a real Supabase project. */
  get useMockAuth(): boolean {
    return process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true';
  },
  get supabaseUrl(): string {
    if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') return 'https://mock.supabase.co';
    const v = process.env.NEXT_PUBLIC_SUPABASE_URL;
    if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_URL is required');
    return v;
  },
  get supabaseAnonKey(): string {
    if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') return 'mock-anon-key';
    const v = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!v) throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY is required');
    return v;
  },
  get defaultDataSource(): 'sql' | 'excel' | 'erp' {
    if (process.env.NEXT_PUBLIC_USE_MOCK_AUTH === 'true') return 'excel';
    const v = process.env.NEXT_PUBLIC_DEFAULT_DATA_SOURCE;
    if (v === 'excel' || v === 'erp') return v;
    return 'sql';
  },
  /** Production SaaS: login gate, subscription check, onboarding. Uses only anon key + RLS. Must match server/client to avoid hydration. */
  get isSaasMode(): boolean {
    return process.env.NEXT_PUBLIC_SAAS_MODE === 'true';
  },
  /** Public app URL for auth redirect callbacks (password recovery). Falls back to browser origin on the client. */
  get appUrl(): string {
    if (typeof window !== 'undefined') {
      const configured = normalizeBuildCorePublicAppOrigin(
        process.env.NEXT_PUBLIC_BUILDCORE_APP_URL ?? process.env.NEXT_PUBLIC_APP_URL
      );
      if (configured) return configured;
      return window.location.origin;
    }
    return resolveBuildCorePublicAppUrl();
  },
  /** ZenformedPlatform public origin for primary login and sign-out redirects. */
  get platformPublicAppUrl(): string {
    if (typeof window !== 'undefined') {
      const configured = normalizePlatformPublicAppOrigin(process.env.NEXT_PUBLIC_PLATFORM_APP_URL);
      if (configured) return configured;
      return resolvePlatformPublicAppUrl();
    }
    return resolvePlatformPublicAppUrl();
  },
  /** Stripe payment/checkout URL for "License Required" screen. */
  get stripePaymentUrl(): string {
    return process.env.NEXT_PUBLIC_STRIPE_PAYMENT_URL ?? 'https://buy.stripe.com/';
  },
  /**
   * Entitlement reader selection for `getSaasEntitlementReader` (`NEXT_PUBLIC_ENTITLEMENT_SOURCE`).
   * **Not** `useSaaSProfile.entitlementSnapshot` — that path uses **`NEXT_PUBLIC_RUNTIME_ENTITLEMENT_SOURCE`**
   * (`getRuntimeEntitlementSourceMode`): defaults to **`core`** when unset; **`profile`** forces mapper-only.
   */
  get entitlementSource(): SaasEntitlementSourceMode {
    return getSaasEntitlementSourceMode();
  },
  /**
   * When true, the client may call **`GET /api/internal/shadow-capability-snapshot`** (passive cache metadata only).
   * Default **false** — no extra network work; does not change authority or gates.
   */
  get enableShadowCapabilityReads(): boolean {
    return process.env.NEXT_PUBLIC_ENABLE_SHADOW_CAPABILITY_READS === 'true';
  },
  /**
   * Optional ZenformedCore platform HTTP base URL (server-side / Node only).
   * When unset or empty, Core HTTP helpers return `unconfigured` and perform no network I/O.
   * Example dev: `http://localhost:4000`. Production: use **`https://`** for any non-loopback host
   * (see {@link resolveZenformedCoreApiBaseUrl} — `http://` remote URLs are ignored when `NODE_ENV=production`).
   */
  get zenformedCoreApiBaseUrl(): string | null {
    return resolveZenformedCoreApiBaseUrl(process.env.ZENFORMED_CORE_API_URL);
  },
  /**
   * CRM repository source: `mock` (default) or `api` (future BFF).
   * See {@link getCrmRepositories}.
   */
  get crmDataSource(): CrmDataSource {
    return getCrmDataSource();
  },
} as const;
