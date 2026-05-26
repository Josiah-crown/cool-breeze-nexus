# AAA_CLAUDE.md — Cmonitor Platform (AI Context for Cursor)

## CRITICAL IDENTITY (DO NOT DRIFT)
- **Cmonitor**: the **monitoring device and system** (hardware ingest, machines, readings, alerts, dashboards; Layer 1 production, Layer 2 BMS in development). NOT “Cool Breeze BMS”, NOT “IoT Nexus”.
- **AirComms**: **where customer accounts reside** (login, profiles, roles, billing, Account/legal UX). AirComms.com / .co.za is the account home brand.
- **Brand owner**: **Crown Technologies** — owns the brand names **Cmonitor**, **AirComms**, and **Cirrus** (Johannesburg HVAC installer/maintenance operator).
- **Sales / Paystack checkout**: **Crown Technologies website** (e.g. crowntechnologies.co.za) — customers are **referred here** to buy; not in-app Paystack. After payment, an **AirComms account** is provisioned; the customer signs in to use **Cmonitor** (`CMONITOR_APP_URL` = monitoring app host).
- **Cirrus**: Equipment brand under Crown; sells to the market (sister-company positioning in market; brands owned by Crown).
- **Reality**: **Layer 1 machine monitoring is production-live**. **Layer 2 BMS/spatial is in active development**.
- **Onboarding workflow (authoritative)**: `docs/CMONITOR_ONBOARDING_WORKFLOW.md` — Crown Technologies checkout → Paystack webhook → Supabase user + paid order → login; **public demo** is read-only Sites at `/dashboard/demo` (live site flagged `is_public_client_demo`, machines with `demo` in name — no per-account demo machines).

## Agent operating procedure (OPP)

**Read this at the start of every session.** All agents (Cursor, subagents, CLI) must follow these rules on this repo.

### Session start
1. Confirm **today’s date** from the user environment — do not infer from file timestamps or latest log filename.
2. Skim this file for product identity and routes before changing UI or docs.
3. **Accounts / roles / RLS / provisioning:** read [`AccountsContext.md`](AccountsContext.md) before changing behavior.
4. If creating or closing a session log, follow `DAILY_LOGS/DAILY_LOG_CHECKLIST.md`.

### File touch policy

| Category | Rule |
|----------|------|
| **Past daily logs** (`DAILY_LOGS/YYYY-MM-DD_*.md`, date &lt; today) | **Immutable** — never edit. Use a correction addendum or today’s log. |
| **Today’s daily log** | Append/update only during the **same session**. |
| **Living product docs** | Edit in place: `docs/PRD-BMS.md`, `docs/CMONITOR_ONBOARDING_WORKFLOW.md`, etc. |
| **Accounts / roles** | Edit `AccountsContext.md` first; then sync files listed in its **SYNC REQUIRED** block |
| **Archive** (`docs/archive/`) | **Read-only** unless the user explicitly asks to revise archived sources. |
| **Secrets** (`.env`, `*.env`, credentials) | Never commit or paste. Do not overwrite without explicit user request. |
| **Applied migrations** (`supabase/migrations/`) | Do not rewrite migrations already run in production; add a **new** migration instead. |
| **AAA_README.md** | Repo entry point — keep accurate; minimal edits only. |

### Git
- **No commits** unless the user explicitly asks.
- **No force push** to `main`/`master`.
- Never skip hooks or amend commits unless user rules allow and conditions are met.

### Code changes
- **Minimal scope** — only what the task requires; match existing patterns in surrounding files.
- **RLS is authoritative** — access fixes belong in Supabase policies, not frontend-only bypasses.
- Run/build/test when feasible after non-trivial changes; report failures honestly.

### Documentation
- Consolidate into **one living PRD** (`docs/PRD-BMS.md`) for BMS; do not recreate scattered humidity-only PRDs.
- When merging docs, **move superseded files to archive** — do not delete history without asking.
- Do not create new markdown files the user did not ask for (except session logs per checklist).

### Product naming (when writing user-facing copy)
- **Cmonitor** = monitoring device/system (machines, live data, alerts). **AirComms** = account home (login, profile, agreements).
- BMS/spatial features are **Layer 2** on the Cmonitor monitoring stack.
- **Crown Technologies** = owns brand names; installer operator; **Paystack sales** (refer customers to Crown website).
- **AirComms** = where accounts reside; not the Paystack checkout host.

