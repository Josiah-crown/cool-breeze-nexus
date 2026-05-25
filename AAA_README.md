# Cool Breeze BMS

Multi-tenant Building Management System with IoT device integration, visual layout tooling (Site ERF + building floor layouts), and humidity monitoring/playback.

## Quick start (dev)
- Start here: `AAA_README_DEV.md`

## Master docs (repo root)
- `AAA_OVERVIEW.md`
- `AAA_ARCHITECTURE.md`
- `AAA_ROADMAP.md`
- `AAA_REPORTING.md`
- `AAA_CLAUDE.md`

## BMS product requirements
- `docs/PRD-BMS.md` — sites, buildings, layouts, humidity control, and planned building-controls modules

## Agent operating procedure
- `AGENTS.md` — short OPP for **any AI tool** (Copilot, Claude Code, Cursor, etc.)
- `.cursor/rules/` — **auto-loaded in Cursor** on any machine that opens this repo
- `AAA_CLAUDE.md` — full context + **New machine / new AI bootstrap** (disaster recovery, Claude planning)
- `DAILY_LOGS/DAILY_LOG_CHECKLIST.md` — how to create logs; past logs must not be edited

## Docs navigation (new intent-based folders)
- `docs/planning/`: tasklists + process
- `docs/product/`: wireframes/specs (incl. Dashboard hub + Site ERF)
- `docs/architecture/`: deeper design notes
- `docs/analysis/`: investigations/debug writeups
- `docs/marketing/`: marketing handoffs/content plans

## Development

```bash
npm install
npm run dev
```

## Sales / offers (May 2026)
- **Routes:** `/offers`, `/offers/:id`, `/pricing` — in-app **browse only**; checkout on partner site (`VITE_PARENT_CHECKOUT_URL`, default AirComms; app appends `?offer=<id>`).
- **QC1 quote builder:** on hold (not linked). See `docs/PRD-BMS.md` §4.5–4.6; legacy product notes may live under `docs/product/`.

## Key project folders
- `src/`: frontend
- `supabase/`: migrations + edge functions
- `hardware/`: ESP32 firmware
- `scripts/`: sql/backup/utilities
- `DAILY_LOGS/`: daily logs (kept at repo root)
