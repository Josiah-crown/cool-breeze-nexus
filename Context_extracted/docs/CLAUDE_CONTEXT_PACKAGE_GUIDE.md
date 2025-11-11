# 📦 Claude AI Context Package - IoT Nexus Project

**For uploading to Claude.ai to continue development**

---

## 📋 **Package Contents**

This ZIP file contains everything needed for Claude AI to understand and work on the IoT Nexus HVAC Monitoring Platform.

---

## 🗂️ **What's Inside**

### **1. Documentation** (`docs/` folder)
Complete project documentation including:
- `README.md` - Documentation overview
- `SYSTEM_ACCESS_AND_BACKUP.md` - Credentials and backup procedures
- `QUICK_REFERENCE_CARD.md` - One-page reference
- `BACKUP_SCHEDULE.md` - Backup calendar and procedures
- `progress/2025-11-05-progress.md` - Latest session progress report

### **2. Deployment Guides** (root level)
- `DEPLOYMENT_GUIDE.md` - Comprehensive deployment instructions
- `DEPLOY_NOW.md` - Quick deployment guide
- `ANALYSIS_REPORT.md` - Full project analysis

### **3. Production Build** (`dist/` folder)
The current production-ready website files:
- `index.html` - Main HTML file
- `assets/` - Compiled CSS and JavaScript
- `.htaccess` - Apache configuration

### **4. Key Source Files** (for reference)
Selected source files to understand the codebase:
- `package.json` - Dependencies and scripts
- `vite.config.ts` - Build configuration
- `tsconfig.json` - TypeScript configuration
- `.env.example` - Environment variables template
- Key React components (select ones)

---

## 🚀 **Current Project Status**

**Date:** November 5, 2025  
**Status:** ✅ **DEPLOYED TO PRODUCTION**  
**Live URL:** https://iotnexus.site

### **What's Working:**
- ✅ User authentication and role-based access
- ✅ Machine monitoring dashboard
- ✅ Company/installer/client hierarchy
- ✅ API key generation for ESP32 devices
- ✅ Responsive design (desktop, tablet, mobile)
- ✅ All CRUD operations
- ✅ Notification toggles
- ✅ Consistent styling across all components

### **What's Pending:**
- ⏳ ESP32 hardware integration (testing tonight)
- ⏳ Real-time data from readings_raw table
- ⏳ Supabase Realtime subscriptions
- ⏳ Data simulator script
- ⏳ Historical data from database (currently mocked)

---

## 🔧 **Technology Stack**

- **Frontend:** React 18 + TypeScript
- **Build Tool:** Vite
- **Styling:** Tailwind CSS + shadcn/ui components
- **Database:** Supabase (PostgreSQL)
- **Authentication:** Supabase Auth
- **Hosting:** cPanel (domains.co.za)
- **Domain:** iotnexus.site

---

## 💻 **Development Environment**

### **Requirements:**
- Node.js (v18+)
- npm (v9+)
- Code editor (VS Code recommended)

### **Setup Commands:**
```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### **Environment Variables:**
Create a `.env` file with:
```env
VITE_SUPABASE_URL=https://lkvnhskxbxzeohopqjcr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_anon_key_here
```

---

## 📊 **Database Schema**

### **Existing Tables:**
- `profiles` - User accounts and roles
- `machines` - HVAC machine records
- `api_keys` - ESP32 authentication keys

### **Pending Tables:**
- `readings_raw` - Sensor data from ESP32 devices
- `alerts` - System alerts and notifications

---

## 🎯 **Next Development Tasks**

### **High Priority:**
1. **ESP32 Integration**
   - Test hardware connection with generated API key
   - Verify data flow to dashboard

2. **Database Integration**
   - Create `readings_raw` table migration
   - Create `alerts` table migration
   - Replace mock historical data with real queries

3. **Real-Time Updates**
   - Implement Supabase Realtime subscriptions
   - Add visual flash animations on new data
   - Auto-update dashboard without refresh

### **Medium Priority:**
4. Create data simulator script (20 machines posting every 5 mins)
5. Update machine status to pull from latest readings
6. Implement proper historical data queries

### **Low Priority:**
7. Code splitting for performance
8. Add service worker for offline support
9. Comprehensive testing suite

---

## 🔑 **Important Context for Claude**

### **Recent Session (Nov 5, 2025):**
We spent ~4 hours on UI/UX refinements including:
- Fixed notification toggle synchronization
- Implemented responsive grid layouts
- Standardized machine card spacing
- Updated all dialogs to match login styling
- Made text readable on green backgrounds
- Deployed to production at iotnexus.site

### **Key Design Decisions:**
1. **Responsive Grids:** Using `repeat(auto-fill, minmax(Xpx, 1fr))` for dynamic layouts
2. **One Open at a Time:** Companies, installers, and clients have accordion logic
3. **API Key Security:** Keys shown once, then hashed in database
4. **Super Admin Only:** API key management restricted to super admin role
5. **Page Reloads:** Used after API key operations for state synchronization

### **Known Issues:**
- Mock historical data still in use (needs database queries)
- No real-time updates yet (needs Supabase Realtime)
- Bundle size warning (986 KB, could optimize with code splitting)

### **Browser Cache Warning:**
Users may need hard refresh (Ctrl+Shift+R) after updates

---

## 🗂️ **File Structure**

```
cool-breeze-nexus-main/
├── src/                          (React source code)
│   ├── components/               (UI components)
│   ├── pages/                    (Page components)
│   ├── hooks/                    (Custom React hooks)
│   ├── contexts/                 (React contexts)
│   ├── integrations/             (Supabase integration)
│   └── types/                    (TypeScript types)
├── dist/                         (Production build - upload this!)
├── docs/                         (All documentation)
├── supabase/                     (Database migrations)
├── public/                       (Static assets)
├── package.json                  (Dependencies)
├── vite.config.ts               (Build config)
└── [config files]
```

---

## 🎨 **Styling Guidelines**

### **Current Design System:**
- **Primary Color:** Green theme (HSL-based)
- **Cards:** Gradient backgrounds with blur effects
- **Inputs:** Border-2, green focus states
- **Dialogs:** Match login screen styling
- **Accordions:** Black text on green when open
- **Spacing:** 80px margins, consistent gaps

### **Tailwind Classes Pattern:**
```css
/* Inputs */
border-2 border-foreground bg-accent/10 
hover:bg-accent/20 hover:border-transparent 
focus:border-green-500 focus:bg-accent/20 
transition-all

