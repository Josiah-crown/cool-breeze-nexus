# 🛠️ Cool Breeze Nexus – Complete Setup & Recovery Guide

Use this document whenever you need to rebuild the entire stack from scratch – new laptop, fresh hosting account, new Supabase project, or onboarding a teammate. Follow the steps in order. Keep the `docs/QUICK_REFERENCE_CARD.md` updated with the latest credentials once you’re done.

---

## 0. Overview

- **Frontend repo**: https://github.com/Josiah-crown/cool-breeze-nexus
- **Hosting**: domains.co.za cPanel (public_html → `iotnexus.site`)
- **Database & auth**: Supabase (`wjyanxstvbiqefmgpccb`)
- **IoT devices**: ESP32 HVAC (`ESP32_HVAC_CoolBreezeNexus_V2.ino`) and ESP32 Cirrus (`ESP32_Cirrus_12V_V2.ino`)

We currently deploy manually to cPanel; GitHub Actions will replace that once FTP automation is working (see “Future Automation”).

---

## 1. Prepare a Windows Laptop

1. **Windows Update** – Install all OS updates and reboot.
2. **Install Google Chrome** (or browser of choice).
3. **Install required software**:
   - Node.js LTS (20.x) for npm → https://nodejs.org
   - Git for Windows → https://git-scm.com/download/win  
     During setup choose “Git from the command line”.
   - Visual Studio Code (optional but recommended) → https://code.visualstudio.com
   - Arduino IDE 2.x for ESP32 firmware → https://www.arduino.cc/en/software
   - 7-Zip or similar archive tool for backups.
4. **Install ESP32 board support to Arduino IDE** (once):
   - File → Preferences → “Additional Boards Manager URLs”: add `https://raw.githubusercontent.com/espressif/arduino-esp32/gh-pages/package_esp32_index.json`
   - Tools → Board → Boards Manager → search esp32 → install.
5. **Install project dependencies**:
   ```powershell
   git clone https://github.com/Josiah-crown/cool-breeze-nexus.git
   cd cool-breeze-nexus
   npm install
   ```

---

## 2. Supabase Setup (Fresh Project)

> Only do this if the existing project is lost. Otherwise skip to “Existing Supabase”.

