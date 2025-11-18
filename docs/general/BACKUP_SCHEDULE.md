# 📅 IoT Nexus - Backup Schedule & Procedures

**Keep your system safe with regular backups!**

---

## 🗓️ **BACKUP CALENDAR**

### **DAILY** (Automatic)
✅ **Supabase Auto-Backup**
- Happens automatically
- Just verify it's working monthly
- Check: Supabase Dashboard → Database → Backups

---

### **WEEKLY** (Every Sunday Evening - 15 mins)

#### **Task: Backup Website Files**

**Steps:**
1. ⏰ **Set reminder:** Sunday 6:00 PM
2. 🌐 **Login to cPanel:** https://cp60.domains.co.za:2083
3. 📁 **File Manager** → Navigate to `public_html`
4. 🗜️ **Right-click `public_html`** → Compress → ZIP
5. 📥 **Download** the ZIP file
6. 💾 **Save to:** `C:\Backups\IOTNexus\Website\backup_2025-11-10.zip`
7. 🗑️ **Delete old backups** (keep only last 4 weeks)

**Estimated Time:** 10-15 minutes

---

### **MONTHLY** (First Sunday of Month - 30 mins)

#### **Task 1: Full Database Export**

**Steps:**
1. 🌐 **Login to Supabase:** https://supabase.com/dashboard
2. 📊 **Go to:** Database → Backups
3. ➕ **Create Backup:** Name it `manual_backup_2025-11`
4. 💾 **Export Tables:** (Optional but recommended)
   - SQL Editor → Run export commands
   - Save CSVs to: `C:\Backups\IOTNexus\Database\2025-11\`

**Estimated Time:** 15 minutes

---

#### **Task 2: Backup Source Code**

**Steps:**
1. 📁 **Open:** `C:\Users\HP\Desktop\Webiste\Wesbite\`
2. 📋 **Copy entire folder:** `cool-breeze-nexus-main`
3. 📌 **Paste to:** `C:\Backups\IOTNexus\SourceCode\`
4. ✏️ **Rename to:** `cool-breeze-nexus_2025-11-05`
5. 🗜️ **Compress to ZIP** (optional, saves space)
6. 🗑️ **Delete old backups** (keep only last 6 months)

**Estimated Time:** 10 minutes

---

#### **Task 3: Backup Environment Variables**

**Steps:**
1. 📄 **Copy `.env` file** from project root
2. 💾 **Save to password manager** or encrypted USB
3. 🔒 **DO NOT** upload to cloud or email!

**Estimated Time:** 2 minutes

---

#### **Task 4: System Health Check**

**Steps:**
1. ✅ **Test Site:** Visit https://iotnexus.site
2. 🔐 **Test Login:** Super admin account
3. 🎛️ **Check Dashboard:** All machines display
4. 📊 **Supabase Health:** Project is active
5. 💽 **cPanel Storage:** Not near limit
6. 🔒 **SSL Certificate:** Valid and not expiring soon

**Estimated Time:** 5 minutes

---

### **QUARTERLY** (Every 3 Months - 1 hour)

#### **January, April, July, October**

**Tasks:**
1. 🔑 **Change Passwords:** All accounts (90-day rotation)
2. 🔄 **Update Dependencies:** `npm update` in project
3. 📚 **Update Documentation:** This file and others
4. 🧪 **Test Recovery:** Restore one backup to verify
5. 🔍 **Audit Users:** Remove inactive accounts
6. 🔑 **Audit API Keys:** Revoke unused ESP32 keys

**Estimated Time:** 1 hour

---

## 📂 **BACKUP STORAGE STRUCTURE**

Create this folder structure on your computer:

```
C:\Backups\IOTNexus\
├── Website\
│   ├── backup_2025-11-03.zip
│   ├── backup_2025-11-10.zip
│   ├── backup_2025-11-17.zip
│   └── backup_2025-11-24.zip     (keep 4 weeks)
│
├── Database\
│   ├── 2025-10\
│   │   ├── machines.csv
│   │   ├── profiles.csv
│   │   └── readings_raw.csv
│   ├── 2025-11\
│   │   └── (monthly exports)
│   └── (keep 12 months)
│
├── SourceCode\
│   ├── cool-breeze-nexus_2025-09-15.zip
│   ├── cool-breeze-nexus_2025-10-20.zip
│   └── cool-breeze-nexus_2025-11-05.zip  (keep 6 months)
│
├── Documentation\
│   ├── SYSTEM_ACCESS_AND_BACKUP.md
│   ├── DEPLOYMENT_GUIDE.md
│   └── (all docs, keep all versions)
│
└── Credentials\
    ├── .env_backup
    └── credentials.txt  (encrypted!)
