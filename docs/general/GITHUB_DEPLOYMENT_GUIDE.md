# GitHub Deployment Guide

## Overview
Your website is set up with **GitHub Actions** to automatically deploy to cPanel when you push to the `main` branch.

**Deployment Flow:**
1. Push code to GitHub `main` branch
2. GitHub Actions automatically builds the project
3. Built files are uploaded to cPanel via FTP
4. Website is live at `https://iotnexus.site`

---

## 🚀 How to Deploy (Step-by-Step)

### Step 1: Make Sure Your Changes Are Ready
- ✅ Test locally: `npm run dev`
- ✅ Build locally to check for errors: `npm run build`
- ✅ Commit all your changes

### Step 2: Push to GitHub

**Option A: Using Git Command Line**
```bash
# 1. Check what files have changed
git status

# 2. Add all changes
git add .

# 3. Commit with a message
git commit -m "Add historical data display and fix RLS permissions"

# 4. Push to GitHub (this triggers deployment!)
git push origin main
```

**Option B: Using GitHub Desktop**
1. Open GitHub Desktop
2. Review your changes in the left panel
3. Write a commit message (e.g., "Add historical data display")
4. Click "Commit to main"
5. Click "Push origin" button

**Option C: Using VS Code**
1. Open Source Control panel (Ctrl+Shift+G)
2. Stage your changes (+ button)
3. Write commit message
4. Click "Commit"
5. Click "Sync Changes" or "Push"

### Step 3: Monitor Deployment

1. **Go to GitHub Repository:**
   - Visit: `https://github.com/YOUR_USERNAME/YOUR_REPO`
   - Click on "Actions" tab at the top

2. **Watch the Deployment:**
   - You'll see a workflow run appear: "Build and Deploy"
   - Click on it to see progress
   - Yellow circle = In progress
   - Green checkmark = Success ✅
   - Red X = Failed ❌

3. **Check the Logs:**
   - Click on the workflow run
   - Click on "build-deploy" job
   - You'll see:
     - ✅ "Set up job"
     - ✅ "Run actions/checkout@v4"
     - ✅ "Set up Node.js"
     - ✅ "Run npm ci"
     - ✅ "Run npm run build"
     - ✅ "Upload dist/ to cPanel"

### Step 4: Verify Deployment

1. **Wait 1-2 minutes** for FTP upload to complete
2. **Visit your website:** `https://iotnexus.site`
3. **Hard refresh:** Ctrl+Shift+R (to clear cache)
4. **Test the new features:**
   - ✅ Historical data displays
   - ✅ Manufacturer shows on machine cards
   - ✅ Can change manufacturer

---

## 🔧 Current Deployment Configuration

**File:** `.github/workflows/deploy.yml`

**What it does:**
- Triggers on push to `main` branch
- Builds project with `npm run build`
- Uploads `dist/` folder to cPanel via FTP
- Server: `ftp.iotnexus.site`
- Destination: `/public_html`

**Secrets Required (Already Set Up):**
- `CPANEL_USER` - Your cPanel username
- `CPANEL_PASS` - Your cPanel password

These are stored in GitHub Secrets (Settings → Secrets and variables → Actions)

---

## ⚠️ Important Notes

### Environment Variables
Your website needs these environment variables on the server:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_PUBLISHABLE_KEY`

**Where to set them:**
- **Option 1:** In cPanel → Environment Variables (if available)
- **Option 2:** Create a `.env` file in `/public_html` (if supported)
- **Option 3:** They might be hardcoded in the build (check if they're in the code)

**To check if they're set:**
- Look at the built files in `dist/` after `npm run build`
- Check if Supabase URL appears in the JavaScript files
- If not, you need to set them on the server

### Supabase Authentication URLs
After deployment, make sure Supabase knows about your production URL:

1. Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb
2. Navigate to: **Authentication** → **URL Configuration**
3. Add to **Site URL:** `https://iotnexus.site`
4. Add to **Redirect URLs:** 
   - `https://iotnexus.site`
   - `https://iotnexus.site/**`

---

## 🐛 Troubleshooting

### Deployment Fails

**Check GitHub Actions Logs:**
1. Go to GitHub → Actions tab
2. Click on the failed workflow
3. Look for error messages

**Common Issues:**

1. **Build Fails:**
   - Error: `npm ci` fails
   - **Fix:** Check `package.json` is valid, dependencies are correct

2. **FTP Upload Fails:**
   - Error: Authentication failed
   - **Fix:** Check GitHub Secrets (CPANEL_USER, CPANEL_PASS) are correct
   - Go to: Repository → Settings → Secrets and variables → Actions

3. **FTP Connection Timeout:**
   - Error: Could not connect to server
   - **Fix:** Check if FTP server is accessible, firewall isn't blocking

### Website Shows Old Version

1. **Clear browser cache:** Ctrl+Shift+R
2. **Check deployment completed:** Look at GitHub Actions
3. **Check file timestamps:** Files in cPanel should have recent timestamps
4. **CDN/Caching:** If using Cloudflare or similar, purge cache

### Environment Variables Not Working

1. **Check if they're in the build:**
   - After `npm run build`, check `dist/assets/*.js` files
   - Search for your Supabase URL
   - If not found, variables aren't being included

2. **Set them on server:**
   - cPanel → Environment Variables
   - Or create `.env` file in `/public_html`

---

## 📋 Pre-Deployment Checklist

Before pushing to GitHub:

- [ ] Code works locally (`npm run dev`)
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors
- [ ] All changes committed
- [ ] Commit message is descriptive
- [ ] Ready to go live

After deployment:

- [ ] GitHub Actions shows success ✅
- [ ] Website loads correctly
- [ ] Can login
- [ ] New features work
- [ ] No console errors
- [ ] Supabase URLs updated (if needed)

---

## 🔄 Quick Deploy Commands

```bash
# Full deployment process
git add .
git commit -m "Your descriptive message"
git push origin main

# Then check GitHub Actions tab
```

---

## 📝 Deployment History

You can see all deployments in:
- GitHub → Actions tab
- Each push to `main` creates a new deployment
- Click on any deployment to see logs and status

---

## 🎯 Summary

**To deploy your website:**
1. Make sure code is committed
2. Push to `main` branch: `git push origin main`
3. Check GitHub Actions tab
4. Wait 1-2 minutes
5. Visit `https://iotnexus.site`
6. Done! ✅

**That's it!** The GitHub Actions workflow handles everything else automatically.

---

**Last Updated:** November 18, 2025

