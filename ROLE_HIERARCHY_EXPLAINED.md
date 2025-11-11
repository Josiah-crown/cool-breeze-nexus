# Role Hierarchy & Permissions

## 🏢 **4 User Roles in the System:**

### 1. **Super Admin** (`super_admin`)
**Who:** Head Office / System Administrator (YOU: `headoffice@crowntechnologies.co.za`)

**Can See/Do:**
- ✅ See **ALL 50 machines** (from all companies, installers, clients)
- ✅ See **ALL users** in the system (companies, installers, clients)
- ✅ Manage **user hierarchy** (assign installers to companies, clients to installers)
- ✅ Add/delete/rename machines
- ✅ Change machine owners
- ✅ Generate and manage **ESP32 API keys**
- ✅ View **company dropdown** showing all 3 companies with their installers and clients

**Dashboard View:**
```
┌─ Super Admin Dashboard ─────────────────────────────┐
│ Total Machines: 50                                   │
│                                                      │
│ Companies (dropdown):                                │
│   ├── Ironhorse (3 installers, X clients, Y machines)│
│   ├── Crowntechnologies (4 installers, X clients, Y) │
│   └── TomHVAC (3 installers, X clients, Y machines) │
│                                                      │
│ API Key Management Panel (right sidebar)            │
│ [All 50 machine cards displayed]                    │
└──────────────────────────────────────────────────────┘
```

---

### 2. **Company** (`company`)
**Who:** Company accounts (e.g., `crown@crowntechnologies.co.za`, `ironhorse@company.com`)

**Can See/Do:**
- ✅ See **their assigned installers** (e.g., Crown sees: James, David, Michael, Robert)
- ✅ See **all clients under their installers**
- ✅ See **all machines owned by those clients**
- ✅ View installer hierarchy
- ❌ Cannot see other companies' data
- ❌ Cannot generate API keys
- ❌ Cannot add/delete users or machines

**Dashboard View:**
```
┌─ Company Dashboard ─────────────────────────────────┐
│ Total Machines: [machines from their installers]    │
│                                                      │
│ My Installers (dropdown):                           │
│   ├── James (2 clients, 4 machines)                 │
│   ├── David (2 clients, 4 machines)                 │
│   ├── Michael (2 clients, 4 machines)               │
│   └── Robert (2 clients, 4 machines)                │
│                                                      │
│ [Machine cards from all their clients]              │
└──────────────────────────────────────────────────────┘
```

---

### 3. **Installer** (`installer`)
**Who:** Installers/Technicians (e.g., `blessing@installer.com`, `thami@installer.com`, `mark@installer.com`)

**Can See/Do:**
- ✅ See **their assigned clients** (e.g., Blessing sees: Client 1, Client 2)
- ✅ See **all machines owned by those clients** (usually 2 machines per client = 4 machines total)
- ✅ View client list
- ❌ Cannot see other installers' clients
- ❌ Cannot add/delete users
- ❌ Cannot generate API keys

**Dashboard View:**
```
┌─ Installer Dashboard ───────────────────────────────┐
│ Total Machines: 4                                    │
│                                                      │
│ My Clients (dropdown):                              │
│   ├── Client 1 (2 machines)                         │
│   └── Client 2 (2 machines)                         │
│                                                      │
│ [4 machine cards from their 2 clients]              │
└──────────────────────────────────────────────────────┘
```

---

### 4. **Client** (`client`)
**Who:** End users/customers (e.g., `client1@client.com`, `client2@client.com`, etc.)

**Can See/Do:**
- ✅ See **ONLY their own machines** (usually 2 machines)
- ✅ View machine details
- ✅ Control their own machines (setpoints, etc.)
- ❌ Cannot see other clients' machines
- ❌ Cannot see any user hierarchy
- ❌ No management functions

**Dashboard View:**
```
┌─ Client Dashboard ──────────────────────────────────┐
│ Total Machines: 2                                    │
│                                                      │
│ Your Machines:                                       │
│ [Machine 1A] [Machine 1B]                           │
│                                                      │
│ (Simple view - just their machines)                 │
└──────────────────────────────────────────────────────┘
```

---

## 📊 **Hierarchy Structure:**

```
Super Admin (Head Office)
    │
    ├─── Company: Ironhorse
    │       ├─── Installer: Blessing
    │       │       ├─── Client 1 (2 machines)
    │       │       └─── Client 2 (2 machines)
    │       ├─── Installer: Thami
    │       │       ├─── Client 3 (2 machines)
    │       │       └─── Client 4 (2 machines)
    │       └─── Installer: Mark
    │               ├─── Client 5 (2 machines)
    │               └─── Client 6 (2 machines)
    │
    ├─── Company: Crowntechnologies
    │       ├─── Installer: James (Clients 7-8)
    │       ├─── Installer: David (Clients 9-10)
    │       ├─── Installer: Michael (Clients 11-12)
    │       └─── Installer: Robert (Clients 13-14)
    │
    └─── Company: TomHVAC
            ├─── Installer: William (Clients 15-16)
            ├─── Installer: Joseph (Clients 17-18)
            └─── Installer: Charles (Clients 19-20)
```

---

## 🔐 **What You're Trying to Log In As:**

**Email:** `headoffice@crowntechnologies.co.za`  
**Role:** `super_admin`  
**Should See:** **ALL 50 machines** + company dropdown + API key management  

**Current Problem:** The system thinks you're a `client`, so you see 0 machines.

---

## ✅ **What We're Fixing:**

1. ✅ Database role is correct (`super_admin`) - CONFIRMED
2. ❌ Browser/App is not reading the role correctly - FIXING
3. ❌ RLS policies are blocking access - FIXING with `FIX_ALL_RLS_POLICIES.sql`

---

**Are we on the same page?** 🤝

