# IoT Nexus HVAC Platform - Project Analysis Report

**Generated:** November 5, 2025
**Status:** Ready for Real-Time Data Integration

---

## 📊 PROJECT OVERVIEW

### Current Architecture
- **Frontend:** React + TypeScript + Vite running on localhost:8080
- **Backend:** Supabase (PostgreSQL + Edge Functions + Realtime)
- **Auth:** Supabase Auth with role-based access control
- **Database:** Connected and operational

### User Roles
1. **Super Admin** - Full system access
2. **Company** - Manages installers and clients
3. **Installer** - Manages client machines
4. **Client** - Views own machines only

---

## ✅ WHAT'S WORKING (Real Supabase Data)

### 1. Authentication System (`src/contexts/AuthContext.tsx`)
- ✅ User login/logout
- ✅ Session management
- ✅ Profile creation and loading
- ✅ Role assignment

### 2. User Management (`src/hooks/useMachineData.tsx`)
**Real Queries:**
- `profiles` table - User information
- `user_roles` table - Role assignments
- `client_admin_assignments` table - Client-installer relationships
- `installer_company_assignments` table - Installer-company relationships

### 3. Machine Management
**Real Queries:**
- `machines` table - Machine CRUD operations
- Machine ownership and assignments
- Machine type (evaporative, heatpump, airconditioner)
- Machine location and settings

**Components Using Real Data:**
- `Dashboard.tsx` - Fetches machines from database
- `AddMachineDialog.tsx` - Creates machines in database
- `MachineCard.tsx` - Displays real machine data
- `RenameMachineDialog.tsx` - Updates machine names
- `ChangeOwnerDialog.tsx` - Reassigns machine ownership

### 4. API Key Management
**Real Queries:**
- `api_keys` table - ESP32 authentication keys
- Key generation and assignment
- Key activation/deactivation

---

## ❌ WHAT'S USING MOCK DATA (Needs Updating)

### 1. **CRITICAL: Machine Sensor Readings** 
**Location:** `useMachineData.tsx` (lines 334-363)

**Currently:** Generates fake historical data with `generateHistoricalData()` function
```typescript
// MOCK DATA - Lines 14-27
const generateHistoricalData = (currentValue: number, variance: number, hours: number = 24) => {
  const data = [];
  const now = Date.now();
  const points = hours * 60; // One point per minute
  
  for (let i = points; i > 0; i--) {
    data.push({
      timestamp: now - i * intervalMs,
      value: currentValue + (Math.random() - 0.5) * variance
    });
  }
  return data;
};
```

**Problems:**
- Generates random historical data for: power, deltaT, motorTemp, current, outsideTemp, insideTemp
- Creates fake fan/cooling/water states
- Data is not persistent or real
- No connection to actual sensor readings

**Should Be:** Query from `readings_raw` table

---

### 2. **Machine Current Status Values**
**Location:** `machines` table has static values

**Currently:** Machine table stores current sensor values directly:
```sql
motor_temp NUMERIC NOT NULL DEFAULT 0
outside_temp NUMERIC NOT NULL DEFAULT 20
inside_temp NUMERIC NOT NULL DEFAULT 20
delta_t NUMERIC NOT NULL DEFAULT 0
current NUMERIC NOT NULL DEFAULT 0
voltage NUMERIC NOT NULL DEFAULT 0
power NUMERIC NOT NULL DEFAULT 0
```

**Problems:**
- Values are static in database
- Not updated in real-time from sensors
- Dashboard shows stale data

**Should Be:** 
- Either: Keep machines table updated via triggers from readings_raw
- Or: Query latest reading from readings_raw when displaying machines

---

### 3. **System State Simulation**
**Location:** `useSystemState.tsx` (lines 258-306)

**Currently:** Simulates temperature changes and system behavior
```typescript
// MOCK SIMULATION - Lines 258-306
useEffect(() => {
  const interval = setInterval(() => {
    setState(prev => {
      let newOutsideTemp = prev.outsideTemp + (Math.random() - 0.5) * 0.5;
      // ... more simulation code
    });
  }, 3000);
}, []);
```

