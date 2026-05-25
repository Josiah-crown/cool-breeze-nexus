# AGENTS.md — Cmonitor repo instructions for AI agents

**Product:** Cmonitor (Crown Technologies) · React/Vite + Supabase  
**Full context:** [`AAA_CLAUDE.md`](./AAA_CLAUDE.md) (identity, architecture, bootstrap, OPP)  
**Cursor runbook (session flow, verify, handoff):** [`.cursor/rules/cmonitor-agent-opp.mdc`](./.cursor/rules/cmonitor-agent-opp.mdc)

## Session start (required)

1. Confirm **today’s date** from the environment — not from log file timestamps.
2. Read **Agent operating procedure** in `AAA_CLAUDE.md` before editing files.
3. For BMS work: read `docs/PRD-BMS.md`.
4. For session logs: follow `DAILY_LOGS/DAILY_LOG_CHECKLIST.md`.

## Hard rules

- **Past daily logs are immutable** — never edit `DAILY_LOGS/YYYY-MM-DD_*.md` if date &lt; today.
- **No git commits** unless the user explicitly asks.
- **No rewriting applied migrations** — add a new migration file instead.
- **RLS is authoritative** — fix access in Supabase policies, not UI-only bypasses.
- **No secrets** in commits (`.env`, credentials).
- **Minimal code scope** — match existing patterns; user wins on scope conflicts.

## Product naming

- **Cmonitor** = platform (Layer 1 monitoring live, Layer 2 BMS in development)
- **Crown Technologies** = owner/installer · **AirComms** = marketing/checkout channel

## Commercial / legal (summary)

- **Per-site agreements** and schedule binding: see `docs/PRD-BMS.md` (§2.6–2.6.3). Legal state is scoped to **`site_id`** where applicable.
- **Dashboard (machines):** machines are grouped under **BMS sites** (floorplan pins → building → site); each site is a **collapsible section defaulting to open**. **API keys / ESP ingest** live on the **machine detail** sheet (bottom), not the dashboard grid.

## New machine / non-Cursor AI

See **“New machine / new AI bootstrap”** in `AAA_CLAUDE.md` — includes a copy-paste first message for Claude or a fresh Cursor chat.
