# 🚀 Deployment Guide - GitHub Actions (cPanel)

## 📤 Daily Deployment (Quick Reference)

### **How to Deploy Your Changes**

**Simple 3-Step Process:**

1. **Make your changes** locally
2. **Commit and push to main branch:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. **Wait 3-5 minutes** - GitHub Actions automatically:
   - Builds your project
   - Deploys to cPanel
   - Your site is live!

### **Check Deployment Status**

1. Go to your GitHub repository
2. Click on **"Actions"** tab
3. You'll see the deployment workflow running
4. **Green checkmark ✅** = Success
5. **Red X ❌** = Failed (check logs)

### **Quick Commands**

**To deploy:**
```bash
git add .
git commit -m "Update description"
git push origin main
```

**To check deployment:**
- GitHub → Actions tab → Latest workflow run

**To view site:**
- Visit your domain (configured in cPanel)

---

## 🔧 Initial Setup (One-Time Configuration)

### 1. **Configure GitHub Secrets** ⚠️ **REQUIRED - DO THIS FIRST!**

Go to your GitHub repository → **Settings** → **Secrets and variables** → **Actions**

**You need to add FIVE secrets total:**

#### **Required Secrets for Environment Variables:**
| Secret Name | Description | Where to Get It |
|------------|-------------|-----------------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Supabase Dashboard → Settings → API → Project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Your Supabase anon public key | Supabase Dashboard → Settings → API → `anon` `public` key |

**Example values:**
- `VITE_SUPABASE_URL`: `https://lkvnhskxbxzeohopqjcr.supabase.co`
- `VITE_SUPABASE_PUBLISHABLE_KEY`: `sb_publishable_WFlhZieCuuEHBwjaw3EZ9A__LDjjEoq`

#### **Required Secrets for FTP Deployment:**
| Secret Name | Description | Example |
|------------|-------------|---------|
| `CPANEL_HOST` | Your cPanel FTP hostname | `ftp.yourdomain.com` or `yourdomain.com` |
| `CPANEL_USER` | Your cPanel FTP username | `username@yourdomain.com` |
| `CPANEL_PASS` | Your cPanel FTP password | `your_ftp_password` |

**How to find FTP credentials:**
- Log into your cPanel
- Go to "FTP Accounts" or "File Manager"
- Your FTP hostname is usually your domain name
- Username format: `cpanel_username@yourdomain.com` or just `cpanel_username`
- Password: The FTP password you set

**⚠️ Without the VITE_ secrets, your site won't be able to connect to Supabase!**

### 2. **Verify Workflow File**

The deployment workflow is already configured at `.github/workflows/deploy.yml`

It will:
- ✅ Trigger on every push to `main` branch
- ✅ Build the project with `npm ci` and `npm run build`
- ✅ Upload `dist/` folder to cPanel `/public_html/` directory

### 3. **Environment Variables Setup**

**IMPORTANT:** You do NOT need to install anything in cPanel! Vite embeds environment variables at BUILD time, so they must be configured in GitHub Secrets.

**How It Works:**

The workflow automatically embeds environment variables during the build:

```yaml
- run: npm run build
  env:
    VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
    VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
```

**This means:**
- ✅ Variables are embedded into the built JavaScript files
- ✅ No cPanel configuration needed
- ✅ No special apps required
- ✅ Works with any static hosting

**Just add the secrets to GitHub and you're done!**

---

## 📦 What Gets Deployed

After GitHub Actions runs, the `dist/` folder contents are uploaded to:
- **Destination:** `/public_html/` on your cPanel server
- **Contents:**
  - `index.html` - Main entry point
  - `assets/` - All JS, CSS, and images (optimized & minified)

---

## ⚙️ Post-Deployment Setup

### 1. **Configure Supabase Authentication**

Go to Supabase Dashboard → Authentication → URL Configuration:
- Add your deployed URL to "Site URL"
- Add your deployed URL to "Redirect URLs"

Example:
```
Site URL: https://yourdomain.com
Redirect URLs: https://yourdomain.com, https://yourdomain.com/**
```

### 2. **Test the Deployment**

After deployment, verify:
- ✅ Can you access the site?
- ✅ Can you login?
- ✅ Can you see machines?
- ✅ Can super admin generate API keys?
- ✅ Do company dropdowns work?
- ✅ Can you create new users/machines?

---

## 🔄 How It Works

### **When Does It Deploy?**
- ✅ Every push to `main` branch
- ✅ Automatic (no manual trigger needed)

### **Deployment Process:**
1. GitHub detects push to `main`
2. Starts Ubuntu runner
3. Checks out your code
4. Sets up Node.js 20
5. Installs dependencies (`npm ci`)
6. Builds project (`npm run build`) with environment variables
7. Uploads `dist/` to cPanel via FTP
8. ✅ Site is live!

### **Typical Deployment Time:**
- Build: ~2-3 minutes
- Upload: ~30 seconds
- **Total: ~3-5 minutes**

---

## 📱 ESP32 Integration (After Deployment)

1. **Generate API Key** in deployed dashboard (Super Admin only)
2. **Copy the key** (shown once!)
3. **Update ESP32 code:**

