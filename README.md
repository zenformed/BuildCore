# BuildCore

Initial **Zenformed consuming app shell** for a construction/trades CRM. This pass registers the app with ZenformedCore and boots SaaS auth + dashboard chrome via `@zenformed/core` — no CRM features yet.

## Prerequisites

- Node 20+
- Sibling checkout: `../zenformed-core-package` and (optional) `../ZenformedCore` HTTP server
- Same Supabase project as ForgeCore when using SaaS mode

## Setup

```bash
cd BuildCore
npm install
cp .env.example .env.local
# Edit .env.local — see below
npm run dev
```

App listens on **http://localhost:3020**.

## Environment (`.env.local`)

| Variable | Required | Purpose |
|----------|----------|---------|
| `NEXT_PUBLIC_SUPABASE_URL` | SaaS | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | SaaS | Supabase anon key |
| `NEXT_PUBLIC_SAAS_MODE` | yes | Must be `true` for this shell |
| `ZENFORMED_CORE_API_URL` | recommended | e.g. `http://localhost:4000` — BFF relays profile/entitlement/branding |

Optional: `ZENFORMED_APP_SLUG=buildcore` (Electron only; manifest default is `buildcore`).

## ZenformedCore registration

1. **HTTP registry** — `ZenformedCore/config/registered-apps.json` includes `buildcore`.
2. **Supabase** — run `ZenformedCore/sql/seed-buildcore-platform.sql` on the shared DB.

Verify Core lookup:

```bash
curl http://localhost:4000/apps/buildcore
```

With a user JWT:

```bash
curl -H "Authorization: Bearer <token>" http://localhost:4000/apps/buildcore/entitlement
```

BuildCore BFF (with dev server running):

- `GET http://localhost:3020/api/internal/apps/buildcore/entitlement`
- `GET http://localhost:3020/api/internal/users-me-profile`

## Verify auth + placeholder dashboard

1. Open `http://localhost:3020` → redirects to `/login` or `/dashboard`.
2. Sign in with a Supabase user that has an active profile/entitlement for `buildcore`.
3. Dashboard shows authenticated shell placeholder (sidebar, header, settings) — not CRM data.

## Shared package reuse

UI shell primitives come from `@zenformed/core/dashboard-shell` (`ZenformedDashboardAppShell`, settings drawer, license lockout, etc.). App-specific code lives under `src/platform/` and thin `BuildCore*` dashboard chrome.

## Electron (optional)

```bash
npm run electron:dev
```

Uses `PORT=3020` and `buildcore-app-runtime.json` from `src/platform/appDefinitions/`.
# BuildCore
