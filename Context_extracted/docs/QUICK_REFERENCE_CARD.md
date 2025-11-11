# 🚀 IoT Nexus - Quick Reference Card

**Print this page and keep it safe!**

---

## 🌐 **LIVE SITE**
- **URL:** https://iotnexus.site
- **Status Check:** Visit URL + try login

---

## 🔑 **ESSENTIAL LOGINS**

### **Website (Super Admin)**
- Email: `_________________________`
- Password: `_________________________`

### **cPanel Hosting**
- URL: https://cp60.domains.co.za:2083
- Username: `_________________________`
- Password: `_________________________`

### **Supabase Database**
- URL: https://supabase.com/dashboard
- Email: `_________________________`
- Password: `_________________________`
- Project ID: `lkvnhskxbxzeohopqjcr`

---

## 🔧 **MAKING CHANGES**

### **3-Step Update Process:**

```bash
# 1. Build
cd C:\Users\HP\Desktop\Webiste\Wesbite\cool-breeze-nexus-main
npm run build

# 2. Upload
# - Login to cPanel File Manager
# - Upload dist/ contents to public_html/

# 3. Test
# - Visit https://iotnexus.site
# - Verify everything works
```

---

## 💾 **QUICK BACKUP**

### **Website Files:**
1. cPanel → File Manager
2. Right-click `public_html` → Compress
3. Download ZIP
4. Save to: `C:\Backups\IOTNexus\`

### **Database:**
1. Supabase Dashboard
2. Database → Backups → Create Backup

---

## 🆘 **EMERGENCY RECOVERY**

### **Site Down:**
1. Login to cPanel
2. Restore latest backup
3. Extract to `public_html`

### **Lost Password:**
- Check password manager
- OR check `C:\Backups\IOTNexus\credentials.txt`

---

## 📞 **SUPPORT**
- **Hosting:** domains.co.za support
- **Database:** https://supabase.com/support
- **This Document:** `docs/SYSTEM_ACCESS_AND_BACKUP.md`

---

## ✅ **MONTHLY CHECKLIST**
- [ ] Test site is live
- [ ] Backup website files
- [ ] Backup database
- [ ] Test login works
- [ ] Change passwords (every 90 days)

---

**Keep Updated:** Fill in credentials above  
**Keep Safe:** Store in password manager + printed copy  
**Last Updated:** 2025-11-05

---

**Full Documentation:** See `docs/SYSTEM_ACCESS_AND_BACKUP.md`

