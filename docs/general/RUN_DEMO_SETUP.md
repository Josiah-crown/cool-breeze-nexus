# Complete Demo Setup - Easy Way!

## 🎯 This Creates Everything Automatically
- 34 auth users with passwords
- 3 Companies + 10 Installers + 20 Clients + 1 Super Admin
- 50 Machines
- All relationships and hierarchy

---

## ⚡ **3 Steps Only:**

### **Step 1: Get Your Service Role Key (30 seconds)**

1. Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/settings/api
2. Scroll down to **"Project API keys"**
3. Find **"service_role"** key
4. Click **"Copy"** (it's a long key starting with `eyJ...`)

### **Step 2: Run Node Script (1 minute)**

Open PowerShell in your project folder:

```powershell
# Install Supabase JS if not already installed
npm install @supabase/supabase-js

# Edit the script - paste your service key
notepad create-demo-users.js
# Replace: YOUR_SERVICE_ROLE_KEY_HERE
# With: Your actual service_role key

# Run the script
node create-demo-users.js
```

**You'll see:**
```
✅ Created: headoffice@crowntechnologies.co.za
✅ Created: ironhorse@company.com
✅ Created: crown@crowntechnologies.co.za
...
✅ Created: client20@client.com

Created: 34
```

### **Step 3: Run SQL Script (30 seconds)**

1. Open: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/sql
2. Open `SETUP_DEMO.sql` in Cursor
3. `Ctrl+A`, `Ctrl+C` (copy all)
4. Paste in SQL Editor
5. `Ctrl+Enter` (run)

**Done!** 🎉

---

## ✅ **Test Your Demo**

Go to: http://localhost:8080

**Login as Super Admin:**
- Email: `headoffice@crowntechnologies.co.za`
- Password: `Demo123!`

**You'll see:**
- ✅ 3 Companies (Ironhorse, Crown, TomHVAC)
- ✅ 10 Installers (Blessing, Thami, Mark, etc.)
- ✅ 20 Clients (Client 1 through 20)
- ✅ 50 Machines (distributed across users)
- ✅ Full hierarchy working!

---

## 🧪 **Test Different Roles**

Log out and login as:

**Company:**
- Email: `crown@crowntechnologies.co.za`
- Password: `Demo123!`
- See: Your installers, their clients, all machines

**Installer:**
- Email: `blessing@installer.com`
- Password: `Demo123!`
- See: Your 2 clients and their 4 machines

**Client:**
- Email: `client1@client.com`
- Password: `Demo123!`
- See: Only your 2 machines

---

## 🗑️ **Cleanup After Demo**

When ready for production:

1. Open SQL Editor
2. Run `CLEANUP_DEMO.sql`
3. All demo data deleted!

---

## 🆘 **Troubleshooting**

**"Cannot find module '@supabase/supabase-js'"**
```powershell
npm install @supabase/supabase-js
```

**"service_role key invalid"**
- Make sure you copied the **service_role** key, not the **anon** key
- Check no extra spaces were copied

**"User already exists"**
- That's okay! Script will skip and continue
- Already-created users won't be duplicated

---

**Total time: ~2 minutes to full demo!** ⚡