### Escalate to the user
- Unclear whether a past log or migration is already applied in production.
- Task would edit immutable files, secrets, or destructive git operations.
- Product identity or scope conflict between this file and the user’s latest message (user wins).

---

## New machine / new AI bootstrap

Use this when the repo moves to **another PC**, **another person’s Cursor**, **Claude** (web/app), or any fresh agent with no chat history.

### Will a different Cursor install “just know” this project?

| What transfers | How |
|--------------|-----|
| **Repo rules (automatic in Cursor)** | Committed `.cursor/rules/*.mdc` with `alwaysApply: true` — loaded when the folder is opened |
| **Cross-tool pointer** | Committed `AGENTS.md` at repo root (Cursor, Copilot, Claude Code, others) |
| **Full product context** | This file (`AAA_CLAUDE.md`) — read on demand or via first message below |
| **User Rules in Cursor settings** | **Does not transfer** — they are per-account, not in git |
| **Chat history** | **Does not transfer** — new machine = blank conversation |
| **`.env` / secrets** | **Not in git** — restore from your secure backup |
| **`DAILY_LOGS/`** | Often local-only (gitignored) — copy separately or rely on checklist + new logs |

**Bottom line:** Another Cursor user gets **operating rules automatically** if `.cursor/rules/` and `AGENTS.md` are committed. They still need **this file** for full product/architecture context on non-trivial work, and **`.env`** for running the app.

### Human setup (~5 minutes, new machine)

1. **Clone** the repo (or restore from backup).
2. **Install deps:** `npm install`
3. **Restore secrets:** copy `.env` / `.env.local` from secure storage (never commit).
4. **Open folder in Cursor** (or your AI editor) — project rules should appear under Cursor **Rules**.
5. **Optional:** In Cursor → Settings → Rules, add a user rule: “On this repo, follow `AAA_CLAUDE.md` OPP.”
6. **Sync daily logs** if you rely on history: copy `DAILY_LOGS/` from backup, or start fresh logs from today only.

### First message — paste into any new AI session

Copy, fill in the last line, send **before** the agent edits anything:

```
Project: Cmonitor (Crown Technologies) — React/Vite + Supabase IoT platform.
Layer 1 machine monitoring is production-live. Layer 2 BMS/spatial is in development.

Before making any changes:
1. Read AAA_CLAUDE.md (product identity + Agent OPP — especially daily log immutability).
2. If creating a session log: read DAILY_LOGS/DAILY_LOG_CHECKLIST.md.
3. For BMS/sites/buildings/humidity scope: read docs/PRD-BMS.md.

Hard rules:
- Do NOT edit daily logs dated before today.
- Do NOT commit unless I explicitly ask.
- Do NOT rewrite migrations already applied in production — add new migrations.
- RLS fixes belong in Supabase, not frontend-only bypasses.
- Product name in user-facing copy: Cmonitor (not “Cool Breeze BMS” / “IoT Nexus”).

Today's date: [YYYY-MM-DD]
My task: [describe what you want done]
```

### Read order for agents (full context)

| Order | File | When |
|-------|------|------|
| 1 | `AGENTS.md` | Always (short OPP; auto on many tools) |
| 2 | `AAA_CLAUDE.md` | Always for non-trivial work (this file) |
| 3 | `AAA_README.md` | Dev entry, folder map |
| 4 | `docs/PRD-BMS.md` | BMS / sites / buildings / humidity |
| 5 | `DAILY_LOGS/DAILY_LOG_CHECKLIST.md` | Creating or closing a session log |
| 6 | Task-specific code/migrations | After the above |

### Using Claude (web, app, or API) without Cursor

There is **no automatic repo context**. Do one of:

- **Attach** `AAA_CLAUDE.md` (+ `docs/PRD-BMS.md` if BMS work) to the conversation, **or**
- Paste the **First message** block above and ask Claude to read those paths if it has filesystem access (Claude Code / desktop with folder access).

For planning-only sessions, attaching **OPP + PRD-BMS** is usually enough; skip migrations unless schema work is planned.

