# Cool Breeze Nexus - IoT HVAC Monitoring Platform

---

## 📚 **Quick Reference Guides:**
- **AI Assistant:** `AI_REFERENCE.md` - Complete project context for AI assistants
- **AI Prompts:** `AI_PROMPT_GUIDE.md` - Example prompts and best practices for working with AI
- **Deployment:** `DEPLOYMENT_GUIDE_GITHUB.md` - GitHub Actions deployment guide
- **Quick Deploy:** `docs/general/QUICK_DEPLOY.md` - One-command deployment
- **Manual Deploy:** `docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md` - Manual upload (if GitHub Actions fails)
- **ESP32 Setup:** `ESP32_INTEGRATION_GUIDE.md` - ESP32 hardware integration
- **Database:** `DATABASE_SCHEMA.md` - Complete database documentation
- **Adding Machines:** `HOW_TO_ADD_MACHINE_WITH_PARAMETERS.md` - How to add new machines
- **Documentation Index:** `docs/README.md` - Complete documentation index by category
- **Task Tracking:** `DAILY_LOGS/REMAINING_TASKS.md` - Active task list and status

---

## 🌡️ Overview

**Cool Breeze Nexus** is a comprehensive IoT platform for monitoring and managing HVAC systems (evaporative coolers, air conditioners, and heat pumps) with real-time data, alerts, and hierarchical user management.

---

## ✨ Features

### **Current Features** ✅
- **Real-time Dashboard** - Monitor temperature, current, power, and efficiency
- **Hierarchical User Management** - Super Admin → Company → Installer → Client
- **Per-Machine Alert Thresholds** - Customizable alert parameters for each machine
- **Notification System** - Per-user, per-machine notification preferences
- **Email Alerts** - SMTP integration for automated alerts (ready to implement)
- **API Key Management** - Secure ESP32 device authentication
- **Responsive Design** - Works on desktop, tablet, and mobile
- **Role-Based Access Control** - Supabase RLS policies

### **In Progress** ⏳
- Alert checking logic (monitors thresholds, triggers emails)
- Email sending implementation
- Alert history dashboard
- ESP32 device integration

---

## 🚀 Quick Start

### **Prerequisites**
- Node.js 18+ & npm
- Supabase account
- Email server (cPanel or service like Resend)

### **Installation**

```bash
# Clone repository
git clone <YOUR_GIT_URL>
cd cool-breeze-nexus-main

# Install dependencies
npm install

# Configure environment
# Create .env.local with:
# VITE_SUPABASE_URL=your_supabase_url
# VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key

# Run migrations in Supabase
# Apply all files in supabase/migrations/

# Start development server
npm run dev
```

**Development server:** http://localhost:8080

---

## 📊 Project Structure

```
cool-breeze-nexus-main/
├── src/
│   ├── components/         # React components
│   │   ├── MachineCard.tsx
│   │   ├── MachineDetailView.tsx
│   │   ├── AlertThresholdsEditor.tsx
│   │   ├── NotificationRecipientsPanel.tsx
│   │   └── ...
│   ├── hooks/              # Custom React hooks
│   │   └── useMachineData.tsx
│   ├── contexts/           # React contexts (Auth, etc.)
│   ├── pages/              # Page components
│   └── types/              # TypeScript types
├── supabase/
│   └── migrations/         # Database schema versions
├── public/                 # Static assets
└── docs/                   # Documentation (see below)
```

---

## 📚 Documentation

### **Essential Guides**
- **`ESP32_INTEGRATION_GUIDE.md`** - Connect ESP32 devices
- **`CPANEL_EMAIL_SETUP_GUIDE.md`** - Email configuration
- **`HOW_TO_ADD_MACHINE_WITH_PARAMETERS.md`** - How to add new machines
- **`docs/README.md`** ⭐ - Complete documentation index (organized by category)

### **Deployment Guides**
- **`DEPLOYMENT_GUIDE_GITHUB.md`** - Complete GitHub Actions deployment guide
- **`docs/general/QUICK_DEPLOY.md`** - One-command deployment reference
- **`docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md`** - Manual upload fallback (if GitHub Actions fails)
- **`docs/general/GITHUB_DEPLOYMENT_GUIDE.md`** - Detailed deployment guide with troubleshooting

