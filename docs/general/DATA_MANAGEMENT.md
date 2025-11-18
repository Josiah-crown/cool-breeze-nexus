# Data Management & Organization System

## Overview
This document outlines our file organization and workflow management system to maintain clarity and efficiency across development sessions.

---

## 📁 Folder Structure

### Daily Workflow: `TODAY/` Folder
**Purpose:** Central location for all files needed during the current work session.

**Usage:**
- Place all SQL scripts, diagnostics, and temporary files here at the start of the day
- Keep files organized by task/priority
- Move completed files to proper locations at end of day

**Benefits:**
- No searching through multiple folders during active work
- Clear separation of "work in progress" vs "archived"
- Easy cleanup at end of day

### Historical Archives: `supabase/migrations/historical/YYYY-MM-DD/`
**Purpose:** Archive SQL scripts and migrations organized by date.

**Structure:**
```
supabase/migrations/historical/
  ├── 2025-11-18/
  │   ├── 01_FIX_MANUFACTURER_FOR_EXISTING_MACHINE.sql
  │   ├── 15_FIX_TABLE_PERMISSIONS.sql
  │   └── ...
  ├── 2025-11-19/
  │   └── ...
  └── ...
```

**Contents:**
- SQL scripts (fixes, diagnostics, migrations)
- One-time fixes that aren't part of the main migration sequence
- Diagnostic queries
- Troubleshooting scripts

**Naming Convention:**
- Use descriptive names with numbers for ordering: `01_`, `02_`, etc.
- Include purpose in filename: `FIX_`, `CHECK_`, `DIAGNOSE_`, etc.

### Documentation Archives: `docs/supabase/historical/YYYY-MM-DD/`
**Purpose:** Archive documentation and guides organized by date.

**Structure:**
```
docs/supabase/historical/
  ├── 2025-11-18/
  │   ├── QUICK_CHECK_HISTORICAL_DATA.md
  │   ├── TEST_RLS_FROM_FRONTEND.md
  │   └── ...
  └── ...
```

**Contents:**
- Troubleshooting guides
- Diagnostic documentation
- Temporary reference materials
- Session-specific notes

### Permanent Documentation: `docs/supabase/`
**Purpose:** Long-term reference documentation that applies across sessions.

**Examples:**
- `RLS_POLICY_TEMPLATE_FOR_NEW_TABLES.md` - Template for future use
- `HISTORICAL_DATA_SETUP_COMPLETE.md` - Setup documentation
- `VERIFY_HISTORICAL_DATA.sql` - Reusable diagnostic scripts

### Daily Logs: `DAILY_LOGS/`
**Purpose:** Session summaries and accomplishments.

**Naming:** `YYYY-MM-DD_SESSION_SUMMARY.md`

**Contents:**
- What was accomplished
- Issues encountered and resolved
- Files created/modified
- Key learnings
- Next steps

---

## 🔄 Daily Workflow

### Start of Day:
1. Create/update `TODAY/` folder
2. Add files needed for today's work
3. Create `README.md` in `TODAY/` with:
   - Files to run (in order)
   - Purpose of each file
   - Current issues being addressed

### During Work:
1. Keep all work files in `TODAY/` folder
2. Update `README.md` as needed
3. Create diagnostic files as needed

### End of Day:
1. Create daily log in `DAILY_LOGS/YYYY-MM-DD_SESSION_SUMMARY.md`
2. Move SQL files to `supabase/migrations/historical/YYYY-MM-DD/`
3. Move documentation to `docs/supabase/historical/YYYY-MM-DD/`
4. Keep permanent docs in `docs/supabase/`
5. Clear `TODAY/` folder (or archive if needed)

---

## 📋 File Organization Principles

### 1. **Date-Based Archiving**
- Organize historical files by date (YYYY-MM-DD)
- Makes it easy to find "what did we do on X date?"
- Supports chronological tracking

### 2. **Separation of Concerns**
- **SQL Scripts** → `supabase/migrations/historical/`
- **Documentation** → `docs/supabase/historical/`
- **Daily Logs** → `DAILY_LOGS/`
- **Active Work** → `TODAY/`

### 3. **Naming Conventions**

**SQL Files:**
- Use numbered prefixes for execution order: `01_`, `02_`, etc.
- Include purpose: `FIX_`, `CHECK_`, `DIAGNOSE_`, `CREATE_`, etc.
- Be descriptive: `FIX_TABLE_PERMISSIONS.sql` not `fix.sql`

**Documentation:**
- Use descriptive names: `QUICK_CHECK_HISTORICAL_DATA.md`
- Include purpose in name
- Use UPPERCASE for important guides

**Daily Logs:**
- Format: `YYYY-MM-DD_SESSION_SUMMARY.md`
- Always include date in filename

### 4. **Version Control**
- Keep `TODAY/` folder in `.gitignore` if it contains temporary files
- Commit historical archives and daily logs
- Document what was done, not just what files exist

### 5. **Reusability**
- Move reusable scripts to permanent locations
- Keep templates in `docs/supabase/`
- Archive one-time fixes in historical folders

---

## 🎯 Suggested Additional Principles

