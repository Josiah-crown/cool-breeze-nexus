# 🚀 Deployment Guide - GitHub Actions (cPanel)

## ✅ Pre-Deployment Checklist

### 1. **Environment Variables**
Your environment variables need to be configured in your cPanel hosting:

```bash
VITE_SUPABASE_URL=https://lkvnhskxbxzeohopqjcr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_WFlhZieCuuEHBwjaw3EZ9A__LDjjEoq
```

⚠️ **IMPORTANT:** Get these from your Supabase dashboard:
- Go to: https://supabase.com/dashboard/project/wjyanxstvbiqefmgpccb
- Copy the "Project URL" and "anon public" key

**Note:** Since Vite builds at build time, these variables should be:
- Set in your cPanel hosting environment (if supported)
- OR embedded during the GitHub Actions build process (see Advanced Setup below)

---

## 🔧 Initial GitHub Setup

### 1. **Configure GitHub Secrets**
Go to your GitHub repository → Settings → Secrets and variables → Actions

Add these three secrets:

| Secret Name | Description | Example |
|------------|-------------|---------|
| `CPANEL_HOST` | Your cPanel FTP hostname | `ftp.yourdomain.com` or `yourdomain.com` |
| `CPANEL_USER` | Your cPanel FTP username | `username@yourdomain.com` |
| `CPANEL_PASS` | Your cPanel FTP password | `your_ftp_password` |

**How to find these:**
- Log into your cPanel
- Go to "FTP Accounts" or "File Manager"
- Your FTP hostname is usually your domain name
- Username format: `cpanel_username@yourdomain.com` or just `cpanel_username`
- Password: The FTP password you set

### 2. **Verify Workflow File**
The deployment workflow is already configured at `.github/workflows/deploy.yml`

It will:
- ✅ Trigger on every push to `main` branch
- ✅ Build the project with `npm ci` and `npm run build`
- ✅ Upload `dist/` folder to cPanel `/public_html/` directory

---

## 🚀 How to Deploy

### **Automatic Deployment (Recommended)**

1. **Make your changes** locally
2. **Commit and push to main branch:**
   ```bash
   git add .
   git commit -m "Your commit message"
   git push origin main
   ```
3. **GitHub Actions will automatically:**
   - Build your project
   - Deploy to cPanel
   - Your site will be live in 2-5 minutes!

### **Check Deployment Status**

1. Go to your GitHub repository
2. Click on "Actions" tab
3. You'll see the deployment workflow running
4. Green checkmark ✅ = Success
5. Red X ❌ = Failed (check logs)

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

### 2. **Set Environment Variables in cPanel**
If your hosting supports environment variables:
1. Log into cPanel
2. Go to "Environment Variables" or "Application Settings"
3. Add:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

**Note:** If cPanel doesn't support environment variables, you may need to:
- Use a `.env` file in the `public_html` directory (less secure)
- OR configure them during the GitHub Actions build (see Advanced Setup)

### 3. **Test the Deployment**
After deployment, verify:
- ✅ Can you access the site?
- ✅ Can you login?
- ✅ Can you see machines?
- ✅ Can super admin generate API keys?
- ✅ Do company dropdowns work?
- ✅ Can you create new users/machines?

---

## 🔧 Troubleshooting

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

### **Site Shows Blank White Screen**
- Check browser console for errors
- Verify environment variables are accessible
- Make sure Supabase URL and key are correct
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

## 🎯 Advanced Setup (Optional)

### **Embed Environment Variables During Build**

If your cPanel doesn't support environment variables, you can inject them during the GitHub Actions build:

1. **Add secrets to GitHub:**
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_PUBLISHABLE_KEY`

2. **Modify `.github/workflows/deploy.yml`:**
   ```yaml
   - run: npm ci
   - run: npm run build
     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_PUBLISHABLE_KEY: ${{ secrets.VITE_SUPABASE_PUBLISHABLE_KEY }}
   ```

This embeds the variables directly into the built files.

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

## 🔄 Workflow Details

### **When Does It Deploy?**
- ✅ Every push to `main` branch
- ✅ Automatic (no manual trigger needed)

### **Deployment Process:**
1. GitHub detects push to `main`
2. Starts Ubuntu runner
3. Checks out your code
4. Sets up Node.js 20
5. Installs dependencies (`npm ci`)
6. Builds project (`npm run build`)
7. Uploads `dist/` to cPanel via FTP
8. ✅ Site is live!

### **Typical Deployment Time:**
- Build: ~2-3 minutes
- Upload: ~30 seconds
- **Total: ~3-5 minutes**

---

## 📞 Need Help?

**Common Issues:**
- FTP connection errors → Check GitHub secrets
- Build failures → Check workflow logs
- Environment variables not loading → See Advanced Setup
- CORS errors → Update Supabase Authentication URLs
- Database errors → Check RLS policies in Supabase

**GitHub Actions Logs:**
- Always check the Actions tab for detailed error messages
- Each step shows what it's doing
- Failed steps will show the exact error

---

## ✅ Final Checklist Before First Deployment

- [ ] GitHub repository created and code pushed
- [ ] GitHub Secrets configured (`CPANEL_HOST`, `CPANEL_USER`, `CPANEL_PASS`)
- [ ] Workflow file exists at `.github/workflows/deploy.yml`
- [ ] Environment variables configured (cPanel or GitHub Secrets)
- [ ] Supabase URLs updated (Site URL + Redirect URLs)
- [ ] Test push to `main` branch triggers workflow
- [ ] Deployment succeeds (green checkmark in Actions)
- [ ] Can access site at your domain
- [ ] Can login with existing account
- [ ] Dashboard loads correctly
- [ ] Can generate API keys (super admin)
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate active (HTTPS)

---

## 🎉 Quick Reference

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

**To update environment variables:**
- Update in cPanel OR GitHub Secrets (if using Advanced Setup)
- Redeploy (push to main)

---

**Last Updated:** January 2025  
**Status:** Ready for GitHub Deployment! 🚀  
**Deployment Method:** GitHub Actions → cPanel FTP