```cpp
const char* apiKey = "esp32_your_generated_key_here";
const char* serverUrl = "https://yourdomain.com/api/machines/update";

// In your ESP32 HTTP request:
http.addHeader("X-API-Key", apiKey);
http.addHeader("Content-Type", "application/json");
```

4. **Test connection** - You should see data appear in the dashboard!

---

## 📊 Performance Optimization (Already Done!)

✅ Vite automatically optimizes:
- Code splitting
- Tree shaking
- Minification
- Asset optimization
- Gzip compression

✅ GitHub Actions provides:
- Fast, automated builds
- Consistent deployment process
- Build logs for debugging

---

## 🔐 Security Checklist

✅ **Already Implemented:**
- Supabase RLS policies active
- Authentication required for dashboard
- API keys properly secured
- Password hashing via Supabase
- Role-based access control
- GitHub secrets for sensitive credentials

⚠️ **Don't Forget:**
- Never commit `.env` file to GitHub
- Keep Supabase service role key private (not used in frontend)
- Only use the "anon public" key in frontend
- Never expose `CPANEL_PASS` in logs or commits
- Use GitHub Secrets for all sensitive data

---

## ✅ Final Checklist Before First Deployment

- [ ] GitHub repository created and code pushed
- [ ] **GitHub Secrets configured:**
  - [ ] `VITE_SUPABASE_URL` ⚠️ **REQUIRED**
  - [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` ⚠️ **REQUIRED**
  - [ ] `CPANEL_HOST`
  - [ ] `CPANEL_USER`
  - [ ] `CPANEL_PASS`
- [ ] Workflow file exists at `.github/workflows/deploy.yml`
- [ ] Supabase URLs updated (Site URL + Redirect URLs)
- [ ] Test push to `main` branch triggers workflow
- [ ] Deployment succeeds (green checkmark in Actions)
- [ ] Can access site at your domain
- [ ] **Can login with existing account** ⚠️ **Test this!**
- [ ] Dashboard loads correctly
- [ ] Can generate API keys (super admin)
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate active (HTTPS)

---

## 🔧 Troubleshooting

### 🚨 **QUICK FIX: Login Not Working After Deployment**

**If your username/login stopped working after GitHub deployment:**

1. **Go to GitHub** → Your repository → **Settings** → **Secrets and variables** → **Actions**
2. **Add these two secrets** (if not already added):
   - `VITE_SUPABASE_URL` = `https://lkvnhskxbxzeohopqjcr.supabase.co`
   - `VITE_SUPABASE_PUBLISHABLE_KEY` = `sb_publishable_WFlhZieCuuEHBwjaw3EZ9A__LDjjEoq`
3. **Push a new commit** to trigger rebuild:
   ```bash
   git commit --allow-empty -m "Trigger rebuild with env vars"
   git push origin main
   ```
4. **Wait 3-5 minutes** for deployment to complete
5. **Test login again**

**Why this happens:** Vite embeds environment variables at BUILD time. Without them in GitHub Secrets, the build can't connect to Supabase.

**You do NOT need any cPanel apps!** The environment variables are embedded during the GitHub Actions build process.

---

### **Deployment Fails in GitHub Actions**

**Check the workflow logs:**
1. Go to GitHub → Actions tab
2. Click on the failed workflow run
3. Expand the error step to see details

**Common Issues:**

#### **FTP Connection Failed**
- ❌ **Problem:** `CPANEL_HOST`, `CPANEL_USER`, or `CPANEL_PASS` incorrect
- ✅ **Solution:** Double-check GitHub secrets match your cPanel FTP credentials

#### **Build Failed**
- ❌ **Problem:** `npm ci` or `npm run build` fails
- ✅ **Solution:** 
  - Check if `package.json` is valid
  - Ensure all dependencies are listed
  - Check workflow logs for specific error

#### **Upload Failed**
- ❌ **Problem:** Permission denied or directory doesn't exist
- ✅ **Solution:** 
  - Verify `/public_html/` exists on your cPanel
  - Check FTP user has write permissions
  - Try changing `server-dir` in workflow to `/public_html` or `/www`

### **Site Shows Blank White Screen or Login Not Working**
- ❌ **Problem:** Environment variables not set in GitHub Secrets
- ✅ **Solution:** 
  1. Go to GitHub → Settings → Secrets and variables → Actions
  2. Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`
  3. Push a new commit to trigger rebuild
- Check browser console (F12) for errors like "VITE_SUPABASE_URL is not defined"
- Clear browser cache (Ctrl+Shift+R)

### **Login Not Working**
- Check Supabase Authentication settings
- Verify Site URL and Redirect URLs include your domain
- Check browser console for CORS errors

### **API Calls Failing**
- Verify `VITE_SUPABASE_URL` is correct
- Check Supabase project is active
- Review Row Level Security (RLS) policies

---

## 📞 Need Help?

**Common Issues:**
- FTP connection errors → Check GitHub secrets
- Build failures → Check workflow logs
- Environment variables not loading → Add to GitHub Secrets
- CORS errors → Update Supabase Authentication URLs
- Database errors → Check RLS policies in Supabase

**GitHub Actions Logs:**
- Always check the Actions tab for detailed error messages
- Each step shows what it's doing
- Failed steps will show the exact error

---

**Last Updated:** January 2025  
**Status:** Ready for GitHub Deployment! 🚀  
**Deployment Method:** GitHub Actions → cPanel FTP