/* Cards */
rounded-xl bg-gradient-to-br 
from-[hsl(var(--panel-bg))] to-[hsl(var(--card))] 
shadow-lg border border-border
```

---

## 🔐 **Security Notes**

### **Credentials Removed:**
This package does NOT contain:
- ❌ Real passwords or API keys
- ❌ `.env` file with secrets
- ❌ Database credentials
- ❌ Service role keys

### **Placeholders Only:**
All sensitive information has been replaced with:
- `________________________` for credentials
- `your_key_here` for API keys
- Template values in documentation

**You'll need to ask me for actual credentials if needed!**

---

## 💡 **Tips for Claude AI**

### **When Analyzing This Package:**
1. Start with `docs/progress/2025-11-05-progress.md` for recent context
2. Review `ANALYSIS_REPORT.md` for full project structure
3. Check `package.json` for dependencies and versions
4. Look at `src/` files for implementation details

### **Common Questions:**
- **"What's the database schema?"** → See ANALYSIS_REPORT.md
- **"How do I deploy?"** → See DEPLOYMENT_GUIDE.md or DEPLOY_NOW.md
- **"What changed recently?"** → See docs/progress/
- **"How do backups work?"** → See BACKUP_SCHEDULE.md
- **"What's the tech stack?"** → See above section

### **Making Changes:**
1. Modify files in `src/` folder
2. Test with `npm run dev`
3. Build with `npm run build`
4. Upload `dist/` contents to cPanel

---

## 📞 **Project Owner**

**Developer:** Josiah Pettit  
**Location:** South Africa  
**Project Start:** November 2025  
**Current Phase:** Production deployment + ESP32 integration

---

## ✅ **Quick Start for Claude**

### **To Get Up to Speed:**
1. ✅ Read this file (you are here!)
2. ✅ Check `docs/progress/2025-11-05-progress.md` for latest status
3. ✅ Review `ANALYSIS_REPORT.md` for full context
4. ✅ Look at pending tasks in progress report
5. ✅ Ask clarifying questions!

### **To Continue Development:**
1. Understand the current state from progress report
2. Check what's pending in "Next Session" section
3. Review relevant source files in `src/`
4. Make changes, test, and build
5. Document changes in new progress report

---

## 🚧 **Current Blockers**

- ⏳ **ESP32 Testing:** Waiting to get home tonight
- ⏳ **Database Tables:** readings_raw and alerts need migrations
- ⏳ **Real Data:** Currently using mock historical data

---

## 🎉 **Success Metrics**

- ✅ **Deployed:** https://iotnexus.site is live
- ✅ **Responsive:** Works on all screen sizes
- ✅ **Functional:** All core features working
- ✅ **Documented:** Comprehensive docs created
- ✅ **Secure:** Role-based access implemented
- ⏳ **Hardware:** ESP32 integration pending

---

**Package Created:** November 5, 2025  
**Package Version:** 1.0  
**For:** Claude AI (claude.ai)  
**Purpose:** Continue development with full context

---

## 📝 **Usage Instructions**

### **For Josiah (Package Creator):**
1. Create a ZIP of the files listed below
2. Upload to Claude.ai
3. Reference this guide in your first message

### **For Claude AI:**
You now have full context to:
- Continue development
- Answer questions
- Make changes
- Deploy updates
- Fix bugs
- Add features

**Start by reading the latest progress report!**

---

**Welcome to the IoT Nexus project! All context is in this package.** 🚀