**Problems:**
- Fake temperature drift simulation
- Mock water level issues
- No real sensor integration

**Should Be:** Receive real-time updates from Supabase Realtime subscriptions

---

## 🔴 MISSING TABLES

### 1. **`readings_raw` Table** - NOT IN MIGRATIONS!

**Status:** ❌ DOES NOT EXIST

**Needs to be created with schema:**
```sql
CREATE TABLE public.readings_raw (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Sensor readings
  motor_temp NUMERIC NOT NULL,
  outside_temp NUMERIC NOT NULL,
  inside_temp NUMERIC NOT NULL,
  delta_t NUMERIC NOT NULL,
  current NUMERIC NOT NULL,
  voltage NUMERIC NOT NULL,
  power NUMERIC NOT NULL,
  
  -- State flags
  is_on BOOLEAN NOT NULL,
  is_connected BOOLEAN NOT NULL,
  has_water BOOLEAN NOT NULL,
  is_cooling BOOLEAN NOT NULL,
  fan_active BOOLEAN NOT NULL,
  has_pump BOOLEAN NOT NULL,
  has_heat BOOLEAN NOT NULL,
  
  -- Status
  overall_status TEXT CHECK (overall_status IN ('good', 'warning', 'error')),
  motor_status TEXT CHECK (motor_status IN ('normal', 'warning', 'critical')),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for fast queries
CREATE INDEX idx_readings_machine_timestamp ON public.readings_raw(machine_id, timestamp DESC);
```

---

### 2. **`alerts` Table** - NOT IN MIGRATIONS!

**Status:** ❌ DOES NOT EXIST

**Needs to be created with schema:**
```sql
CREATE TABLE public.alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID NOT NULL REFERENCES public.machines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- 'high_temp', 'no_water', 'connection_lost', etc.
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  message TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT false,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Index for active alerts
CREATE INDEX idx_alerts_active ON public.alerts(machine_id, resolved, created_at DESC);
```

---

## 📂 KEY FILES BREAKDOWN

### Data Hooks
1. **`src/hooks/useMachineData.tsx`** (377 lines)
   - ✅ Fetches users (real)
   - ✅ Fetches machines (real)
   - ❌ Generates historical data (MOCK) - **NEEDS REPLACEMENT**

2. **`src/hooks/useSystemState.tsx`** (336 lines)
   - ❌ Simulates system state changes (MOCK)
   - **Purpose:** Was meant for demo, should be removed or used only for testing

### Pages
1. **`src/pages/Dashboard.tsx`** (676 lines)
   - ✅ Uses real machine data
   - ❌ Shows historical charts with mock data
   - Needs: Real-time subscriptions

2. **`src/pages/Login.tsx`**
   - ✅ Fully integrated with Supabase Auth

### Components
1. **`src/components/MachineDetailView.tsx`**
   - ✅ Displays machine info (real)
   - ❌ Shows historical charts (mock data)
   - Needs: Query readings_raw for charts

2. **`src/components/MachineCard.tsx`**
   - ✅ Displays current machine status (real)
   - Needs: Real-time updates via subscription

3. **`src/components/StatusPanel.tsx`** (if exists)
   - Needs: Real-time sensor readings

---

## 🎯 WHAT NEEDS TO BE DONE

### Priority 1: Database Schema
1. ✅ Create `readings_raw` table migration
2. ✅ Create `alerts` table migration
3. ✅ Enable Realtime for both tables
4. ✅ Regenerate TypeScript types

### Priority 2: Data Simulator
1. ✅ Create Node.js script to simulate 20 machines
2. ✅ Post sensor data every 5 minutes
3. ✅ Use machine API keys for authentication
4. ✅ Generate realistic sensor patterns

### Priority 3: Real-Time Updates
1. ✅ Add Supabase Realtime subscription to Dashboard
2. ✅ Subscribe to readings_raw inserts
3. ✅ Subscribe to alerts inserts
4. ✅ Add visual flash animations on updates
5. ✅ Update machine cards in real-time

