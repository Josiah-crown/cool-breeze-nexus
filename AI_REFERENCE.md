# 🤖 AI Assistant Reference Guide

**Last Updated:** November 25, 2025  
**Purpose:** Quick reference for AI assistants to understand the project context and current state

---

## 🎯 Project Overview

**Cool Breeze Nexus** - IoT HVAC Monitoring Platform

A comprehensive platform for monitoring and managing HVAC systems (evaporative coolers, air conditioners, heat pumps) with real-time data, alerts, and hierarchical user management.

---

## 📊 Current Project State

### **Status:** ✅ Production Ready (MVP Complete)

**What's Working:**
- ✅ Frontend dashboard with real-time data
- ✅ User management hierarchy (Super Admin → Company → Installer → Client)
- ✅ Machine monitoring and historical data
- ✅ ESP32 integration guide and code (real-world testing pending)
- ✅ Alert threshold configuration
- ✅ Notification preferences
- ✅ GitHub Actions deployment
- ✅ Database schema complete

**Recent Work (November 25, 2025):**
- ✅ Database architecture redesigned for expansion
- ✅ Complete SQL schema created for new Supabase instance
- ✅ Migration guide prepared
- ✅ Old migration files archived
- ✅ Documentation cleaned up

---

## 🏗️ Architecture

### **Frontend**
- **Framework:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Charts:** Recharts
- **State:** React hooks + Supabase real-time subscriptions

### **Backend**
- **Database:** Supabase (PostgreSQL)
- **Auth:** Supabase Auth
- **Security:** Row Level Security (RLS) policies
- **Real-time:** Supabase real-time subscriptions

### **IoT**
- **Hardware:** ESP32 microcontrollers
- **Protocol:** REST API via Supabase
- **Update Interval:** 2-5 minutes (configurable, typically 3-5 minutes)
- **Authentication:** API keys

### **Deployment**
- **Hosting:** cPanel (static files)
- **CI/CD:** GitHub Actions
- **Build:** Vite production build

---

## 📁 Project Structure

```
cool-breeze-nexus-main/
├── src/
│   ├── components/         # React components
│   ├── hooks/              # Custom hooks (useMachineData, etc.)
│   ├── pages/              # Page components (Dashboard, Index)
│   ├── lib/                # Utilities (historicalData, machineConfig)
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/
│       ├── 000_COMPLETE_DATABASE_SCHEMA.sql  # Complete schema
│       └── archive/       # Old migrations (archived)
├── docs/                   # Documentation
│   ├── archive/           # Archived old docs
│   ├── frontend/          # Frontend docs
│   ├── hardware/          # ESP32 docs
│   └── supabase/          # Database docs
├── DAILY_LOGS/            # Daily work logs
└── README.md              # Main readme
```

---

## 🗄️ Database Architecture

### **Current System (Production)**
- `machines` - Machine registry
- `cirrus` - Cirrus machine processed data
- `coolbreeze` - CoolBreeze machine processed data
- `readings_raw` - Raw sensor readings (temporary)
- `machine_alert_config` - Alert thresholds
- `machine_voltage_config` - Voltage input mappings

### **New Architecture (For Future Migration)**
- `{manufacturer}_raw` - Raw data (2 weeks retention)
- `{manufacturer}_calculated` - Processed data (1 year retention)
- `{manufacturer}_notifications` - Notification thresholds per manufacturer
- `{manufacturer}_voltage_config` - Voltage mappings per manufacturer
- `machine_connection_status` - Shared connection tracking

**See:** `DATABASE_SCHEMA.md` for complete documentation

---

## 🔑 Key Concepts

### **User Hierarchy**
1. **Super Admin** - Sees all machines, manages all users
2. **Company** - Sees their installers and all machines under them
3. **Installer** - Sees their clients and all machines under them
4. **Client** - Sees only their own machines

### **Machine Types**
- **Evaporative** - Cirrus, CoolBreeze
- **Heat Pump** - Alliance
- **Air Conditioner** - CoolBreeze

### **Data Flow**
```
ESP32 → readings_raw → [trigger] → cirrus/coolbreeze → machines (status update)
```

**Future (After Migration):**
```
ESP32 → {manufacturer}_raw → [trigger] → {manufacturer}_calculated → machines (status update)
```

---

## 📚 Essential Documentation

### **Quick References (Root Directory)**
1. **`README.md`** - Main project overview
2. **`DEPLOYMENT_GUIDE_GITHUB.md`** - Deployment instructions
3. **`ESP32_INTEGRATION_GUIDE.md`** - ESP32 setup
4. **`DATABASE_SCHEMA.md`** - Database documentation
5. **`HOW_TO_ADD_MACHINE_WITH_PARAMETERS.md`** - Adding machines
6. **`ALLIANCE_MANUFACTURER_ADDITION.md`** - Alliance manufacturer guide

