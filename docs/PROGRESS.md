# BuildCore — progress and roadmap

Last updated: 2026-05-16

## 1. Project overview

**BuildCore** is a Zenformed **consuming app** (Next.js + optional Electron) aimed at becoming a CRM and workflow platform for construction and service-trade businesses: HVAC, restoration, roofing, inspections, make-ready, general contractors, and similar field-service operations.

| Piece | Role |
|-------|------|
| **ZenformedCore** | Hosted platform API on Railway — app registry, entitlements, org branding, profile relay, capabilities |
| **ForgeCore** | Reference consuming app (job board / operations) — patterns for auth, BFF relays, dashboard shell |
| **BuildCore** | Thin CRM-oriented shell today; product UI and domain logic come later |
| **`@zenformed/core`** | Shared package (`../zenformed-core-package`) — auth client singleton, entitlement helpers, `dashboard-shell` UI primitives |

**Architecture standard (all consuming apps):** [ZENFORMED_CONSUMING_APP_ARCHITECTURE.md](./ZENFORMED_CONSUMING_APP_ARCHITECTURE.md)

BuildCore does **not** own platform data or auth storage. It uses Supabase for identity/session and calls ZenformedCore through Next.js BFF routes under `app/api/internal/`.

---

## 2. Current architecture assumptions

- **Shared auth** — Single browser Supabase client per app (`storageKey: buildcore-auth`), `SaaSProfileProvider`, `SaaSAuthGate`, soft refresh on tab focus via `@zenformed/core` (`resolveSaasProfileAuthReaction`).
- **Shared shell** — Dashboard chrome from `@zenformed/core/dashboard-shell` (`ZenformedDashboardAppShell`, sidebar branding, settings drawer, header patterns).
- **ZenformedCore on Railway** — `ZENFORMED_CORE_API_URL` points at the deployed Core HTTP API; local dev may use `http://localhost:4000`.
- **Mock-first frontend** — Next phases add TypeScript domain models and in-memory/mock data before any CRM schema or APIs.
- **No CRM backend yet** — Planning complete in [CRM_BACKEND_PLAN.md](./CRM_BACKEND_PLAN.md); no migrations, CRM tables, or `/api/crm` routes implemented.
- **BFF pattern** — Browser → BuildCore Next routes → ZenformedCore (Bearer from Supabase session).

### Repo layout (high level)

```
BuildCore/
  app/                    # Next.js App Router (login, dashboard, api BFF)
  src/
    application/          # ports, use cases (e.g. GetCurrentUser)
    domain/               # entities, value objects
    infrastructure/       # Supabase, Core API client, config, auth adapter
    domain/crm/           # CRM types (project, contact, pipeline, workflow, documents)
    platform/             # appDefinitions, navigation, content, mock/crm fixtures
    presentation/         # providers, hooks, dashboard shell components, SaaS auth UI
    shared/di/              # composition root
  electron/               # optional desktop wrapper
  docs/                   # this file
```

Root gate: `BuildCoreRootGate` → `SaaSProfileProvider` → `SaaSAuthGate` → `BrandingProvider` → `TenantProvider` → pages.

---

## 3. Completed work

- [x] **App registration** — `appSlug`: `buildcore` in `src/platform/appDefinitions/buildcore-app-runtime.json`; ZenformedCore registry + SQL seed documented in README (`registered-apps.json`, `seed-buildcore-platform.sql`).
- [x] **Local boot** — Dev server on port **3020** (`npm run dev`).
- [x] **SaaS auth flow** — Login, profile relay (`/api/internal/users-me-profile`), entitlement relay, onboarding/password/license gates (shared pattern with ForgeCore).
- [x] **Placeholder dashboard** — Sidebar, header, settings drawer, branding/avatar hooks; no CRM data yet.
- [x] **CRM mock foundation (Phase 1)** — Types under `src/domain/crm/`; 20 mock projects under `src/platform/mock/crm/` (default 12-stage pipeline).
- [x] **All-projects table (Phase 2)** — Mock pipeline table on `/dashboard` with header search, stage/priority filters, ForgeCore-aligned table chrome.
- [x] **Shared runtime fixes** (workspace + BuildCore):
  - Singleton Supabase browser client (`getOrCreateBrowserSupabaseAuthClient`) — no duplicate GoTrueClient.
  - npm workspaces / hoisted deps at `ZenformedCore/` root (avoids cross-app `node_modules` type bleed).
  - Soft profile refresh on token refresh / tab focus (no full-page loading shell when profile already mounted).
  - BuildCore-specific gate/dashboard guards so `useAuth` remount does not flash loading after focus.

---

## 4. Development phases

| Phase | Focus | Status |
|-------|--------|--------|
| **0** | Documentation and alignment (this doc, README, shared patterns with ForgeCore) | Done |
| **1** | Frontend mock foundation — domain types, mock fixtures, folder conventions | Done |
| **2** | All-projects pipeline table (search, sort, filter) | Done |
| **3** | Single project detail page | Done |
| **4** | UX and component refinement (shell + CRM widgets) | Done |
| **5** | Backend planning — schema, BFF, boundaries | Done (plan only) |
| **6** | Repository/service abstraction (mock provider; API-ready) | Done |
| **6b** | Consuming-app architecture standard (documentation) | Done |
| **7** | Backend read-only implementation (migrations + BFF) | **Paused** — see architecture doc before resuming |

