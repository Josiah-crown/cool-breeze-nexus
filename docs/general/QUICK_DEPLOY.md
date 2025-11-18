# 🚀 Quick Deploy Guide

## One-Command Deployment

```bash
git add . && git commit -m "Your message" && git push origin main
```

That's it! GitHub Actions will automatically:
1. ✅ Build your project
2. ✅ Upload to cPanel
3. ✅ Deploy to https://iotnexus.site

---

## Step-by-Step

### 1. Commit Your Changes
```bash
git add .
git commit -m "Add historical data display and fix RLS"
```

### 2. Push to GitHub
```bash
git push origin main
```

### 3. Check Deployment
- Go to: https://github.com/YOUR_REPO → **Actions** tab
- Watch the workflow run
- Green checkmark = Success! ✅

### 4. Test Website
- Visit: https://iotnexus.site
- Hard refresh: Ctrl+Shift+R
- Test new features

---

## ⚠️ Before Pushing

- [ ] Code works locally (`npm run dev`)
- [ ] No console errors
- [ ] Ready to go live

---

## 📖 Full Guide

See `docs/general/GITHUB_DEPLOYMENT_GUIDE.md` for detailed information.

