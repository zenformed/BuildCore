# BuildCore Interactive Demo

Foundation for the public interactive demo (`/demo`, `demo.buildcore.zenformed.com`).

## Runtime model

BuildCore runs in one of two application runtimes:

| Runtime | Detection | CRM data |
|---------|-----------|----------|
| **LIVE** | Default production paths | `NEXT_PUBLIC_CRM_DATA_SOURCE` (`mock` or `api`) |
| **DEMO** | `/demo/*` paths or `demo.*` host or `NEXT_PUBLIC_BUILDCORE_RUNTIME=demo` | Always in-memory mock + `localStorage` persistence |

Feature code should use:

- `runtimeModes.isDemoRuntime()` — runtime check
- `DemoModeProvider` / `useDemoMode()` — session lifecycle, reset, synthetic auth
- `demoSafetyPolicy.assertDemoOperationAllowed()` — block live side effects (uploads, comms, etc.)

Avoid scattering `if (demo)` in UI components.

## Demo environment (deploy)

```env
NEXT_PUBLIC_BUILDCORE_RUNTIME=demo
NEXT_PUBLIC_CRM_DATA_SOURCE=mock
NEXT_PUBLIC_SAAS_MODE=true
# Do not configure ZENFORMED_CORE_API_URL on demo-only deploys.
```

## Local development

Visit `http://localhost:3020/demo/dashboard` — no Platform login required.

Production `/dashboard` is unchanged and still requires the SaaS auth gate.

## State persistence

Demo CRM mutations are stored in `localStorage` under `buildcore_demo_session_v1`.
**Reset Demo** clears storage and re-seeds from fixtures.

## Safety

Demo mode blocks live uploads and communications via `demoSafetyPolicy.resolveDemoOperation()`:

- **Simulated:** direct uploads, project primary photo, email/SMS communications, task/customer notifications
- **Blocked:** billing mutations, team management, other live CRM mutations that bypass mock repositories

Uploads create fake document rows in mock project state (no Supabase, no `/api/crm/.../direct-uploads`).
Communications return success without calling `/api/crm/communications/send`.

## Demo routes

- `/demo/dashboard` — projects pipeline
- `/demo/reports` — financial reports (mock data; export disabled)
- `/demo/workflow-settings` — workflow stage customization (local demo persistence)
- `/demo/teams` — view-only team members and permissions (no org API calls)
- `/demo/projects/[slug]` — project overview
- `/demo/projects/[slug]/tasks|financials|documents|accountability|budget`
- `/demo/projects/[parent]/[sub]` — nested subproject routes (same tab set)

All in-app navigation under demo stays prefixed with `/demo`.

## Project CRUD (demo)

In demo runtime, project and subproject create, edit, archive/delete, and mark inactive/active run through mock repositories and `localStorage` only. Production `/dashboard` and API-backed CRM behavior is unchanged.

## Reports (demo)

- `/demo/reports` reuses the production reports UI with mock CRM data.
- Report calculations include demo CRUD changes via `listEffectiveMockProjectSummaries`.
- **Reset Demo** restores seeded report fixtures.
- Organization export and PDF export are disabled in demo (no `/api/crm/reports/export` calls).

## Settings (demo)

Opening settings in demo shows a demo-safe panel instead of the shared `@zenformed/core` organization settings overlay. No account or settings API calls are made.

## Workflow settings (demo)

- `/demo/workflow-settings` reuses the production workflow settings UI.
- Stage rename, reorder, add, and delete run locally against demo `localStorage` (no `/api/internal/organization/pipeline-stages` calls).
- **Reset Demo** restores seeded workflow stages.
- Customer task reminder settings on the Alerts tab are read-only in demo.

## Teams (demo)

- `/demo/teams` reuses the production Teams UI with seeded mock organization members.
- Team management is view-only: no invites, role changes, seat edits, or permission writes.
- Organization workspace APIs are not called in demo.

