# BuildCore

Zenformed **consuming app shell** for a future construction/trades CRM. Boots SaaS auth and shared dashboard chrome via `@zenformed/core` — **no CRM features yet**.

**Progress, phases, and roadmap:** [docs/PROGRESS.md](docs/PROGRESS.md)

## Prerequisites

- Node 20+
- Sibling checkout: `../zenformed-core-package` (and ZenformedCore HTTP API for BFF relays)
- Same Supabase project as other Zenformed apps when using SaaS mode

## Setup

```bash
cd BuildCore
npm install
cp .env.example .env.local
# Edit .env.local — see below
npm run dev
```

App: **http://localhost:3020**

From monorepo root (`../`):

```bash
npm install
npm run typecheck:buildcore
```

## Environment (`.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | SaaS | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SaaS | Supabase anon key |
| `NEXT_PUBLIC_SAAS_MODE` | yes | Must be `true` for this shell |
| `ZENFORMED_CORE_API_URL` | recommended | ZenformedCore on Railway or `http://localhost:4000` |

Optional: `ZENFORMED_APP_SLUG=buildcore` (Electron only; manifest default is `buildcore`).

## ZenformedCore registration

1. **HTTP registry** — `ZenformedCore/config/registered-apps.json` includes `buildcore`.
2. **Supabase** — run `ZenformedCore/sql/seed-buildcore-platform.sql` on the shared DB.

Verify Core:

```bash
curl http://localhost:4000/apps/buildcore
curl -H "Authorization: Bearer <token>" http://localhost:4000/apps/buildcore/entitlement
```

BuildCore BFF (dev server running):

- `GET http://localhost:3020/api/internal/apps/buildcore/entitlement`
- `GET http://localhost:3020/api/internal/users-me-profile`

## Verify auth + placeholder dashboard

1. Open http://localhost:3020 → `/login` or `/dashboard`.
2. Sign in with a Supabase user entitled for `buildcore`.
3. Dashboard shows shell placeholder (sidebar, header, settings) — not CRM data.
4. Blur/refocus the browser tab — dashboard should stay visible (no full-page loading flash).

## Shared package reuse

- `@zenformed/core` — browser Supabase singleton, `resolveSaasProfileAuthReaction`, entitlement helpers
- `@zenformed/core/dashboard-shell` — `ZenformedDashboardAppShell`, settings drawer, page loading, sidebar branding

App-specific code: `src/platform/`, `src/presentation/components/DashboardShell/`, thin feature hooks.

## Electron (optional)

```bash
npm run electron:dev
```

Uses port **3020** and `src/platform/appDefinitions/buildcore-app-runtime.json`.

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Dev server (port 3020) |
| `npm run build` | Production build |
| `npm run start` | Start production server |
| `npm run typecheck` | TypeScript check |
| `npm run lint` | Next ESLint |
