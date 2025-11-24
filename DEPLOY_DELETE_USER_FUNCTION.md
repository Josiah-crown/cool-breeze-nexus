# 🚀 Deploy Delete-User Edge Function

## ⚠️ **Issue**
The `delete-user` edge function exists in your codebase but hasn't been deployed to Supabase yet.

## ✅ **Solution: Deploy the Function**

### **Option 1: Using Supabase CLI (Recommended)**

1. **Install Supabase CLI** (if not already installed):
   ```bash
   npm install -g supabase
   ```

2. **Login to Supabase:**
   ```bash
   supabase login
   ```

3. **Link your project:**
   ```bash
   supabase link --project-ref wjyanxstvbiqefmgpccb
   ```

4. **Deploy the function:**
   ```bash
   supabase functions deploy delete-user
   ```

---

### **Option 2: Using Supabase Dashboard (Manual)**

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/functions

2. **Create New Function:**
   - Click **"Create a new function"**
   - Name it: `delete-user`

3. **Copy the Code:**
   - Open `supabase/functions/delete-user/index.ts` in your editor
   - Copy the entire contents

4. **Paste in Dashboard:**
   - Paste the code into the function editor
   - Click **"Deploy"**

---

### **Option 3: Using Supabase Dashboard (Edit Existing)**

If the function exists but isn't working:

1. **Go to Supabase Dashboard:**
   - Navigate to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb/functions

2. **Find `delete-user` function:**
   - If it exists, click on it
   - If it doesn't exist, create it (Option 2)

3. **Replace the code:**
   - Copy contents from `supabase/functions/delete-user/index.ts`
   - Replace existing code
   - Click **"Deploy"**

---

## ✅ **Verify Deployment**

After deploying, test it:

1. **Go to your website**
2. **Try to delete a client**
3. **Should work without CORS error**

---

## 🔍 **Check Function Status**

In Supabase Dashboard:
- Go to **Edge Functions** → **delete-user**
- Check **"Logs"** tab to see if it's working
- Check **"Settings"** to verify environment variables are set

---

## ⚠️ **Environment Variables**

The function needs these environment variables (should be auto-set):
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `SUPABASE_ANON_KEY`

These are usually set automatically by Supabase, but verify in the function settings.

---

**Last Updated:** November 20, 2025  
**Status:** Ready to deploy

