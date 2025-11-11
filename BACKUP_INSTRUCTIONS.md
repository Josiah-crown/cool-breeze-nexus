# Backup Instructions

## 📦 **Create Full Project Backup**

### **Method 1: Using Windows File Explorer (Easiest)**

1. **Navigate to:** `C:\Users\HP\Desktop\Webiste\Wesbite\`
2. **Right-click** on `cool-breeze-nexus-main` folder
3. **Select:** "Send to → Compressed (zipped) folder"
4. **Name it:** `cool-breeze-nexus-BACKUP-2025-11-07.zip`
5. **Move to safe location** (external drive, cloud storage, etc.)

**Estimated size:** ~150-200 MB (includes node_modules)

---

### **Method 2: PowerShell (Excludes node_modules - Smaller)**

Run this in PowerShell:

```powershell
cd C:\Users\HP\Desktop\Webiste\Wesbite

# Create backup without node_modules (faster, smaller)
Compress-Archive -Path "cool-breeze-nexus-main\*" -DestinationPath "cool-breeze-nexus-BACKUP-2025-11-07.zip" -Force -CompressionLevel Optimal

# Exclude node_modules manually by copying first
$backupDir = "cool-breeze-nexus-backup-temp"
robocopy "cool-breeze-nexus-main" $backupDir /E /XD node_modules dist .git
Compress-Archive -Path "$backupDir\*" -DestinationPath "cool-breeze-nexus-CLEAN-BACKUP-2025-11-07.zip" -Force
Remove-Item -Recurse -Force $backupDir
```

**Estimated size:** ~5-10 MB (excludes node_modules, dist, .git)

---

## 🗄️ **Backup Supabase Database**

### **Option 1: Via Supabase Dashboard**

1. **Go to:** https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/settings/storage
2. **Click:** "Database" in left sidebar
3. **Click:** "Backups" tab
4. **Click:** "Create backup" button
5. **Download** the backup file

### **Option 2: Export Data as SQL**

Run this SQL in Supabase SQL Editor to export specific tables:

```sql
-- Export user_roles
COPY (SELECT * FROM public.user_roles) TO STDOUT WITH CSV HEADER;

-- Export profiles
COPY (SELECT * FROM public.profiles) TO STDOUT WITH CSV HEADER;

-- Export machines
COPY (SELECT * FROM public.machines) TO STDOUT WITH CSV HEADER;

-- Export assignments
COPY (SELECT * FROM public.installer_company_assignments) TO STDOUT WITH CSV HEADER;
COPY (SELECT * FROM public.client_admin_assignments) TO STDOUT WITH CSV HEADER;
```

Save each result as CSV files.

---

## 📋 **What to Include in Backup**

### **Essential Files (MUST backup):**
✅ `.env.local` - Supabase credentials
✅ `src/` folder - All source code
✅ `supabase/migrations/` - Database schema
✅ `package.json` & `package-lock.json` - Dependencies
✅ `create-demo-users.js` - Demo user creation script
✅ `SETUP_DEMO.sql` - Demo data script
✅ `CLEANUP_DEMO.sql` - Cleanup script
✅ `ALL_MIGRATIONS_COMBINED.sql` - Full schema
✅ `docs/` folder - Documentation
✅ All `.md` files in root

### **Can Exclude (Regenerable):**
❌ `node_modules/` - Reinstall with `npm install`
❌ `dist/` - Rebuild with `npm run build`
❌ `.git/` - Version control history (if you have remote repo)

---

## 🔄 **Restore from Backup**

### **To Restore Project:**

1. **Extract ZIP** to desired location
2. **Install dependencies:**
   ```powershell
   cd cool-breeze-nexus-main
   npm install
   ```
3. **Verify `.env.local`** has correct Supabase credentials
4. **Start dev server:**
   ```powershell
   npm run dev
   ```

### **To Restore Database:**

If you need to recreate the database:

1. **Create new Supabase project** (or use existing)
2. **Run:** `ALL_MIGRATIONS_COMBINED.sql` in SQL Editor
3. **Run:** `node create-demo-users.js` to create auth users
4. **Run:** `SETUP_DEMO.sql` to create demo data
5. **Update** `.env.local` with new Supabase URL and keys

---

## 📅 **Backup Schedule Recommendation**

- **Before major changes:** Create backup
- **Weekly:** Backup database (Supabase auto-backups daily)
- **Monthly:** Full project ZIP backup
- **Before deployment:** Always backup both code and database

---

## ☁️ **Cloud Backup Options**

Store backups in:
- ✅ **Google Drive** (15 GB free)
- ✅ **OneDrive** (5 GB free)
- ✅ **External USB drive**
- ✅ **GitHub** (for code only, NOT .env.local)

---

## 🚨 **Emergency Recovery**

If something breaks:

1. **Stop dev server** (`Ctrl+C` in terminal)
2. **Extract backup ZIP** to new folder
3. **Copy `.env.local`** from backup
4. **Run** `npm install`
5. **Run** `npm run dev`
6. **Test** at `http://localhost:8080`

If database is corrupted:
1. **Restore Supabase backup** from dashboard
2. OR **Run** `ALL_MIGRATIONS_COMBINED.sql` + demo scripts

---

**✅ Backup created successfully = Peace of mind!** 🎉