---

## 5. Planned CRM concepts (vision)

Product direction — see [CRM_BACKEND_PLAN.md](./CRM_BACKEND_PLAN.md) §1.1–1.2 for navigation, CRUD, and documents.

### Dashboard (table)

- **List / search / filter** — Pipeline index of projects (read-only rows).
- **Row click** — Navigate to `/projects/{slug}` (unchanged; not inline edit).
- **`+` button** — Future: ForgeCore-style create drawer → `POST` project → redirect to new detail page.

### Detail page (primary edit surface)

- **Overview cards** — Contact, deal/payments, next step, pipeline progress.
- **Workflow tasks** — Status, assignee, due; **documents attach to tasks** (Documents column on task table).
- **Documents panel (bottom)** — Aggregate index of all task documents across the project.
- **Accountability** — Audit visibility (server-appended on mutations).
- **Milestones / payments** — Editable on detail later; not in table.

**Not planned:** inline editing in the main projects table.

---

## 6. Local development commands

From **BuildCore** (`ZenformedCore/BuildCore`):

| Command | Purpose |
|---------|---------|
| `npm install` | Install deps (workspace: run from monorepo root `ZenformedCore/` when linking siblings) |
| `cp .env.example .env.local` | Create env file |
| `npm run dev` | Next dev server → **http://localhost:3020** |
| `npm run build` | Production build |
| `npm run start` | Production server on 3020 |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint (Next) |
| `npm run electron:dev` | Electron + Next (optional) |

From **monorepo root** (`ZenformedCore/`):

| Command | Purpose |
|---------|---------|
| `npm install` | Install all workspaces |
| `npm run typecheck` | Typecheck all packages/apps |
| `npm run typecheck:buildcore` | BuildCore only |

ZenformedCore HTTP (sibling `ZenformedCore/ZenformedCore` — separate package): run per that repo’s README for local `:4000` API.

---

## 7. Validation checklist

Before merging CRM UI work, confirm:

- [ ] App boots at http://localhost:3020
- [ ] SaaS login succeeds for a user with `buildcore` entitlement
- [ ] Dashboard shell renders (sidebar, header, placeholder content)
- [ ] Tab/window blur → refocus does **not** show full-page “Loading…”
- [ ] Network tab: no burst of `users-me-profile` / branding on focus
- [ ] Hard refresh still bootstraps (loading shell on cold start is OK)
- [ ] Logout / login still works
- [ ] `npm run typecheck` passes (app or monorepo root)

---

## 8. Immediate next step

**Phase 7 — backend read-only (paused):** migrations (dev), API repository implementations, `GET /api/crm/projects` and `GET /api/crm/projects/:slug`. See [CRM_BACKEND_PLAN.md](./CRM_BACKEND_PLAN.md). Align implementation with [ZENFORMED_CONSUMING_APP_ARCHITECTURE.md](./ZENFORMED_CONSUMING_APP_ARCHITECTURE.md) before starting.

### Phase 6 — done

- CRM ports under `src/application/ports/crm/`; mock implementations under `src/infrastructure/crm/mock/`.
- `getCrmRepositories()` factory + `NEXT_PUBLIC_CRM_DATA_SOURCE` (`mock` \| `api`).
- Hooks use `listCrmProjectSummaries` / `getCrmProjectDetailBySlug` use cases (no direct `platform/mock/crm` imports in presentation).

### Phase 6b — done

- [ZENFORMED_CONSUMING_APP_ARCHITECTURE.md](./ZENFORMED_CONSUMING_APP_ARCHITECTURE.md) — layer rules, managers → ports/adapters, mock isolation, ForgeCore vs BuildCore patterns.

### Phase 5 — done (planning only)

- [CRM_BACKEND_PLAN.md](./CRM_BACKEND_PLAN.md) — tables, BFF, boundaries, migration path, security, risks.
- Navigation/CRUD: row click → detail (unchanged); `+` → create drawer → new detail; edits on detail only.
- Documents: task-attached primary; bottom panel = project aggregate index.

### Phase 4 — done

- Overview-first detail layout (contact + financials top row; pipeline → workflow → docs/accountability).
- Shared `crmShared.module.css` for pills, badges, avatars (list + detail).
- Stage chip row, task sorting/highlighting, document status badges.

### Phase 3 — done

- Route `/projects/[slug]` with `getMockCrmProjectDetailBySlug` and not-found state.
- Modular detail UI: header, contact, milestones, 12-stage progress bar, workflow tasks, documents, accountability, next-step.
- Row click navigates from dashboard projects table to detail; back button returns to `/dashboard`.

---

## Reference

- Quick setup: [../README.md](../README.md)
- **Consuming-app architecture:** [ZENFORMED_CONSUMING_APP_ARCHITECTURE.md](./ZENFORMED_CONSUMING_APP_ARCHITECTURE.md)
- **CRM backend plan:** [CRM_BACKEND_PLAN.md](./CRM_BACKEND_PLAN.md)
- ForgeCore: `ForgeCore/ForgeCore` (reference consuming app)
- Shared package: `zenformed-core-package` (`@zenformed/core`)
