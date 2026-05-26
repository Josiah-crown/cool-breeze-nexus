# AGENTS.md — Cmonitor repo instructions for AI agents

**Monitoring system:** Cmonitor · **Accounts:** AirComms · **Brands:** Crown Technologies · React/Vite + Supabase  
**Full context:** [`AAA_CLAUDE.md`](./AAA_CLAUDE.md) (identity, architecture, bootstrap, OPP)  
**Cursor runbook (session flow, verify, handoff):** [`.cursor/rules/cmonitor-agent-opp.mdc`](./.cursor/rules/cmonitor-agent-opp.mdc)

## Session start (required)

1. Confirm **today’s date** from the environment — not from log file timestamps.
2. Read **Agent operating procedure** in `AAA_CLAUDE.md` before editing files.
3. For **accounts / roles / RLS / provisioning:** read [`AccountsContext.md`](./AccountsContext.md).
4. For BMS work: read `docs/PRD-BMS.md`.
5. For session logs: follow `DAILY_LOGS/DAILY_LOG_CHECKLIST.md`.

## Hard rules

- **Past daily logs are immutable** — never edit `DAILY_LOGS/YYYY-MM-DD_*.md` if date &lt; today.
- **No git commits** unless the user explicitly asks.
- **No rewriting applied migrations** — add a new migration file instead.
- **RLS is authoritative** — fix access in Supabase policies, not UI-only bypasses.
- **No secrets** in commits (`.env`, credentials).
- **Minimal code scope** — match existing patterns; user wins on scope conflicts.

## Product naming

- **Cmonitor** = monitoring device and system (Layer 1 live, Layer 2 BMS in development)
- **AirComms** = where customer accounts reside (login, profile, roles)
- **Crown Technologies** = owns brand names (Cmonitor, AirComms, Cirrus); installer operator; **Paystack sales** on Crown website

## Accounts (summary)

Platform roles in `user_roles`: `super_admin`, `company`, `installer`, `client`. UI gating: `src/lib/accountRoles.ts`. Full matrix, hierarchy, RLS, and sync rules: [`AccountsContext.md`](./AccountsContext.md).

## Production DB backlog (May 2026)

Hosted **IOT-nexus** may still need migrations not applied via CLI (slow/manual SQL partial runs). **Before fixing “client can’t see machines after site owner change”:** apply `20260527160000_sync_site_machines_safe_no_card_order_v1.sql`, then `SELECT sync_site_machines_to_owner(site_id)`. Checklist: `scripts/sql/PRODUCTION_BMS_MIGRATION_CHECKLIST.sql`. CLI: `SUPABASE_DB_PASSWORD` + `npx supabase db push --linked --yes`. Details: `DAILY_LOGS/2026-05-26_PRODUCTION_MIGRATIONS_AND_SITE_OWNER_SYNC.md`.

## Commercial / legal (summary)

- **Per-site agreements** and schedule binding: see `docs/PRD-BMS.md` (§2.6–2.6.3). Legal state is scoped to **`site_id`** where applicable.
- **Dashboard (machines):** machines are grouped under **BMS sites** (floorplan pins → building → site); each site is a **collapsible section defaulting to open**. **API keys / ESP ingest** live on the **machine detail** sheet (bottom), not the dashboard grid — **hidden for `client` role** (`src/lib/accountRoles.ts`: `canManageMachines` / `isClientViewer`).
- **Sites (Layer 2):** clients have **view-only** access (`user_can_manage_site` excludes clients). They reach **`/dashboard/sites`** via tab **Sites (view)** or dashboard **View sites**; ERF machine icons open **`MachineDetailView`** without layout edit controls.
- **Public demo (logged out):** **`/dashboard/demo`** → read-only Sites (`get_public_client_demo`, `sites.is_public_client_demo`). Marketing taskbar: **Demo dashboard** + Client login; on demo pages: **Contact us** + Client login. Migration: `20260527000000_public_client_demo_v1.sql`.

## New machine / non-Cursor AI

See **“New machine / new AI bootstrap”** in `AAA_CLAUDE.md` — includes a copy-paste first message for Claude or a fresh Cursor chat.