### **Database & Architecture**
- **`DATABASE_SCHEMA.md`** - Complete database documentation
- **`PROPOSED_DATABASE_ARCHITECTURE.md`** - New manufacturer-agnostic architecture design
- **`SUPABASE_ANALYSIS_AND_CLEANUP_PLAN.md`** - Database analysis and cleanup plan
- **`MIGRATION_GUIDE_NEW_SUPABASE.md`** - Guide for migrating to new Supabase instance
- **`FILES_TO_UPDATE_AFTER_MIGRATION.md`** - Checklist of files to update after migration
- **`supabase/migrations/`** - All schema changes (versioned)
- **`docs/supabase/DIRECT_FIX_CONNECTION.sql`** - Connection status fix
- **`CHECK_ALL_RLS_STATUS.sql`** - RLS policy verification script
- **`create-demo-users.js`** - Create demo accounts
- **`DEBUG_USER_SESSION.sql`** - Troubleshooting queries

### **Task Management & Progress**
- **`DAILY_LOGS/REMAINING_TASKS.md`** ⭐ - Active task tracking and status (updated regularly)
- **`DAILY_LOGS/2025-11-25_DATABASE_CLEANUP_AND_MIGRATION_PREP.md`** - Latest session summary
- **`DAILY_LOGS/2025-11-20_FULL_SESSION.md`** - Full session details
- **`DAILY_LOGS/DAILY_LOG_CHECKLIST.md`** - Daily logging checklist
- **`DAILY_LOGS/`** - All daily session summaries
- **`docs/general/SESSION_PROGRESS_2025-11-08.md`** - Historical progress report

### **Manufacturer-Specific Guides**
- **`ALLIANCE_MANUFACTURER_ADDITION.md`** - Guide for adding Alliance manufacturer

### **Alert & Demo Guides**
- **`docs/general/COMPLETE_ALERT_PARAMETERS.md`** - All alert conditions
- **`docs/general/RUN_DEMO_SETUP.md`** - Demo data management

---

## 🔐 User Roles

### **Super Admin**
- Sees all 50 machines
- Manages all users
- Generates API keys
- Full system access

### **Company**
- Sees their installers
- Sees all machines under their installers
- Manages installer/client assignments

### **Installer**
- Sees their clients
- Sees all machines under their clients
- Manages machines

### **Client**
- Sees only their own machines (2 per client)
- Can customize alert thresholds
- Can toggle notifications

---

## 🎯 Current Status

**Status:** ✅ Production Ready (MVP Complete)

**What's Working:**
- ✅ Frontend Dashboard with real-time data
- ✅ User Management & Hierarchy
- ✅ Machine Monitoring and Historical Data
- ✅ Notification Preferences
- ✅ Alert Threshold Editor
- ✅ Email System (SMTP tested)
- ✅ GitHub Actions Deployment
- ✅ ESP32 Integration Guide (code ready, real-world testing pending)
- ✅ Database Schema Complete

**In Progress:**
- ⏳ Alert Logic Implementation (backend monitoring)
- ⏳ ESP32 Real-World Testing

---

## 🔧 Development

### **Run Dev Server**
```bash
npm run dev
```

### **Build for Production**
```bash
npm run build
```

### **Test Email System**
```bash
node test-email-connection.js
```

---

## 🚀 Deployment

### **Automatic Deployment (Recommended)**
- **GitHub Actions:** Push to `main` branch for automatic deployment
- **Quick Guide:** `docs/general/QUICK_DEPLOY.md` - One-command deployment
- **Full Guide:** `DEPLOYMENT_GUIDE_GITHUB.md` - Complete GitHub Actions guide

### **Manual Deployment (If GitHub Actions Fails)**
If automatic deployment fails, use manual upload:
- **Quick Manual Guide:** `docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md` - 5-step manual upload process
- **Alternative:** Use the detailed guide in `docs/general/GITHUB_DEPLOYMENT_GUIDE.md` (see Troubleshooting section)

---

## 🚨 Alert System

