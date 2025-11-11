# 🔐 IoT Nexus - System Access & Backup Guide

**Last Updated:** November 5, 2025  
**Status:** Production Live  
**Critical Document:** Keep this secure and updated!

---

## ⚠️ **SECURITY WARNING**

**DO NOT commit this file with real passwords!**
- Store actual passwords in a password manager (LastPass, 1Password, Bitwarden)
- Keep a physical backup in a secure location
- Never share credentials via email or unencrypted channels

---

## 🌐 **Production Website**

### **Live Site**
- **URL:** https://iotnexus.site
- **Hosting Provider:** domains.co.za (cPanel)
- **Server Location:** South Africa

### **Super Admin Account**
- **Email:** `________________________`
- **Password:** `________________________`
- **Role:** Super Admin (full access)
- **Created:** November 2025

### **Test Accounts** (if any)
- **Company Account:**
  - Email: `________________________`
  - Password: `________________________`
  - Role: Company

- **Installer Account:**
  - Email: `________________________`
  - Password: `________________________`
  - Role: Installer

- **Client Account:**
  - Email: `________________________`
  - Password: `________________________`
  - Role: Client

---

## 🖥️ **Web Hosting (cPanel)**

### **domains.co.za Account**
- **Provider:** domains.co.za
- **Domain:** iotnexus.site
- **cPanel URL:** https://cp60.domains.co.za:2083 (check your actual URL)
- **Username:** `________________________`
- **Password:** `________________________`
- **Email on file:** `________________________`

### **FTP Access** (if needed)
- **Host:** ftp.iotnexus.site (or check cPanel)
- **Port:** 21
- **Username:** `________________________` (usually same as cPanel)
- **Password:** `________________________` (usually same as cPanel)

### **File Locations**
- **Website Root:** `/home/iotnexus/public_html/`
- **Uploaded Files:** `public_html/` (index.html, assets/, .htaccess)
- **Backup Location:** `/home/iotnexus/backups/` (create this folder)

---

## 🗄️ **Database (Supabase)**

### **Supabase Account**
- **Email:** `________________________`
- **Password:** `________________________`
- **Dashboard:** https://supabase.com/dashboard

### **Project Details**
- **Project Name:** cool-breeze-nexus (or your project name)
- **Project ID:** `lkvnhskxbxzeohopqjcr`
- **Project URL:** https://lkvnhskxbxzeohopqjcr.supabase.co
- **Region:** (check in Supabase dashboard)

### **API Keys**
- **Project URL:** `https://lkvnhskxbxzeohopqjcr.supabase.co`
- **Anon Public Key:** `________________________` (used in frontend)
- **Service Role Key:** `________________________` (NEVER expose to frontend!)

### **Database Access**
- **Direct Connection:** Available in Supabase Dashboard → Project Settings → Database
- **Host:** `db.lkvnhskxbxzeohopqjcr.supabase.co`
- **Port:** 5432
- **Database:** postgres
- **Password:** (found in Supabase settings)

---

## 💻 **Development Environment**