### **Migration & Architecture**
- **`MIGRATION_GUIDE_NEW_SUPABASE.md`** - Future migration guide
- **`PROPOSED_DATABASE_ARCHITECTURE.md`** - New architecture design
- **`FILES_TO_UPDATE_AFTER_MIGRATION.md`** - Migration checklist

### **Daily Logs**
- **`DAILY_LOGS/REMAINING_TASKS.md`** - Current task list
- **`DAILY_LOGS/2025-11-25_DATABASE_CLEANUP_AND_MIGRATION_PREP.md`** - Latest work

---

## 🛠️ Common Tasks

### **Adding a New Machine**
1. User creates machine in dashboard
2. Generate API key for machine
3. Configure ESP32 with machine UUID and API key
4. ESP32 sends data to `readings_raw` table
5. Trigger processes data into `cirrus` or `coolbreeze` table
6. Frontend displays data from processed table

### **Deploying Changes**
1. Push to `main` branch
2. GitHub Actions builds and deploys automatically
3. Environment variables from GitHub Secrets
4. Files uploaded to cPanel via FTP

### **Troubleshooting**
- **Connection Issues:** Check `machine_connection_status` table
- **RLS Errors:** Check RLS policies in Supabase
- **Data Not Showing:** Check `cirrus`/`coolbreeze` tables
- **ESP32 Issues:** Check `readings_raw` table for incoming data

---

## 🔧 Development Setup

### **Environment Variables**
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key
```

### **Commands**
```bash
npm install          # Install dependencies
npm run dev          # Start dev server (port 8080)
npm run build        # Build for production
```

### **Database**
- Run migrations in Supabase SQL Editor
- Current schema: `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
- Old migrations archived in `supabase/migrations/archive/`

---

## 📝 Code Patterns

### **Fetching Machine Data**
```typescript
// Use useMachineData hook
const { machines, loading, error, refetch } = useMachineData();

// Get processing table
const table = getProcessingTable(machine.type, machine.manufacturer);
// Returns: 'cirrus' or 'coolbreeze' (will be 'cirrus_calculated' after migration)
```

### **Historical Data**
```typescript
// Use historicalData.ts
const data = await fetchHistoricalData(machineId, '24h');
// Fetches from cirrus/coolbreeze tables
```

### **Real-time Updates**
```typescript
// Subscribe to table changes
supabase
  .channel(`machine-${machineId}`)
  .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'cirrus' }, ...)
```

---

## ⚠️ Important Notes

### **Current Limitations**
- Alert system UI complete, backend logic pending
- Using direct REST API instead of Edge Functions
- `readings_raw` table deletes data immediately (no historical raw data)

### **Future Migration**
- New architecture ready in `000_COMPLETE_DATABASE_SCHEMA.sql`
- Migration guide prepared
- Code files marked with TODO comments for updates
- Will migrate after MVP completion

### **File Organization**
- Root directory: Only essential quick reference guides
- Old files: Archived in `docs/archive/`
- Daily logs: In `DAILY_LOGS/`
- Documentation: Organized in `docs/` subdirectories

---

## 🎯 When Helping the User

### **Common Questions**
1. **"How do I add a new manufacturer?"**
   - After migration: Add 4 tables (raw, calculated, notifications, voltage_config)
   - Update `PROCESSING_TABLE_MAP` in `src/lib/machineConfig.ts`

2. **"Why isn't data showing?"**
   - Check ESP32 is sending data to `readings_raw`
   - Check trigger processed data into `cirrus`/`coolbreeze`
   - Check RLS policies allow user to read data

3. **"How do I deploy?"**
   - Push to `main` branch
   - GitHub Actions handles deployment
   - See `DEPLOYMENT_GUIDE_GITHUB.md`

4. **"Where is the database schema?"**
   - Current: See Supabase dashboard
   - New: `supabase/migrations/000_COMPLETE_DATABASE_SCHEMA.sql`
   - Documentation: `DATABASE_SCHEMA.md`

---

## 📞 Quick Links

- **Main Readme:** `README.md`
- **AI Prompts:** `AI_PROMPT_GUIDE.md` - Example prompts for working with AI assistants
- **Deployment:** `DEPLOYMENT_GUIDE_GITHUB.md`
- **ESP32 Setup:** `ESP32_INTEGRATION_GUIDE.md`
- **Database:** `DATABASE_SCHEMA.md`
- **Migration:** `MIGRATION_GUIDE_NEW_SUPABASE.md`
- **Tasks:** `DAILY_LOGS/REMAINING_TASKS.md`

---

**This file should be updated whenever major changes are made to the project!**

