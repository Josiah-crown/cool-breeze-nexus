# 🚨 Alert Conditions - Final Specification

## Overview
This document defines all alert conditions for the three machine types, based on user requirements provided on 2025-11-08.

---

## ⚡ Key Concepts

### **Severity Levels:**
- 🔴 **CRITICAL:** Immediate safety risk, machine damage imminent
- 🟡 **WARNING:** Performance issue, requires attention
- 🔵 **INFO:** Informational, no immediate action needed

### **Time-Based Triggering:**
All alerts require conditions to persist for a specified duration before triggering.
- Prevents false alarms from temporary sensor fluctuations
- Alert state must be tracked over time

### **Alert State Tracking:**
We need a new table to track when a condition first started:
```sql
CREATE TABLE alert_states (
  id UUID PRIMARY KEY,
  machine_id UUID,
  alert_type TEXT, -- e.g., "motor_temp_critical"
  condition_started_at TIMESTAMPTZ,
  alert_sent BOOLEAN DEFAULT false,
  resolved_at TIMESTAMPTZ
);
```

---

## 🌊 Evaporative Cooler Alerts (7 Rules)

### 1. Motor Overheating - CRITICAL 🔴
```
CONDITION: Motor Temp > 70°C
DURATION: 15+ minutes
SEVERITY: Critical
ACTION: Send email immediately
RECIPIENTS: All (Super Admin, Company, Installer, Client with notifications ON)
```

### 2. Low Water While Cooling - WARNING 🟡
```
CONDITION: Cool Mode ON + Water Tank NOT full
DURATION: 15+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Tank has 3 states: full, low, empty (need clarification on "not full")
```

### 3. Ineffective Cooling - WARNING 🟡
```
CONDITION: Cool Mode ON + Delta T < 2°C
DURATION: 30+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Delta T = (Outside Temp - Inside Temp)
```

### 4. Fan Failure - CRITICAL 🔴
```
CONDITION: Fan Mode ON + Motor Amps = 0
DURATION: 10+ minutes
SEVERITY: Critical
ACTION: Send email immediately
NOTE: Zero current means motor not drawing power (mechanical failure)
```

### 5. Motor Overcurrent - WARNING 🟡
```
CONDITION: Motor Amps > THRESHOLD
DURATION: 5+ minutes
SEVERITY: Warning
ACTION: Send email
❓ QUESTION: What is the threshold? (e.g., 15A, 20A?)
```

### 6. Dump Valve Stuck Closed - WARNING 🟡
```
CONDITION: Cool Mode ON + Dump Valve OFF
DURATION: 30+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Water not draining, potential overflow risk
```

### 7. Pump Failure - WARNING 🟡
```
CONDITION: Tank Full + Cool Mode ON + Pump OFF
DURATION: 30+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Water available but not circulating
```

---

## ❄️ Air Conditioner Alerts (4 Rules)

### 1. Compressor Overheating - CRITICAL 🔴
```
CONDITION: Motor Temp > 70°C
DURATION: 15+ minutes
SEVERITY: Critical
ACTION: Send email immediately
RECIPIENTS: All with notifications ON
```

### 2. Ineffective Cooling - WARNING 🟡
```
CONDITION: Cool Mode ON + Delta T < 2°C
DURATION: 30+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Compressor running but not cooling effectively
```

### 3. Fan Failure - CRITICAL 🔴
```
CONDITION: Fan Mode ON + Motor Amps = 0
DURATION: 10+ minutes
SEVERITY: Critical
ACTION: Send email immediately
NOTE: Could indicate compressor failure or electrical issue
```

### 4. Motor Overcurrent - WARNING 🟡
```
CONDITION: Motor Amps > THRESHOLD
DURATION: 5+ minutes
SEVERITY: Warning
ACTION: Send email
❓ QUESTION: What is the threshold? (e.g., 20A, 25A?)
```

---

## 🔥 Heat Pump Alerts (6 Rules)

### 1. Compressor Overheating - CRITICAL 🔴
```
CONDITION: Compressor Temp > 90°C
DURATION: 15+ minutes
SEVERITY: Critical
ACTION: Send email immediately
NOTE: Higher threshold than evap/AC (heat pumps run hotter)
```

### 2. Complete Heating Failure - WARNING 🟡
```
CONDITION: Pump Mode ON + Delta T = 0°C
DURATION: 15+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: No temperature change at all (complete failure)
```

### 3. Ineffective Heating - WARNING 🟡
```
CONDITION: Pump Mode ON + Delta T < 6°C
DURATION: 30+ minutes
SEVERITY: Warning
ACTION: Send email
NOTE: Heating but not reaching target differential
```

### 4. Fan Failure - CRITICAL 🔴
```
CONDITION: Fan Mode ON + Motor Amps = 0
DURATION: 10+ minutes
SEVERITY: Critical
ACTION: Send email immediately
```

### 5. Setpoint Not Reached - INFO 🔵
```
CONDITION: Power ON + Inlet Temp ≠ Setpoint
DURATION: 10+ minutes
SEVERITY: Info
ACTION: Send email (low priority)
NOTE: Informational only, may be normal during startup
❓ QUESTION: What tolerance? (e.g., ±2°C, ±5°C?)
```

### 6. Compressor Overcurrent - WARNING 🟡
```
CONDITION: Compressor Amps > THRESHOLD
DURATION: 5+ minutes
SEVERITY: Warning
ACTION: Send email
❓ QUESTION: What is the threshold? (e.g., 30A, 40A?)
```