1. Create a Supabase account (https://supabase.com).
2. New project:
   - Name: `Cool Breeze Nexus`
   - Password: strong, store in password manager
   - Region: closest to operations
3. Wait for provisioning.
4. In **Project Settings → API**, copy:
   - Project URL (example `https://xyz.supabase.co`)
   - Anon key
   - Service role key
5. In **SQL Editor**, run the migrations located in repo:
   - Execute every file in `supabase/migrations/*.sql` in order.
6. Deploy edge functions from `supabase/functions` (one-time):
   ```bash
   supabase functions deploy admin-create-user --project-ref <project-ref>
   supabase functions deploy esp32-data-receiver --project-ref <project-ref>
   ```
7. Create a **super_admin** user:
   - Supabase dashboard → Auth → Users → “Add user”
   - Email `superadmin@iotnexus.site` (or desired)
   - Choose a strong password, mark email confirmed
   - Note the user ID
   - Run SQL:
     ```sql
     insert into profiles (id, name, email, full_name_business)
     values ('<user-id>', 'Cool Breeze Super Admin', 'superadmin@iotnexus.site', 'Cool Breeze Super Admin')
     on conflict (id) do update set name = excluded.name, email = excluded.email;

     insert into user_roles (user_id, role, created_by)
     values ('<user-id>', 'super_admin', '<user-id>')
     on conflict (user_id) do update set role = excluded.role;
     ```

### Existing Supabase

- Project URL: `https://wjyanxstvbiqefmgpccb.supabase.co`
- Anon key: keep secure (see Quick Reference Card)
- Service role key (for edge function secrets): store offline
- Super admin credential: `superadmin@iotnexus.site` (password stored in password manager)

After wiping demo data, you may need:

```sql
update machines
set motor_temp = 0,
    outside_temp = 0,
    inside_temp = 0,
    current = 0,
    voltage = 0,
    power = 0,
    delta_t = 0,
    fan_active = false,
    is_on = false,
    is_cooling = false,
    has_water = false,
    exhaust_active = false,
    pump_active = false,
    drain_active = false,
    fan_speed = 0,
    overall_status = 'good',
    motor_status = 'normal',
    is_connected = false;
```

---

## 3. GitHub Repository

1. Create an empty repo `cool-breeze-nexus`.
2. On local machine (in project folder):
   ```bash
   git init
   git remote add origin https://github.com/<username>/cool-breeze-nexus.git
   git add .
   git commit -m "Initial commit"
   git push -u origin main
   ```
3. Add collaborators as needed.
4. Set repository secrets for future automation (already done in existing repo):
   - `CPANEL_HOST`
   - `CPANEL_USER`
   - `CPANEL_PASS`

---

## 4. Manual Deployment to cPanel (Current Method)

1. Build:
   ```bash
   npm run build
   ```
2. Zip the contents of `dist/` (or prepare folder).
3. cPanel → **File Manager** → `public_html`
4. Optional backup:
   - Select `public_html` contents → Compress → download.
5. Upload new build:
   - Upload `dist.zip`
   - Extract → move files from `dist/` to `public_html/`
   - Delete old assets after verifying.
6. Smoke test: `https://iotnexus.site`, login as super admin.

> **Note:** GitHub Action `.github/workflows/deploy.yml` is in place but FTPS uploads still need debugging. During crunch time rely on manual deploy.

---

## 5. Future Automation (GitHub Actions → cPanel)

- Workflow file: `.github/workflows/deploy.yml`
- Uses SamKirkland/FTP-Deploy Action with FTPS on port 21.
- To finish:
  1. Confirm FTP account works via FileZilla
  2. Ensure secrets match the FTP credentials
  3. Adjust `server-dir` if hosting requires `public_html/iotnexus.site`
  4. Trigger workflow with `git commit --allow-empty -m "Deploy test" && git push`
  5. Inspect Actions log and fix errors until deployment succeeds

Document progress in `docs/DEPLOYMENT_GUIDE.md`.

---

## 6. ESP32 Device Setup

### Common Steps
1. In dashboard, **create machine** → copy UUID.
2. Generate machine API key in “ESP32 Connection” panel → copy key.
3. Build firmware in Arduino IDE:
   - Board: `ESP32 Dev Module`
   - Correct COM port
4. Update WiFiManager fields during config portal:
   - WiFi SSID / password
   - Supabase URL: `https://wjyanxstvbiqefmgpccb.supabase.co`
   - Supabase anon key (hardcoded in firmware but still displayed)
   - Machine UUID
   - Machine API key

### HVAC Firmware (`hardware/esp32/ESP32_HVAC_CoolBreezeNexus_V2/ESP32_HVAC_CoolBreezeNexus_V2.ino`)
- Posts to direct REST endpoint `/rest/v1/readings_raw` with anon key.
- Ensure `machineAPIKey` is stored even though anon key is used (for future edge function switch).
- Watchdog and WiFiManager reset features implemented.

### Cirrus Firmware (`hardware/esp32/ESP32_Cirrus_12V_V2.ino`)
- Uses edge function `/functions/v1/esp32-data-receiver` with machine API key authentication.
- Non-inverted fan speed logic, 12V pickup thresholds.
- Matches database schema (verify after first data point).

### Troubleshooting
- If WiFiManager portal doesn’t appear, use `hardware/esp32/CLEAR_ESP32_MEMORY/CLEAR_ESP32_MEMORY.ino`.
- If HTTP 401/404 appears, confirm API key active and edge function deployed.
- If watchdog resets, verify `HTTP_POST_TIMEOUT` (currently 8s) and network stability.

---

## 7. Super Admin Workflow

1. Log into dashboard.
2. Create companies → installers → clients.
3. Assign machines to the correct owner.
4. Generate machine API keys and distribute securely to installers.
5. Use `docs/QUICK_REFERENCE_CARD.md` to keep credentials updated.

---

## 8. Maintenance Checklist (Weekly)

- [ ] Dashboard loads and super admin login works.
- [ ] Latest build deployed to `iotnexus.site`.
- [ ] Supabase metrics show live data from ESP32 (machines table `last_seen` < 5 min).
- [ ] ESP32 devices respond to WiFi reset procedure.
- [ ] Run `npm run build` locally to ensure no compilation errors.
- [ ] Update backups (site + database) and store off-site.

---

## 9. If Everything Breaks

1. Restore website files from latest backup (`public_html`).
2. Restore Supabase backup via dashboard.
3. Recreate super admin user if auth table lost.
4. Reflash ESP32 firmware and reconfigure WiFi credentials.
5. Update Quick Reference Card with anything changed.
6. Update this guide if you learned a new step.

---

## 10. Pending / To-Do

- [ ] Debug GitHub Action FTPS deploy so manual uploads aren’t required.
- [ ] Document automated Edge Function deploy (supabase CLI) for future updates.
- [ ] Add OTA firmware update process for field devices.
- [ ] Migrate to dedicated secrets manager (1Password/Bitwarden).

---

**Always keep this file in sync with reality.** After major infrastructure changes (new Supabase project, domain move, deploy pipeline update), edit this guide and the Quick Reference Card immediately.