### **Supported Machines**
- **Evaporative Coolers** (7 alert types) - Cirrus, CoolBreeze
- **Air Conditioners** (4 alert types) - CoolBreeze
- **Heat Pumps** (6 alert types) - Alliance, CoolBreeze

### **Alert Conditions**
- Motor/compressor overheating
- Current overcurrent
- Fan failure
- Ineffective cooling/heating
- Water system issues (evap coolers)
- Delta T monitoring

**See:** `docs/general/COMPLETE_ALERT_PARAMETERS.md` for full details

---

## 📧 Email Configuration

**Domain:** iotnexus.site  
**From:** alerts@iotnexus.site  
**Credentials:** Stored in `EMAIL_SMTP_CONFIG.env` (not in git)

**Setup Guide:** `CPANEL_EMAIL_SETUP_GUIDE.md`

---

## 🔗 API Integration

### **ESP32 Devices**
- RESTful API via Supabase
- API key authentication
- 2-5 minute update interval (configurable)
- See: `ESP32_INTEGRATION_GUIDE.md`

### **Endpoints**
```
POST /rest/v1/readings_raw
Headers:
  - apikey: [supabase_anon_key]
  - Authorization: Bearer [machine_api_key]
  - Content-Type: application/json
```

---

## 🛠️ Tech Stack

- **Frontend:** React + TypeScript + Vite
- **UI:** Tailwind CSS + shadcn/ui
- **Backend:** Supabase (PostgreSQL + Auth + RLS)
- **Email:** Nodemailer + cPanel SMTP
- **Charts:** Recharts
- **IoT:** ESP32 + Arduino

---

## 📝 Demo Data

**Demo Accounts:**
- Super Admin: `headoffice@crowntechnologies.co.za` / `demo123!`
- 3 Companies (Ironhorse, Crowntechnologies, TomHVAC)
- 10 Installers
- 20 Clients
- 50 Machines

**Setup/Teardown:**
```bash
# Create demo data
node create-demo-users.js
# Then run SETUP_DEMO.sql in Supabase

# Remove demo data
# Run cleanup_demo.sql in Supabase
```

---

## 🐛 Troubleshooting

### **Login Issues**
- Run `DEBUG_USER_SESSION.sql` in Supabase
- Check user_roles table
- Verify Supabase URL/keys in `.env.local`

### **Machines Not Showing**
- Check RLS policies
- Verify user hierarchy (installer_company_assignments, client_admin_assignments)
- Clear browser cache

### **Email Not Working**
- Verify SMTP credentials in `EMAIL_SMTP_CONFIG.env`
- Test with `node test-email-connection.js`
- Check cPanel email quota

---

## 📞 Support

For issues or questions:
1. Check `DAILY_LOGS/REMAINING_TASKS.md` for current task status
2. Review `docs/README.md` for complete documentation index
3. Review `DAILY_LOGS/REMAINING_TASKS.md` for current priorities
4. Consult specific guide documents in `docs/` folder

---

## 📄 License

Private project - All rights reserved

---

## 🎉 Recent Updates

### **November 25, 2025**
- ✅ Database architecture analysis and new design completed
- ✅ Complete database schema prepared for migration
- ✅ Fixed CoolBreeze and Alliance RLS policy issues (403 errors)
- ✅ Fixed connection status threshold (5 minutes)
- ✅ Fixed Change Manufacturer menu for evaporative coolers
- ✅ Migration guide and update checklist created

### **November 20, 2025**
- ✅ Fixed GitHub Actions deployment
- ✅ Verified live website functionality
- ✅ Updated Supabase authentication URLs

### **November 8, 2025**
- ✅ Added email subscription checkbox (GDPR compliant)
- ✅ Implemented alert thresholds editor (17 alert types)
- ✅ 2-column responsive layout with green divider
- ✅ Clear email notification settings
- ✅ Per-machine customizable thresholds
- ✅ SMTP system tested and verified
- ✅ Comprehensive documentation

**See:** `DAILY_LOGS/REMAINING_TASKS.md` for current task status and next steps

---

**Ready to monitor your HVAC systems!** 🌡️🚀