### **Local Project Location**
- **Path:** `C:\Users\HP\Desktop\Webiste\Wesbite\cool-breeze-nexus-main\`
- **Framework:** React + TypeScript + Vite
- **Package Manager:** npm

### **Environment Variables (.env file)**
```env
VITE_SUPABASE_URL=https://lkvnhskxbxzeohopqjcr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=________________________
```

### **GitHub Repository** (if using)
- **Repository URL:** `________________________`
- **Username:** `________________________`
- **Personal Access Token:** `________________________`
- **Branch:** main (or master)

---

## 🔑 **ESP32 API Keys**

### **Generated Keys** (Track these)

| Key ID | Generated Date | Assigned To | Machine ID | Status |
|--------|---------------|-------------|------------|--------|
| esp32_xxx1 | 2025-11-05 | Test Machine 1 | - | Active |
| esp32_xxx2 | - | - | - | - |
| esp32_xxx3 | - | - | - | - |

**Note:** Keys are only shown once during generation. Store them securely!

---

## 🔧 **Third-Party Services**

### **reCAPTCHA (Google)**
- **Site Key:** (found in your code or Google Console)
- **Secret Key:** (stored in Supabase or backend)
- **Console:** https://www.google.com/recaptcha/admin

### **Email Service** (if configured)
- **Provider:** (e.g., SendGrid, Mailgun, SMTP)
- **API Key:** `________________________`
- **From Email:** `________________________`

---

## 💾 **BACKUP PROCEDURES**

### **1. Website Files Backup (Weekly)**

#### **Method A: cPanel File Manager**
1. Login to cPanel (cp60.domains.co.za:2083)
2. Open **File Manager**
3. Navigate to `/home/iotnexus/`
4. Right-click `public_html` folder
5. Click **"Compress"** → Select "Zip Archive"
6. Name it: `backup_website_YYYY-MM-DD.zip`
7. Right-click the zip → **Download**
8. Store in: `C:\Backups\IOTNexus\Website\`

#### **Method B: FTP Download**
1. Use FileZilla or WinSCP
2. Connect to FTP (credentials above)
3. Download entire `public_html` folder
4. Save to: `C:\Backups\IOTNexus\Website\backup_YYYY-MM-DD\`

**Backup Schedule:** Every Sunday at 6 PM
**Retention:** Keep last 4 backups (monthly)

---

### **2. Database Backup (Daily - Automatic via Supabase)**

Supabase automatically backs up your database, but you should also:

#### **Manual Database Backup:**
1. Go to: https://supabase.com/dashboard/project/lkvnhskxbxzeohopqjcr
2. Click **"Database"** → **"Backups"**
3. Click **"Create Backup"**
4. Name it: `manual_backup_YYYY-MM-DD`
5. Wait for completion
6. Optionally export tables:
   - Go to **SQL Editor**
   - Run: `COPY (SELECT * FROM machines) TO STDOUT WITH CSV HEADER;`
   - Save output to: `C:\Backups\IOTNexus\Database\`

#### **Export All Tables (Monthly)**
```sql
-- Run in Supabase SQL Editor
-- Export machines
COPY (SELECT * FROM machines) TO STDOUT WITH CSV HEADER;

-- Export profiles
COPY (SELECT * FROM profiles) TO STDOUT WITH CSV HEADER;

-- Export readings_raw (if exists)
COPY (SELECT * FROM readings_raw WHERE created_at > NOW() - INTERVAL '30 days') TO STDOUT WITH CSV HEADER;

