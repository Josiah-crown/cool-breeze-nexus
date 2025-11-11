# 📧 cPanel Email Setup Guide for Alert Notifications

## Overview
This guide covers how to set up the email system on cPanel to send automated alerts when machine parameters are exceeded.

---

## Prerequisites

Before we begin, you'll need:
- ✅ cPanel access (login credentials)
- ✅ Domain name (e.g., `crowntechnologies.co.za`)
- ✅ Decision on email address to send FROM (e.g., `alerts@crowntechnologies.co.za` or `noreply@crowntechnologies.co.za`)

---

## Step 1: Create Email Account in cPanel

### What We'll Create:
- **Email Address:** `alerts@crowntechnologies.co.za` (or your preferred address)
- **Purpose:** Automated system that sends all machine alerts
- **Storage:** 250MB should be sufficient

### How to Create:
1. Log into your cPanel
2. Navigate to **"Email Accounts"**
3. Click **"Create"**
4. Fill in:
   - **Email:** `alerts` (or `noreply`)
   - **Password:** Strong password (save this!)
   - **Storage:** 250 MB
   - **Quota:** Check "unlimited" if available
5. Click **"Create"**

---

## Step 2: Get SMTP Settings

After creating the email account, we need these details:

### Required Information:
```
SMTP Host: mail.crowntechnologies.co.za
SMTP Port: 465 (SSL) or 587 (TLS)
SMTP Username: alerts@crowntechnologies.co.za
SMTP Password: [password you created]
Encryption: SSL or TLS
```

### Where to Find This:
1. In cPanel, go to **"Email Accounts"**
2. Click **"Connect Devices"** next to your `alerts@` account
3. Look for **"Mail Client Manual Settings"**
4. Copy the **Outgoing Server (SMTP)** details

**IMPORTANT:** Most cPanel servers use:
- **Host:** `mail.yourdomain.com`
- **Port 465** for SSL (recommended)
- **Port 587** for TLS (alternative)

---

## Step 3: Test Email Delivery

### Option A: Using Webmail (Quick Test)
1. In cPanel, click **"Webmail"**
2. Choose any client (Roundcube, Horde, or SquirrelMail)
3. Log in with `alerts@crowntechnologies.co.za`
4. Send a test email to your personal email
5. Verify it arrives within 1-2 minutes

### Option B: Using Command Line (If SSH Access)
```bash
echo "Test email from cPanel" | mail -s "Test Subject" your-email@example.com
```

---

## Step 4: Configure SPF and DKIM (Prevent Spam Filtering)

### Why This Matters:
Without proper DNS records, your alert emails may be marked as spam.

### SPF Record (Required):
1. In cPanel, go to **"Zone Editor"** or **"Email Deliverability"**
2. Add SPF record:
   ```
   Type: TXT
   Name: @ (or your domain)
   Value: v=spf1 a mx ip4:YOUR_SERVER_IP ~all
   ```

### DKIM (Recommended):
1. In cPanel, go to **"Email Deliverability"**
2. Click **"Manage"** next to your domain
3. Install DKIM keys (usually automatic in modern cPanel)
4. Verify the green checkmarks

### Check Status:
- Go to **"Email Deliverability"** in cPanel
- All checks should be **green** ✅
- If any are **red** ❌, click "Manage" to fix

---

## Step 5: Backend Implementation (I'll Do This)

Once you provide the SMTP details, I will:

### A. Install Email Library
```bash
npm install nodemailer
```

### B. Create Supabase Edge Function
```
supabase/functions/send-alert-email/
```

### C. Implement Alert Logic
- Check machine readings against your provided thresholds
- Query `machine_notification_preferences` for recipients
- Send emails only to users with `email_subscribed = true`
- Log all sent emails to `alert_history` table

### D. Email Template System
- HTML email with machine details
- Color-coded by severity (WARNING = yellow, CRITICAL = red)
- Direct link to machine in dashboard
- Unsubscribe link at bottom

---

## Step 6: Alternative - Use Email Service (If cPanel Fails)

If cPanel's SMTP has issues (rate limits, spam filtering), we can use:

### Option A: Resend (Recommended)
- **Cost:** Free up to 3,000 emails/month
- **Setup Time:** 5 minutes
- **Reliability:** Excellent
- **Website:** https://resend.com

### Option B: SendGrid
- **Cost:** Free up to 100 emails/day
- **Setup Time:** 10 minutes
- **Reliability:** Good
- **Website:** https://sendgrid.com

### Option C: Amazon SES
- **Cost:** $0.10 per 1,000 emails
- **Setup Time:** 15 minutes
- **Reliability:** Excellent (if configured properly)

**My Recommendation:** Start with cPanel SMTP. If you experience delivery issues, we'll switch to Resend.

---

## Step 7: Testing the Complete System

After implementation, we'll test:

### Test 1: Manual Trigger
```sql
-- Temporarily set motor temp to critical
UPDATE machines 
SET motor_temp = 80 
WHERE id = 'test-machine-id';
```
- Verify email arrives within 1 minute
- Check all recipients received it
- Check email content and formatting

### Test 2: Recovery Alert
```sql
-- Set motor temp back to normal
UPDATE machines 
SET motor_temp = 40 
WHERE id = 'test-machine-id';
```
- Verify "All Clear" email (if enabled)

### Test 3: Unsubscribe
- Click unsubscribe link in email
- Verify `email_subscribed` set to `false` in database
- Trigger another alert
- Verify user does NOT receive email

---

## Rate Limits & Quotas

### Typical cPanel SMTP Limits:
- **Hourly:** 50-100 emails/hour
- **Daily:** 500-1,000 emails/day
- **Per Connection:** 50 emails

### Our Expected Usage:
- **50 machines** × **1 alert/day (average)** = 50 emails/day
- **Each alert** → **4 recipients** = 200 emails/day (worst case)

**Verdict:** cPanel SMTP should be sufficient. If you scale to 200+ machines, consider a dedicated email service.

---

## Security Considerations

### 1. Store SMTP Credentials Securely
```bash
# Add to Supabase Secrets (not in code!)
supabase secrets set SMTP_HOST="mail.crowntechnologies.co.za"
supabase secrets set SMTP_PORT="465"
supabase secrets set SMTP_USER="alerts@crowntechnologies.co.za"
supabase secrets set SMTP_PASS="your-secure-password"
```

### 2. Enable Two-Factor Authentication
- If cPanel supports it, enable 2FA on the email account

### 3. Monitor for Abuse
- Set up email forwarding to your admin email
- Regularly check sent mail logs

---

## Troubleshooting Common Issues

### Issue 1: Emails Not Sending
**Check:**
- SMTP credentials correct?
- Firewall blocking port 465/587?
- Email account not suspended?
- cPanel email quota not full?

### Issue 2: Emails Going to Spam
**Check:**
- SPF record configured?
- DKIM keys installed?
- "From" address matches domain?
- Email content not too promotional?

### Issue 3: Slow Delivery
**Check:**
- cPanel server overloaded?
- Rate limits hit?
- DNS propagation issues?

---

## What I Need From You:

Please provide these details after creating the email account:

```
SMTP_HOST: ___________________________
SMTP_PORT: [ ] 465 (SSL)  [ ] 587 (TLS)
SMTP_USER: ___________________________
SMTP_PASS: ___________________________
FROM_EMAIL: ___________________________
FROM_NAME: Cool Breeze Nexus Alerts (or your preference)
```

**Optional:**
```
REPLY_TO_EMAIL: ___________________________
ADMIN_COPY_EMAIL: _________________________ (BCC all alerts here)
```

---

## Timeline:

Once you provide:
1. ✅ Alert parameters (`ALERT_PARAMETERS_NEEDED.md`)
2. ✅ cPanel SMTP credentials (above)

I can implement the complete email system in **2-3 hours**, including:
- ✅ Backend alert checking
- ✅ Email templates
- ✅ SMTP integration
- ✅ Testing suite
- ✅ Unsubscribe functionality
- ✅ Alert history dashboard

---

**Let me know when you're ready to proceed!** 🚀