### Disaster recovery checklist

- [ ] Repo clone/backup current
- [ ] `.env` backed up securely off-machine
- [ ] `AAA_CLAUDE.md`, `AGENTS.md`, `.cursor/rules/` committed and pushed
- [ ] Optional: periodic zip of `DAILY_LOGS/` (not in git by default)
- [ ] Supabase project URL/keys documented in your password manager (not in repo)

---

## PLATFORM OVERVIEW (TWO LAYERS)
```
CMONITOR PLATFORM (iotnexus.site + Supabase)

LAYER 1: MACHINE MONITORING  ✅ PRODUCTION LIVE
  ESP32 → Edge Function → readings_raw (universal) → DB triggers → processed tables → realtime UI

LAYER 2: SPATIAL / BMS         ⏳ IN DEVELOPMENT
  Sites → Buildings → Floors + ERF maps + floor layout editor + humidity playback
  (future) presence automation
```

## TECH STACK (ACTUAL)
- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
- Routing: React Router with **nested** `/dashboard/*`
- Charts: Recharts (historical graphs)
- Canvas: Konva (floor layout editor)
- Maps/visuals: Leaflet (used in parts), ERF visualization (site view)
- Backend: Supabase (Postgres + RLS + Storage + Realtime + Edge Functions)
- Hosting: cPanel deploy of Vite build (`dist/` → public_html); `public/.htaccess` — SPA rewrite + no-cache `index.html` after FTP deploy
- Hardware: ESP32 (2.4GHz WiFi), CT sensors, DS18B20 temperature, voltage pickup dividers

## ROUTES (CURRENT, MAY 2026)
### Public
- `/` marketing home — CTAs to `/dashboard/demo`, client login, Crown Technologies sales (`VITE_PARENT_CHECKOUT_URL`, default `https://crowntechnologies.co.za/booking`). Logged-out taskbar: **Demo dashboard** + **Client login**.
- `/dashboard/demo` → `/dashboard/demo/sites` — **public client demo** (no login): read-only `Sites.tsx` via RPC `get_public_client_demo()`; set `sites.is_public_client_demo = true` + demo-named machines. Taskbar: **Contact us** + **Client login**. Logged-out `/dashboard` redirects here. Paid clients get **no** seeded demo machines on their account.
- `/login` authentication
- `/pricing` Cmonitor plans and indicative pricing; **purchase** opens **Crown Technologies sales URL** (`VITE_PARENT_CHECKOUT_URL`) with `?offer=monitoring` — **no in-app Paystack**
- `/offers`, `/offers/:offerId` — offer list + detail; CTAs redirect to **Crown Technologies website** (or mail for custom SLA quotes)
- `/maintenance` maintenance / repair lead form
- `/checkout/success` — legacy URL; purchases complete on Crown Technologies website (see `docs/PRD-BMS.md` §4.5)
- **QC1 quote builder:** **on hold** (routes removed). Residual modules: `src/components/quotes/*`, `src/lib/quote*`, `src/types/quotes.ts`; doc `docs/product/SOLAR_QUOTING.md` may be stale until feature returns.

### Authenticated (Dashboard hub)
- `/dashboard/*` nested hub layout
  - **Dashboard home (`/dashboard`)** — machine cards grouped by **BMS site** (machines placed on a site’s building floorplan). Each site is a **collapsible block defaulting to open**; machines not pinned to any site appear under **“Not on a site map”**. Hierarchy tree + company filter dropdown were removed from this page. **Installers/companies/super_admin:** toolbar **Add machine**, **Add client / user**, **Sites**, **Settings**. **`client` role:** **Refresh** + **View sites** only; machine cards and detail sheet are read-only (no rename, alerts config, ESP keys). Helpers: `src/lib/accountRoles.ts` (`canManageMachines`, `isClientViewer`). Poll/realtime refetch uses background reload (no full-page spinner after first load).
  - **`/dashboard/sites`** (`Sites.tsx`, embedded in hub) — ERF plan, buildings, machine pins. **Clients and installers:** view-only layout (`user_can_manage_site` false — migration `20260527140000`); tap ERF machine icon or machine card → **`MachineDetailView`**. **Company + super_admin:** upload ERF, assign client site owner, company assignment, draw outlines, place/move pins. **Installers** commission machines on dashboard / machine detail (API keys), not Sites layout. Manual: `docs/CMONITOR_SITES_ERF_MANUAL.md`. Accounts: [`AccountsContext.md`](AccountsContext.md).
  - buildings opened from within sites flow