-- Export alerts (if exists)
COPY (SELECT * FROM alerts WHERE created_at > NOW() - INTERVAL '30 days') TO STDOUT WITH CSV HEADER;
```

Save all CSVs to: `C:\Backups\IOTNexus\Database\YYYY-MM-DD\`

**Backup Schedule:** First day of each month
**Retention:** Keep last 12 backups (yearly)

---

### **3. Source Code Backup (After Each Change)**

#### **Method A: GitHub (Recommended)**
```bash
# After making changes
cd C:\Users\HP\Desktop\Webiste\Wesbite\cool-breeze-nexus-main
git add .
git commit -m "Description of changes"
git push origin main
```

#### **Method B: Manual Backup**
1. Copy entire project folder
2. Paste to: `C:\Backups\IOTNexus\SourceCode\`
3. Rename to: `cool-breeze-nexus_YYYY-MM-DD`
4. Compress to ZIP to save space

**Backup Schedule:** After every significant change
**Retention:** Keep last 10 versions

---

### **4. Environment Variables Backup**

Create a secure backup of your `.env` file:

1. Copy `.env` file from project root
2. Save to encrypted USB drive or password manager
3. **DO NOT** store in cloud unless encrypted
4. Update whenever keys change

**Location:** Password Manager or Encrypted USB
**Update:** Whenever Supabase keys are rotated

---

### **5. Documentation Backup**

Backup all docs including this file:

1. Copy entire `docs/` folder
2. Save to: `C:\Backups\IOTNexus\Documentation\`
3. Include:
   - This file (SYSTEM_ACCESS_AND_BACKUP.md)
   - DEPLOYMENT_GUIDE.md
   - DEPLOY_NOW.md
   - Progress reports
   - ESP32_INTEGRATION_GUIDE.md

**Backup Schedule:** After each major update
**Retention:** Keep all versions

---

## 🔄 **DISASTER RECOVERY PROCEDURES**

### **Scenario 1: Website Goes Down**

1. **Check if hosting is up:**
   - Login to cPanel
   - Check server status
   - Check domain DNS settings

2. **Restore from backup:**
   - Login to cPanel File Manager
   - Delete contents of `public_html`
   - Upload latest backup ZIP
   - Extract ZIP file
   - Test site: https://iotnexus.site

**Estimated Recovery Time:** 15 minutes

---

### **Scenario 2: Database Corruption**

1. **Check Supabase status:**
   - Go to Supabase dashboard
   - Check project health

2. **Restore from backup:**
   - Supabase Dashboard → Database → Backups
   - Select most recent backup
   - Click "Restore"
   - Verify data in SQL Editor

**Estimated Recovery Time:** 30 minutes

---

### **Scenario 3: Lost Source Code**

1. **If using GitHub:**
   ```bash
   git clone https://github.com/yourusername/cool-breeze-nexus.git
   cd cool-breeze-nexus
   npm install
   ```

2. **If using manual backups:**
   - Extract latest backup from `C:\Backups\IOTNexus\SourceCode\`
   - Copy to working directory
   - Run `npm install`

3. **Restore .env file:**
   - Get from password manager
   - Save as `.env` in project root

**Estimated Recovery Time:** 20 minutes

---

### **Scenario 4: Lost API Keys**

1. **Supabase Keys:**
   - Login to Supabase Dashboard
   - Project Settings → API
   - Copy anon/public key (always visible)
   - Service role key (revealed with "Show" button)

2. **ESP32 API Keys:**
   - If lost, they cannot be recovered
   - Generate new keys from dashboard
   - Re-assign to affected machines
   - Update ESP32 devices with new keys

**Estimated Recovery Time:** 10 minutes per key

---

### **Scenario 5: Complete System Failure**

**Full Recovery Steps:**

1. **Setup new hosting account** (if needed)
   - Purchase domain/hosting
   - Setup cPanel account

2. **Restore website files:**
   - Upload latest `public_html` backup
   - Configure `.htaccess`
   - Test basic site loading

3. **Setup new Supabase project** (if needed)
   - Create new project
   - Run migrations from `supabase/migrations/`
   - Import data from CSV backups
   - Update API keys in `.env`

4. **Rebuild and deploy:**
   ```bash
   npm install
   npm run build
   # Upload dist/ to cPanel
   ```

5. **Update DNS settings:**
   - Point domain to new hosting
   - Update Supabase Site URL
   - Update Redirect URLs

6. **Test everything:**
   - Login works
   - Machines display
   - CRUD operations work
   - ESP32 can connect

**Estimated Recovery Time:** 2-4 hours

---

## 📋 **BACKUP CHECKLIST**

### **Daily** (Automatic)
- [ ] Supabase automatic backups (verify in dashboard)

### **Weekly** (Every Sunday)
- [ ] Download website files from cPanel
- [ ] Store in `C:\Backups\IOTNexus\Website\`
- [ ] Delete backups older than 1 month

### **Monthly** (First of each month)
- [ ] Export all Supabase tables to CSV
- [ ] Create manual Supabase backup
- [ ] Backup source code folder
- [ ] Update this documentation if needed
- [ ] Test one recovery procedure

### **After Changes** (As needed)
- [ ] Commit code to GitHub (if using)
- [ ] Create source code backup
- [ ] Update documentation
- [ ] Test deployment process

---

## 🛠️ **MAKING CHANGES TO THE SITE**

### **Process for Updates:**

1. **Make changes locally:**
   ```bash
   cd C:\Users\HP\Desktop\Webiste\Wesbite\cool-breeze-nexus-main
   # Edit files in src/ folder
   npm run dev  # Test locally
   ```

2. **Build production version:**
   ```bash
   npm run build
   # Creates new dist/ folder
   ```

3. **Backup current production:**
   - Download current `public_html` from cPanel
   - Save as backup before uploading new version

4. **Upload to production:**
   - Login to cPanel File Manager
   - Delete old files in `public_html` (keep backups!)
   - Upload new files from `dist/`
   - Test: https://iotnexus.site

5. **Verify deployment:**
   - [ ] Site loads
   - [ ] Login works
   - [ ] All features functional
   - [ ] Mobile responsive
   - [ ] API keys still work

6. **Document changes:**
   - Update progress report in `docs/progress/`
   - Commit to GitHub (if using)

---

## 📞 **SUPPORT CONTACTS**

### **Hosting Support**
- **Provider:** domains.co.za
- **Support Email:** `________________________`
- **Support Phone:** `________________________`
- **Hours:** Business hours (check website)

### **Supabase Support**
- **Support Portal:** https://supabase.com/support
- **Community:** https://github.com/supabase/supabase/discussions
- **Documentation:** https://supabase.com/docs

### **Development Help**
- **AI Assistant:** (This conversation system)
- **React Docs:** https://react.dev
- **Vite Docs:** https://vitejs.dev

---

## 🔐 **PASSWORD ROTATION SCHEDULE**

### **When to Change Passwords:**
- Every 90 days (quarterly)
- Immediately if suspected breach
- When employee/contractor leaves
- After sharing for support issues

### **What to Update When Changing Passwords:**

**Supabase Password Changed:**
- [ ] Update saved in password manager
- [ ] No code changes needed (keys stay same)

**Supabase API Keys Rotated:**
- [ ] Update `.env` file locally
- [ ] Rebuild: `npm run build`
- [ ] Re-deploy to production
- [ ] Test thoroughly

**cPanel Password Changed:**
- [ ] Update saved in password manager
- [ ] Update FTP clients (FileZilla, etc.)
- [ ] Update backup scripts (if any)

**Super Admin Password Changed:**
- [ ] Update saved in password manager
- [ ] Inform team members (if any)

---

## 📊 **MONITORING & HEALTH CHECKS**

### **Weekly Checks (Every Monday):**
- [ ] Visit https://iotnexus.site (verify it loads)
- [ ] Test login with super admin account
- [ ] Check Supabase dashboard (verify project is active)
- [ ] Review cPanel disk usage (ensure not full)
- [ ] Check SSL certificate expiry (should auto-renew)

### **Monthly Checks (First of month):**
- [ ] Review all backups are present
- [ ] Test one backup restoration
- [ ] Check for Supabase service updates
- [ ] Review API key usage (if analytics available)
- [ ] Check hosting renewal date

### **Quarterly Checks (Every 3 months):**
- [ ] Update all passwords
- [ ] Review user accounts (remove inactive)
- [ ] Update Node.js dependencies: `npm update`
- [ ] Review and update documentation
- [ ] Audit ESP32 API keys (revoke unused)

---

## 📝 **CHANGE LOG**

| Date | Changed By | What Changed | Notes |
|------|-----------|--------------|-------|
| 2025-11-05 | Josiah | Initial deployment | Site went live |
| | | | |
| | | | |
| | | | |

**Instructions:** Update this table whenever significant changes are made.

---

## ✅ **QUICK REFERENCE - MOST IMPORTANT**

**Emergency Recovery Kit** (Keep updated):
1. ✅ This document (SYSTEM_ACCESS_AND_BACKUP.md)
2. ✅ Latest website backup (from cPanel)
3. ✅ `.env` file (with Supabase keys)
4. ✅ Super admin login credentials
5. ✅ cPanel login credentials
6. ✅ Supabase login credentials

**Store in 3 locations:**
- 💻 Computer: `C:\Backups\IOTNexus\`
- 🔐 Password Manager: (LastPass, 1Password, Bitwarden)
- 💾 Physical Backup: (USB drive in safe place)

---

**Last Updated:** 2025-11-05  
**Next Review:** 2025-12-05  
**Document Version:** 1.0

---

🔒 **REMEMBER: Keep this document secure and never commit real passwords to Git!**