---

## ❓ Questions for User

Please provide these missing values:

### **1. Motor Amps Thresholds:**
```
Evaporative Cooler: Motor Amps > ___ A
Air Conditioner: Motor Amps > ___ A
Heat Pump: Compressor Amps > ___ A
```

### **2. Heat Pump Setpoint Tolerance:**
```
Acceptable deviation from setpoint: ± ___ °C
Example: If setpoint = 22°C, alert only if temp < 20°C or > 24°C
```

### **3. Water Tank States (Evaporative Cooler):**
```
Alert #2 says "Tank not full" - should we alert if:
[ ] Tank is "low" (50% or less)
[ ] Tank is "empty" (0%)
[ ] Either low OR empty
```

### **4. Alert Frequency (for all alerts):**
```
If condition persists after initial alert:
[ ] Send reminder email every hour
[ ] Send reminder email every 3 hours
[ ] Send reminder email every 6 hours
[ ] Only send once until condition clears
```

### **5. Recovery Emails:**
```
When condition clears:
[ ] Send "All Clear" recovery email
[ ] Don't send recovery email
```

---

## 📧 Email System Requirements

### **When I Implement This:**

I will need:
1. ✅ **cPanel SMTP Credentials** (from `CPANEL_EMAIL_SETUP_GUIDE.md`)
   ```
   SMTP_HOST: mail.crowntechnologies.co.za
   SMTP_PORT: 465 or 587
   SMTP_USER: alerts@crowntechnologies.co.za
   SMTP_PASS: [your password]
   ```

2. ✅ **Alert Checking Frequency**
   - Run check every 5 minutes? (matches ESP32 reading interval)
   - Or more frequent?

3. ✅ **Email Template Preferences**
   - Color-coded by severity?
   - Include machine photo?
   - Include link to dashboard?
   - Include historical chart?

---

## 🛠️ Implementation Plan

### **Phase 1: Database Schema** (30 min)
```sql
-- Alert state tracking
CREATE TABLE alert_states (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL, -- e.g., "evap_motor_temp_critical"
  severity TEXT NOT NULL, -- 'critical', 'warning', 'info'
  condition_started_at TIMESTAMPTZ NOT NULL,
  alert_sent BOOLEAN DEFAULT false,
  alert_sent_at TIMESTAMPTZ,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Alert history (for dashboard)
CREATE TABLE alert_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  machine_id UUID REFERENCES machines(id) ON DELETE CASCADE,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  message TEXT NOT NULL,
  recipients JSONB, -- Array of user IDs who were notified
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

### **Phase 2: Alert Checking Function** (1 hour)
Supabase Edge Function: `check-alerts`
- Runs every 5 minutes (cron job)
- Fetches all machines
- Evaluates each alert condition
- Tracks state in `alert_states` table
- Triggers email if duration threshold met

### **Phase 3: Email Sending Function** (45 min)
Supabase Edge Function: `send-alert-email`
- HTML email template
- SMTP integration (nodemailer)
- Respects `email_subscribed` and `notification_preferences`
- Logs to `alert_history`

### **Phase 4: Dashboard Alerts Panel** (45 min)
New component: `AlertsPanel.tsx`
- Shows active alerts for each machine
- Shows alert history
- Color-coded by severity
- Filterable by time range

### **Phase 5: Testing** (30 min)
- Manual trigger tests
- Duration persistence tests
- Email delivery tests
- Unsubscribe tests

**TOTAL TIME:** ~3.5 hours after receiving missing values

---

## 🧪 Testing Strategy

### **Test 1: Critical Alert**
```sql
-- Simulate motor overheating
UPDATE machines 
SET motor_temp = 75 
WHERE id = 'test-machine-id';

-- Wait 15 minutes (or simulate timestamp)
-- Verify email sent to all recipients
```

### **Test 2: False Alarm Prevention**
```sql
-- Simulate brief overheat
UPDATE machines SET motor_temp = 75 WHERE id = 'test-machine-id';
-- Wait 5 minutes
UPDATE machines SET motor_temp = 40 WHERE id = 'test-machine-id';
-- Verify NO email sent (didn't persist for 15 min)
```

### **Test 3: Recovery**
```sql
-- Trigger alert
UPDATE machines SET motor_temp = 75 WHERE id = 'test-machine-id';
-- Wait 15 min → email sent
-- Resolve condition
UPDATE machines SET motor_temp = 40 WHERE id = 'test-machine-id';
-- Verify "All Clear" email (if enabled)
```

---

## 📊 Email Template Preview

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
🔴 CRITICAL ALERT: Motor Overheating
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Machine: HQ Test Machine 1
Location: Head Office - Test Lab 1
Type: Evaporative Cooler
Time: 2025-11-08 14:32:15

CONDITION:
Motor Temperature: 75.3°C (Threshold: 70°C)
Duration: 18 minutes

RECOMMENDED ACTION:
⚠ Shut down machine immediately
⚠ Allow motor to cool for 30 minutes
⚠ Inspect for blocked vents or fan obstruction
⚠ Contact installer if problem persists

[View Machine Dashboard] [Unsubscribe]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cool Breeze Nexus - Automated Alert
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

---

**Ready to implement as soon as you provide:**
1. ✅ Motor Amps thresholds
2. ✅ Heat Pump setpoint tolerance
3. ✅ Alert frequency preference
4. ✅ Recovery email preference
5. ✅ cPanel SMTP credentials

**Let me know!** 🚀