```

---

## 🔄 **BACKUP ROTATION POLICY**

### **What to Keep:**
- **Website Backups:** Last 4 weeks (delete older)
- **Database Backups:** Last 12 months (delete older)
- **Source Code:** Last 6 months (delete older)
- **Documentation:** Keep all versions (small file size)

### **When to Delete:**
- **Weekly:** Delete website backups older than 4 weeks
- **Monthly:** Delete source code older than 6 months
- **Yearly:** Delete database exports older than 12 months

---

## ⚠️ **CRITICAL BACKUP ITEMS**

### **The "Disaster Recovery Kit"**

These 5 items can restore your entire system:

1. ✅ **Latest Website Backup** (public_html ZIP)
2. ✅ **Supabase Credentials** (login + API keys)
3. ✅ **cPanel Credentials** (hosting access)
4. ✅ **Source Code Backup** (latest version)
5. ✅ **This Documentation** (recovery procedures)

**Store in 3 places:**
- 💻 Local: `C:\Backups\IOTNexus\`
- 🔐 Cloud: Password Manager (encrypted)
- 💾 Physical: USB drive in safe location

---

## 📋 **PRINTABLE CHECKLIST**

### **Weekly Backup (Sunday 6 PM)**
```
Date: ___________

□ Login to cPanel
□ Compress public_html folder
□ Download ZIP file
□ Save to C:\Backups\IOTNexus\Website\
□ Delete backups older than 4 weeks
□ Verify download worked

Time taken: _____ minutes
Issues: _________________________
```

---

### **Monthly Backup (First Sunday)**
```
Date: ___________

□ Create Supabase manual backup
□ Export database tables to CSV
□ Copy source code folder
□ Compress to ZIP
□ Backup .env file to password manager
□ Test site: https://iotnexus.site
□ Test login works
□ Check Supabase health
□ Check cPanel storage usage
□ Update this document if needed

Time taken: _____ minutes
Issues: _________________________
```

---

### **Quarterly Maintenance (Every 3 Months)**
```
Date: ___________

□ Change all passwords
□ Run: npm update (in project)
□ Test backup restoration
□ Remove inactive user accounts
□ Revoke unused ESP32 API keys
□ Review and update documentation
□ Plan any upcoming changes

Time taken: _____ minutes
Issues: _________________________
Next quarterly date: ___________
```

---

## 🆘 **IF YOU FORGET TO BACKUP**

**Don't panic!** Supabase has automatic backups.

**Recovery options:**
1. ✅ **Database:** Supabase auto-backups (daily)
2. ✅ **Source Code:** Still on your computer
3. ⚠️ **Website Files:** If not backed up, can rebuild from source

**Lesson learned:** Set calendar reminders!

---

## 🔔 **BACKUP REMINDERS**

### **Set These Calendar Reminders:**

**Weekly:**
- **Day:** Sunday
- **Time:** 6:00 PM
- **Title:** "IOT Nexus - Weekly Website Backup"
- **Recurring:** Every Sunday
- **Alert:** 15 minutes before

**Monthly:**
- **Day:** First Sunday of month
- **Time:** 6:00 PM
- **Title:** "IOT Nexus - Full Monthly Backup"
- **Recurring:** First Sunday of each month
- **Alert:** 30 minutes before

**Quarterly:**
- **Months:** January, April, July, October
- **Day:** First Sunday
- **Time:** 2:00 PM
- **Title:** "IOT Nexus - Quarterly Maintenance"
- **Recurring:** Every 3 months
- **Alert:** 1 day before

---

## 📊 **BACKUP LOG**

Track your backups here:

| Date | Type | Status | Notes |
|------|------|--------|-------|
| 2025-11-05 | Initial | ✅ | Site deployed |
| | | | |
| | | | |
| | | | |

---

## ✅ **QUICK START**

**New to backups? Start here:**

1. 📁 **Create folder:** `C:\Backups\IOTNexus\` (with subfolders above)
2. 🗓️ **Set reminders:** Weekly and monthly calendar alerts
3. 🔐 **Install password manager:** LastPass, 1Password, or Bitwarden
4. 📝 **Fill in credentials:** In SYSTEM_ACCESS_AND_BACKUP.md
5. ✅ **Do first backup:** Follow weekly procedure above
6. 🎉 **You're protected!**

---

**Remember:** 10 minutes of backup work can save 10 hours of recovery work!

---

**Last Updated:** 2025-11-05  
**Next Review:** 2025-12-05  
**Document Version:** 1.0


