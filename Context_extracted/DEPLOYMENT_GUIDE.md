# 🚀 Deployment Guide - Machine Monitor Dashboard

## ✅ Pre-Deployment Checklist

### 1. **Environment Variables**
Make sure you have these set in your hosting platform:

```bash
VITE_SUPABASE_URL=https://lkvnhskxbxzeohopqjcr.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_publishable_key_here
```

⚠️ **IMPORTANT:** Get these from your Supabase dashboard:
- Go to: https://supabase.com/dashboard/project/lkvnhskxbxzeohopqjcr/settings/api
- Copy the "Project URL" and "anon public" key

---

## 🔨 Build for Production

### Option 1: Production Build (Recommended)
```bash
npm run build
```
This creates a `dist` folder with optimized production files.

### Option 2: Development Build (For testing)
```bash
npm run build:dev
```

---

## 📦 What Gets Deployed

After running `npm run build`, you'll have a `dist` folder containing:
- `index.html` - Main entry point
- `assets/` - All JS, CSS, and images (optimized & minified)

**Upload the entire `dist` folder contents to your web hosting.**

---

## 🌐 Deployment Options

### **Option A: Netlify (Easiest)**
1. Go to https://netlify.com
2. Drag & drop the `dist` folder
3. Add environment variables in Site settings → Environment variables
4. Done! ✅

### **Option B: Vercel**
1. Go to https://vercel.com
2. Import your project or drag `dist` folder
3. Add environment variables
4. Deploy

### **Option C: Traditional Web Hosting (cPanel, etc.)**
1. Run `npm run build` locally
2. Upload all files from `dist/` folder to `public_html` or `www` directory
3. Set environment variables (usually in hosting control panel)
4. Access via your domain

### **Option D: Supabase Hosting**
Since you're already using Supabase:
```bash
# Install Supabase CLI (if not already)
npm install -g supabase

# Link to your project
supabase link --project-ref lkvnhskxbxzeohopqjcr

# Deploy
npm run build
supabase functions deploy
```

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
- ✅ Can you login?
- ✅ Can you see machines?
- ✅ Can super admin generate API keys?
- ✅ Do company dropdowns work?
- ✅ Can you create new users/machines?

### 3. **Update ESP32 Connection**
Once deployed, update your ESP32 code with:
- Production website URL
- API key from the dashboard

---

## 🔧 Troubleshooting

### **Blank White Screen**
- Check browser console for errors
- Verify environment variables are set correctly
- Make sure Supabase URL and key are correct

### **Login Not Working**
- Check Supabase Authentication settings
- Verify Site URL and Redirect URLs include your domain
- Check browser console for CORS errors

### **API Calls Failing**
- Verify `VITE_SUPABASE_URL` is correct
- Check Supabase project is active
- Review Row Level Security (RLS) policies

### **Styles Not Loading**
- Check that all files from `dist/` were uploaded
- Verify `index.html` is in the root directory
- Clear browser cache

---

## 📊 Performance Optimization (Already Done!)

✅ Vite automatically optimizes:
- Code splitting
- Tree shaking
- Minification
- Asset optimization
- Gzip compression

---

## 🔐 Security Checklist

✅ **Already Implemented:**
- Supabase RLS policies active
- Authentication required for dashboard
- API keys properly secured
- Password hashing via Supabase
- Role-based access control

⚠️ **Don't Forget:**
- Never commit `.env` file
- Keep Supabase service role key private (not used in frontend)
- Only use the "anon public" key in frontend

---

## 🎯 Quick Deployment Commands

```bash
# 1. Build production version
npm run build

# 2. Test locally first (optional)
npm run preview

# 3. Deploy dist folder to your hosting
# (Upload via FTP, drag-drop, or hosting platform CLI)
```

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

## 📞 Need Help?

**Common Issues:**
- Environment variables not loading → Check hosting platform docs
- CORS errors → Update Supabase Authentication URLs
- Database errors → Check RLS policies in Supabase

---

## ✅ Final Checklist Before Going Live

- [ ] Production build created (`npm run build`)
- [ ] Environment variables configured on hosting
- [ ] All files from `dist/` uploaded
- [ ] Supabase URLs updated (Site URL + Redirect URLs)
- [ ] Can login with existing account
- [ ] Dashboard loads correctly
- [ ] Can generate API keys (super admin)
- [ ] Mobile responsive (test on phone)
- [ ] SSL certificate active (HTTPS)

---

**Last Updated:** November 5, 2025  
**Status:** Ready for Deployment! 🚀
