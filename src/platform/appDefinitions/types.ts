/**
 * App manifest (bootstrap descriptor) for a **consuming** Zenformed suite app — **not** runtime authority.
 *
 * Each registered app supplies its own manifest in its repo; **`platform_apps.slug`** and DB rows
 * remain the source of truth for lookups. This type is **generic** — it does not enumerate or branch on products.
 */

export interface ZenformedAppFeatureFlags {
  /** Example: enable passive capability cache reads in SaaS (product-owned HTTP route). */
  shadowCapabilityReads?: boolean;
}

export interface ZenformedAppDefinition {
  /** Stable catalog key — must match `platform_apps.slug`; rename only with migrations. */
  appSlug: string;
  /** Marketing / shell UI label (not `document.title` alone — Next metadata may differ). */
  displayName: string;
  /** One-line description for registries and bootstrap docs. */
  descriptionShort?: string;
  /** Root HTML meta description (e.g. Next `metadata.description`). */
  description?: string;
  /** Default `<title>` when the shell needs a longer string than `displayName` alone. */
  rootMetadataTitle?: string;
  /** localStorage key for client-persisted theme (inline boot script + ThemeProvider must match). */
  themeStorageKey?: string;
  /** Primary post-auth home path (leading slash); shell routes should read this when refactored. */
  dashboardRoute?: string;
  supportEmail?: string;
  /** Optional hints for capability catalog naming — DB seeds remain authoritative. */
  capabilityCatalogNamespaceHint?: string;
  /** Placeholder / bootstrap-only toggles — never substitute for server authority. */
  bootstrapFeatureFlags?: ZenformedAppFeatureFlags;
}
