# Quick Manual Upload Guide

## Fast 5-Step Process

### Step 1: Build Locally
```bash
npm run build
```
This creates a `dist/` folder with all your website files.

### Step 2: Login to cPanel
- Go to your cPanel dashboard
- Click **File Manager**

### Step 3: Navigate to public_html
- In File Manager, go to `/public_html` directory
- This is where your website files go

### Step 4: Upload Files
- **Option A: Drag & Drop**
  - Open `dist/` folder on your computer
  - Select ALL files and folders inside `dist/`
  - Drag them into cPanel File Manager `/public_html`
  
- **Option B: Upload Button**
  - Click "Upload" button in File Manager
  - Select all files from `dist/` folder
  - Upload to `/public_html`

**Important:** Upload the CONTENTS of `dist/`, not the `dist` folder itself!

### Step 5: Test
- Visit `https://iotnexus.site`
- Hard refresh: Ctrl+Shift+R
- Test your new features

---

## What Files to Upload

From `dist/` folder, upload:
- ✅ `index.html` (must be in root of `/public_html`)
- ✅ `assets/` folder (contains all JS, CSS, images)
- ✅ Any other files/folders in `dist/`

---

## Quick Checklist

- [ ] Built project: `npm run build`
- [ ] Logged into cPanel
- [ ] Opened File Manager
- [ ] Navigated to `/public_html`
- [ ] Uploaded all files from `dist/`
- [ ] Verified `index.html` is in root
- [ ] Tested website

---

**Time:** ~2-3 minutes total