### Legal / commercial (PRD pointers)

- **Per-site agreements** (SLA schedules, offline upload, paper-on-file): canonical model is **one agreement lifecycle per `site_id`** — see `docs/PRD-BMS.md` §2.6–2.6.3.

### Specialized views
- `/buildings/:id/designer` floor layout editor
- `/buildings/:id` humidity monitoring + playback

## WHERE THINGS LIVE (CODE POINTERS)
### Routing + layouts
- Main routing: `src/App.tsx`
- **Quoting (on hold):** QC1 workbook code remains under `src/components/quotes/`, `src/lib/quoteCalculations.ts`, `src/lib/quoteStorage.ts`, `src/config/qc1Catalog.ts` (not routed in app)
- Dashboard hub layout: `src/pages/DashboardLayout.tsx`
- Public demo layout: `src/pages/DemoDashboardLayout.tsx`, `src/lib/publicClientDemo.ts`, `src/hooks/usePublicClientDemo.ts`
- Dashboard home: `src/pages/Dashboard.tsx` (site-grouped machine grid: `src/components/DashboardSiteMachineSections.tsx`, `src/hooks/useSiteMachineGroups.ts`)
- Machine expanded sheet: `src/components/MachineDetailView.tsx` (ESP ingest + API keys at bottom)
- Sites + ERF UI: `src/pages/Sites.tsx`, `src/components/SiteErfMachinePins.tsx`, `src/components/SiteErfOutlineLayer.tsx`
- Role helpers (UI gating): `src/lib/accountRoles.ts`
- Shared top bar: `src/components/TopTaskbar.tsx`

### Monitoring / historical data (Layer 1)
- Manufacturer mapping: `src/lib/machineConfig.ts`
- Roles UI config: `src/lib/roleConfig.ts` (note: DB has `super_admin` too)
- Historical queries wrapper: `src/lib/historicalData.ts`
- Machine data hooks: `src/hooks/useMachineData.tsx`

### Supabase edge functions
- ESP32 ingestion: `supabase/functions/esp32-data-receiver/index.ts`
- Historical edge fn (if used): `supabase/functions/get-historical-data/index.ts`

## DATA ARCHITECTURE

### LAYER 1 — MACHINE MONITORING (PRODUCTION)
**Canonical flow (matches repo):**
```
ESP32
  → POST /functions/v1/esp32-data-receiver  (Authorization: Bearer <machine api key>)
  → validate key in api_keys
  → INSERT into readings_raw (UNIVERSAL)
  → DB triggers/processors populate manufacturer processed tables
  → UI reads processed tables + realtime updates
```

**Key tables (repo reality):**
- Universal ingest: `readings_raw`
- Registry/auth: `machines`, `api_keys`
- Generic configuration (used across manufacturers):
  - `machine_voltage_config`
  - `machine_alert_config`
  - `machine_notification_preferences`
  - `machine_connection_status`
- Manufacturer processed tables (IMPORTANT: not “*_calculated”):
  - `cirrus`
  - `coolbreeze`
  - `alliance`
- Manufacturer alert history tables:
  - `cirrus_alerts`
  - `coolbreeze_alerts`
  - `alliance_alerts`

**Supported manufacturers (production/dev):**
- Cirrus (evaporative)
- CoolBreeze (evaporative + some AC routing)
- Alliance (heat pump)

**Cadence (hardware behavior):**
- Typical: ESP32 averages readings, connects WiFi, posts, disconnects (commonly ~2 minutes). Treat this as the baseline expectation for rate-limit logic.

**Historical graphs:**
- Periods exist via migrations and UI helpers; key artifacts:
  - `supabase/migrations/20260421000000_add_7d_3m_historical_period.sql`
  - `supabase/migrations/20260421000001_add_30d_10m_and_1y_1h_periods.sql`
  - `supabase/migrations/20260422000000_add_get_historical_data_json_wrapper.sql`
  - `src/lib/historicalData.ts`
  - `supabase/functions/get-historical-data/index.ts` (present)