### 1. **Migration Numbering System**
**Current:** Migrations use timestamp-based numbering
**Suggestion:** For historical SQL files, use date + sequence:
- `2025-11-18_01_FIX_TABLE_PERMISSIONS.sql`
- `2025-11-18_02_VERIFY_GRANTS.sql`

**Benefits:**
- Clear chronological order
- Easy to reference in daily logs
- Prevents naming conflicts

### 2. **Status Tracking**
**Suggestion:** Add status markers to file names or README:
- `✅_FIX_TABLE_PERMISSIONS.sql` - Completed and verified
- `⏳_DIAGNOSE_ISSUE.sql` - In progress
- `❌_ATTEMPT_RLS_FIX.sql` - Didn't work, superseded

**Alternative:** Use `README.md` in each date folder to track status

### 3. **Quick Reference Index**
**Suggestion:** Create `docs/supabase/INDEX.md` that links to:
- All permanent documentation
- Recent historical folders
- Common troubleshooting guides

**Benefits:**
- Single entry point for finding documentation
- Easy navigation

### 4. **Template Library**
**Suggestion:** Create `docs/supabase/templates/` folder with:
- `RLS_POLICY_TEMPLATE.sql` - Template for new tables
- `DIAGNOSTIC_TEMPLATE.sql` - Standard diagnostic queries
- `GRANT_TEMPLATE.sql` - Standard permission grants

**Benefits:**
- Consistency across sessions
- Faster setup for new features
- Best practices built-in

### 5. **Session Checklist**
**Suggestion:** Create `TODAY/CHECKLIST.md` template:
```markdown
## Today's Tasks
- [ ] Task 1
- [ ] Task 2
- [ ] Task 3

## Files to Run
- [ ] 01_script.sql
- [ ] 02_script.sql

## End of Day
- [ ] Create daily log
- [ ] Move files to historical
- [ ] Update permanent docs
```

### 6. **Cross-Reference System**
**Suggestion:** In daily logs, include:
- Links to related files
- References to previous sessions
- "See also" sections

**Example:**
```markdown
## Related Files
- See `supabase/migrations/historical/2025-11-18/15_FIX_TABLE_PERMISSIONS.sql`
- Related issue: `DAILY_LOGS/2025-11-17_SESSION_SUMMARY.md` (RLS setup)
```

---

## 📚 File Categories

### SQL Scripts
- **Fixes:** `*_FIX_*.sql` - Fixes for issues
- **Checks:** `*_CHECK_*.sql` - Verification queries
- **Diagnostics:** `*_DIAGNOSE_*.sql` - Diagnostic queries
- **Creates:** `*_CREATE_*.sql` - New objects
- **Updates:** `*_UPDATE_*.sql` - Updates to existing objects

### Documentation
- **Guides:** `*_GUIDE.md` - How-to guides
- **Templates:** `*_TEMPLATE.md` - Reusable templates
- **Troubleshooting:** `*_TROUBLESHOOTING.md` - Problem-solving guides
- **References:** `*_REFERENCE.md` - Quick reference materials

---

## 🔍 Finding Files

### By Date:
- Check `DAILY_LOGS/YYYY-MM-DD_SESSION_SUMMARY.md` for what was done
- Look in `supabase/migrations/historical/YYYY-MM-DD/` for SQL files
- Check `docs/supabase/historical/YYYY-MM-DD/` for documentation

### By Topic:
- RLS issues → Check `docs/supabase/RLS_POLICY_TEMPLATE_FOR_NEW_TABLES.md`
- Historical data → Check `docs/supabase/HISTORICAL_DATA_SETUP_COMPLETE.md`
- General troubleshooting → Check `docs/supabase/historical/` folders

### By Type:
- SQL fixes → `supabase/migrations/historical/`
- Documentation → `docs/supabase/` or `docs/supabase/historical/`
- Session summaries → `DAILY_LOGS/`

---

## ✅ Best Practices

1. **Always create daily log** - Even if just a few notes
2. **Move files at end of day** - Don't let `TODAY/` accumulate
3. **Use descriptive names** - Future you will thank you
4. **Document the "why"** - Not just the "what"
5. **Keep templates updated** - As you learn better approaches
6. **Reference previous work** - Link related sessions
7. **Clean up temporary files** - Don't archive test files
8. **Version important changes** - Use git commits with clear messages

---

## 🚀 Quick Start

### Starting a New Day:
```bash
# 1. Create TODAY folder (if needed)
mkdir TODAY

# 2. Create README with today's plan
# Edit TODAY/README.md

# 3. Add files you'll need today
# Copy/create files in TODAY/
```

### Ending the Day:
```bash
# 1. Create daily log
# Edit DAILY_LOGS/YYYY-MM-DD_SESSION_SUMMARY.md

# 2. Create date folder for historical files
mkdir -p supabase/migrations/historical/YYYY-MM-DD
mkdir -p docs/supabase/historical/YYYY-MM-DD

# 3. Move files
move TODAY/*.sql supabase/migrations/historical/YYYY-MM-DD/
move TODAY/*.md docs/supabase/historical/YYYY-MM-DD/

# 4. Keep permanent docs in docs/supabase/
# (manually move important ones)
```

---

## 📝 Notes

- This system is designed to be flexible and evolve
- Adjust as needed based on actual usage patterns
- The goal is clarity and efficiency, not rigid structure
- When in doubt, err on the side of more organization rather than less