### Priority 4: Replace Mock Data
1. ✅ Replace `generateHistoricalData()` with real queries
2. ✅ Query readings_raw for time-series charts
3. ✅ Implement date range filtering
4. ✅ Add aggregation for performance
5. ✅ Remove useSystemState.tsx or mark as demo-only

---

## 📊 CURRENT DATA FLOW

```
┌─────────────────┐
│  ESP32 Devices  │  (Not yet implemented)
│  (20 machines)  │
└────────┬────────┘
         │
         │ POST /api/readings
         ├─ API Key Auth
         │
         ▼
┌─────────────────────┐
│  Supabase Database  │
│  ┌───────────────┐  │
│  │   machines    │  │  ✅ Exists (static values)
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │ readings_raw  │  │  ❌ MISSING (need to create)
│  └───────────────┘  │
│  ┌───────────────┐  │
│  │    alerts     │  │  ❌ MISSING (need to create)
│  └───────────────┘  │
└─────────┬───────────┘
          │
          │ Realtime Subscription
          │
          ▼
┌─────────────────────┐
│  React Dashboard    │
│                     │
│  ✅ Real machines   │
│  ✅ Real users      │
│  ❌ MOCK readings   │  ← NEEDS REPLACEMENT
│  ❌ MOCK history    │  ← NEEDS REPLACEMENT
└─────────────────────┘
```

---

## 🔧 TECHNICAL DETAILS

### Supabase Configuration
- **Project ID:** `lkvnhskxbxzeohopqjcr`
- **Client:** `src/integrations/supabase/client.ts`
- **Types:** `src/integrations/supabase/types.ts`
- **Realtime:** Enabled for selected tables

### Environment Variables Required
```env
VITE_SUPABASE_URL=https://lkvnhskxbxzeohopqjcr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<your_anon_key>
```

### Existing Tables (with RLS enabled)
1. `profiles` - User profiles
2. `user_roles` - Role assignments
3. `client_admin_assignments` - Client relationships
4. `installer_company_assignments` - Installer relationships
5. `machines` - HVAC machine records
6. `api_keys` - ESP32 authentication

---

## 📝 RECOMMENDATIONS

### Immediate Actions
1. ⚠️ **CREATE MISSING TABLES** - readings_raw and alerts don't exist yet
2. 🔄 **REGENERATE TYPES** - After creating tables, run type generation
3. 🤖 **BUILD SIMULATOR** - Can't test without data source
4. 📡 **ADD REALTIME** - Enable subscriptions for live updates

### Architecture Improvements
1. **Consider:** Create a materialized view for latest readings
2. **Consider:** Add database triggers to update machines table from readings_raw
3. **Consider:** Implement data retention policy (keep only 90 days of raw readings)
4. **Consider:** Create aggregated tables for historical analysis

### Performance Optimizations
1. Add composite indexes on (machine_id, timestamp)
2. Implement pagination for historical data
3. Use time-bucket aggregation for long time ranges
4. Cache latest readings in machines table

---

## 🚀 READY TO PROCEED

**Current Status:** ✅ Frontend operational with real user/machine data
**Next Step:** Create missing tables and implement real-time data flow
**Blocker:** readings_raw and alerts tables do not exist in database

Once tables are created, we can:
1. Build the data simulator
2. Implement real-time subscriptions
3. Replace all mock data with real queries

---

## 📋 FILES TO MODIFY

### New Files to Create
1. `supabase/migrations/[timestamp]_create_readings_and_alerts.sql`
2. `simulator/hvac-data-simulator.js` (Node.js script)
3. `simulator/package.json`
4. `simulator/.env.example`

### Files to Update
1. `src/hooks/useMachineData.tsx` - Replace mock historical data
2. `src/pages/Dashboard.tsx` - Add realtime subscriptions
3. `src/components/MachineCard.tsx` - Add flash animations
4. `src/components/MachineDetailView.tsx` - Query real historical data
5. `src/integrations/supabase/types.ts` - Regenerate after migration

### Files to Consider Removing
1. `src/hooks/useSystemState.tsx` - Simulation hook (keep for demo mode?)

---

**End of Analysis Report**