### LAYER 2 — SPATIAL / BMS (IN DEVELOPMENT)
**Hierarchy:**
```
Site
  ├─ ERF asset (1 image per site)
  └─ Building wireframes (rectangles on ERF)
      └─ Buildings → Floors
          ├─ floorplan image
          ├─ pins (machine positions)
          └─ humidity playback (per building)
```

**Key tables/migrations:**
- Sites foundation:
  - `supabase/migrations/20260413000000_create_sites.sql`
  - `supabase/migrations/20260430000000_buildings_and_humidity_v1.sql`
  - `supabase/migrations/20260430000001_create_site_rpc.sql`
- Site ERF + machine positions (May 2026):
  - `supabase/migrations/20260521120000_site_erf_and_machine_positions_v1.sql` — `site_erf_assets`, `site_machine_positions`, building `polygon_pct`
  - `supabase/migrations/20260506000010_site_erf_and_shapes_v1.sql` (legacy shapes table; polygon path preferred)
- Sites access + client read-only (May 21–25):
  - `20260522100000_sites_manage_policies_v1.sql`
  - `20260522110000_create_site_client_owner_v1.sql` — `create_site(..., p_owner_id)`
  - `20260522120000_sites_company_and_access_v1.sql` — `sites.company_id`, expanded access helpers
  - `20260522130000_sites_client_readonly_v1.sql` — clients cannot `user_can_manage_site`

**Storage (current MVP shortcut):**
- Bucket: `floorplans`
- ERF objects stored as: `site-erf/<site_id>/<timestamp>.<ext>`

**Current BMS shipped features (v1):**
- Site ERF upload + building wireframe placement + click to open building
- Floor layout editor (Konva) with machine positioning
- Humidity monitoring + 7-day playback + CSV export

**Next BMS work:**
- ERF v2 editing: drag/move, resize, rename labels, delete/undo safety
- Layout editor UX improvements (placement workflow)
- Future: link Layer 1 `machines` → Layer 2 floor pins for spatial context; later zones + presence automation

## USER ROLES + SECURITY (RLS-ENFORCED)

**Authoritative account model:** [`AccountsContext.md`](AccountsContext.md) — platform roles (`user_roles`), org assignments, `sites.owner_id` / `machines.owner_id`, site memberships, capability matrix, RPCs.

**UI gating:** `src/lib/accountRoles.ts` · **Display labels:** `src/lib/roleConfig.ts` (no `super_admin` in roleConfig).

Security model: Supabase **RLS everywhere**. Never “fix access” only in frontend — verify DB policies and service-role usage in edge functions.

## ESP32 HARDWARE NOTES (HIGH-SIGNAL)
- **Avoid ADC2 pins** on ESP32 (WiFi conflict): 25,26,27,12,13,14,2,15,4
- Voltage pickup uses divider (typical 12V logic threshold ~6V) and maps into `readings_raw.voltage_input_*`
- CT sensing + RMS sampling used to infer load/current (manufacturer logic differs)

Firmware pointers (repo):
- `hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino`
- `hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2_Optimized/ESP32_HVAC_CoolBreezeNexus_V2_Optimized.ino`
- `hardware/esp32/ESP32_General_Universal/ESP32_General_Universal.ino`

## DEPLOYMENT (PRACTICAL)
- Build: Vite → `dist/`
- Deploy: upload `dist/` contents to cPanel `public_html/` (SPA routing must work)
- Supabase provides DB/Auth/Storage/Edge Functions/Realtime

## SOURCES OF TRUTH
- **Accounts / roles:** [`AccountsContext.md`](AccountsContext.md)
- Layer 1 schema + roles: `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
- Layer 2 ERF work: `DAILY_LOGS/2026-05-06_DASHBOARD_HUB_AND_SITE_ERF_WIREFRAMES.md`
- BMS migrations: `supabase/migrations/20260430*` + `20260506000010_site_erf_and_shapes_v1.sql`
- Production DB backlog (site owner sync, installer layout readonly): [`AGENTS.md`](AGENTS.md), `scripts/sql/PRODUCTION_BMS_MIGRATION_CHECKLIST.sql`

