# Fix FTP Authentication Error

## Error: `530 Login authentication failed`

This means your FTP credentials in GitHub Secrets are incorrect or the server doesn't support FTPS.

---

## Step 1: Verify GitHub Secrets

1. **Go to your GitHub repository**
2. **Click "Settings"** (top menu)
3. **Click "Secrets and variables"** → **"Actions"**
4. **Check these secrets exist:**
   - `CPANEL_USER` - Your cPanel username
   - `CPANEL_PASS` - Your cPanel password

5. **Verify they're correct:**
   - Try logging into cPanel with these credentials
   - If they don't work, update the secrets

---

## Step 2: Test FTP Connection Manually

### Option A: Use FileZilla (Free FTP Client)

1. **Download FileZilla:** https://filezilla-project.org/
2. **Connect with:**
   - Host: `ftp.iotnexus.site`
   - Username: (your CPANEL_USER value)
   - Password: (your CPANEL_PASS value)
   - Port: 21
   - Protocol: **Try both:**
     - FTP over TLS (FTPS)
     - SFTP (port 22)

3. **If connection works:**
   - Credentials are correct
   - Note which protocol worked (FTPS or SFTP)
   - Update workflow file accordingly

4. **If connection fails:**
   - Credentials are wrong
   - Update GitHub Secrets

---

## Step 3: Try SFTP Instead

If your server only supports SFTP (not FTPS), we need to change the workflow.

**Current (FTPS):**
```yaml
protocol: ftps
port: 21
```

**Alternative (SFTP):**
We'd need to use a different action like `appleboy/scp-action` or `SamKirkland/FTP-Deploy-Action` with SFTP settings.

---

## Step 4: Common Issues

### Issue 1: Wrong Username Format
- Some servers need: `username@domain.com`
- Some need: `cpanel_username`
- Some need: `username` only

### Issue 2: Wrong Password
- Make sure there are no extra spaces
- Check if password has special characters that need escaping
- Try resetting password in cPanel

### Issue 3: Server Only Supports SFTP
- Error message says: "Users sometimes get this error when the server only supports SFTP"
- If FTPS doesn't work, try SFTP (port 22)

---

## Quick Fix: Update GitHub Secrets

1. **Get correct credentials:**
   - Log into cPanel
   - Note your username and password

2. **Update GitHub Secrets:**
   - Repository → Settings → Secrets and variables → Actions
   - Click on `CPANEL_USER` → Update
   - Click on `CPANEL_PASS` → Update

3. **Re-run the workflow:**
   - Go to Actions tab
   - Click on failed workflow
   - Click "Re-run jobs"

---

## Alternative: Use SFTP

If your server only supports SFTP, we need to change the workflow to use SFTP instead of FTPS. Let me know if you want me to create an SFTP version of the workflow.

---

## Next Steps

1. **Test FTP connection manually** with FileZilla
2. **Verify which protocol works** (FTPS or SFTP)
3. **Update GitHub Secrets** if credentials are wrong
4. **Update workflow** if protocol needs to change

Let me know what you find!








