# Cool Breeze Nexus - IoT HVAC Monitoring Platform

---

## 🤖 **FOR AI ASSISTANT (Demo Tomorrow!):**
- **START HERE:** `HANDOFF_FOR_AI.md` - Complete project context, current state, and priorities
- **USER CHECKLIST:** `TOMORROW_MORNING_CHECKLIST.md` - 90-minute pre-demo prep
- **CURRENT STATUS:** ✅ ESP32 WORKING! Dashboard functional. Need to build 2-3 more devices.

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
- **`NEXT_SESSION.md`** ⭐ - Quick start for next session
- **`SESSION_PROGRESS_2025-11-08.md`** - Latest progress report
- **`ESP32_INTEGRATION_GUIDE.md`** - Connect ESP32 devices
- **`COMPLETE_ALERT_PARAMETERS.md`** - All alert conditions
- **`CPANEL_EMAIL_SETUP_GUIDE.md`** - Email configuration
- **`RUN_DEMO_SETUP.md`** - Demo data management

### **Database**
- **`supabase/migrations/`** - All schema changes (versioned)
- **`create-demo-users.js`** - Create demo accounts
- **`DEBUG_USER_SESSION.sql`** - Troubleshooting queries

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

**Completion:** ~85% ✅

```
✅ Frontend Dashboard
✅ User Management & Hierarchy
✅ Machine Monitoring
✅ Notification Preferences
✅ Alert Threshold Editor
✅ Email System (SMTP tested)
⏳ Alert Logic Implementation (3 hours)
⏳ ESP32 Integration (in progress)
⏳ Production Deployment
```

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

## 🚨 Alert System

### **Supported Machines**
- **Evaporative Coolers** (7 alert types)
- **Air Conditioners** (4 alert types)
- **Heat Pumps** (6 alert types)

### **Alert Conditions**
- Motor/compressor overheating
- Current overcurrent
- Fan failure
- Ineffective cooling/heating
- Water system issues (evap coolers)
- Delta T monitoring

**See:** `COMPLETE_ALERT_PARAMETERS.md` for full details

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
- 5-minute update interval
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
1. Check `NEXT_SESSION.md` for quick answers
2. Review `SESSION_PROGRESS_2025-11-08.md` for recent changes
3. Consult specific guide documents

---

## 📄 License

Private project - All rights reserved

---

## 🎉 Recent Updates (November 8, 2025)

- ✅ Added email subscription checkbox (GDPR compliant)
- ✅ Implemented alert thresholds editor (17 alert types)
- ✅ 2-column responsive layout with green divider
- ✅ Clear email notification settings
- ✅ Per-machine customizable thresholds
- ✅ SMTP system tested and verified
- ✅ Comprehensive documentation

**Next:** ESP32 integration + alert logic implementation

---

**Ready to monitor your HVAC systems!** 🌡️🚀
