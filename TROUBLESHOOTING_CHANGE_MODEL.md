# Troubleshooting: "Change Model" Option Not Showing

## Quick Checks

### 1. **Verify the Dropdown Menu Appears**
- Look for the **three-dot menu (⋮)** in the **top-right corner** of machine cards
- If you don't see the three-dot menu at all, the issue is with `showManagement`

### 2. **Check Browser Console**
- Press **F12** to open Developer Tools
- Go to **Console** tab
- Look for any **red errors**
- Common errors:
  - `Cannot find module 'ChangeManufacturerDialog'`
  - `onChangeManufacturer is not a function`
  - `Settings is not defined`

### 3. **Verify File Exists**
The file should exist at: `src/components/ChangeManufacturerDialog.tsx`

### 4. **Check if Other Menu Items Show**
- Do you see "Rename" in the dropdown?
- Do you see "Change Owner" in the dropdown?
- Do you see "Delete" in the dropdown?

If you see other items but NOT "Change Model", the issue is specific to that menu item.

---

## Step-by-Step Debugging

### Step 1: Check if Dropdown Menu Shows
1. Open browser DevTools (F12)
2. Go to **Elements** tab
3. Find a machine card in the HTML
4. Look for `<button>` with class containing "MoreVertical" or "dropdown"
5. If you can't find it, `showManagement` might be false

### Step 2: Check Console for Errors
1. Open **Console** tab
2. Look for any errors related to:
   - `ChangeManufacturerDialog`
   - `onChangeManufacturer`
   - `Settings` icon

### Step 3: Verify Props Are Passed
1. In DevTools Console, type:
   ```javascript
   // This won't work directly, but check the React DevTools
   ```
2. Install React DevTools extension if you haven't
3. Inspect a `MachineCard` component
4. Check if `onChangeManufacturer` prop exists

### Step 4: Force Refresh
1. Stop the dev server (Ctrl+C)
2. Delete `node_modules/.vite` folder (if it exists)
3. Restart: `npm run dev`
4. Hard refresh browser: **Ctrl+Shift+R** (Windows) or **Cmd+Shift+R** (Mac)

---

## Common Issues

### Issue 1: Dropdown Menu Not Showing At All
**Symptom:** No three-dot menu on machine cards

**Solution:**
- Check `showManagement` prop is `true` in Dashboard.tsx
- Currently set on line 692: `showManagement={true}`

### Issue 2: "Change Model" Not in Dropdown
**Symptom:** Dropdown shows but "Change Model" is missing

**Possible Causes:**
1. `onChangeManufacturer` prop not passed
2. `onChangeManufacturer` is `undefined` or `null`
3. Conditional rendering issue

**Check:**
- In Dashboard.tsx, verify `onChangeManufacturer={handleChangeManufacturer}` is present
- Verify `handleChangeManufacturer` function exists (line 67)

### Issue 3: Import Error
**Symptom:** Console shows module not found error

**Solution:**
- Verify `ChangeManufacturerDialog.tsx` exists in `src/components/`
- Verify import in Dashboard.tsx: `import { ChangeManufacturerDialog } from '@/components/ChangeManufacturerDialog';`

### Issue 4: Settings Icon Missing
**Symptom:** "Change Model" shows but no icon, or icon error

**Solution:**
- Verify import in MachineCard.tsx: `import { ..., Settings } from 'lucide-react';`

---

## Manual Verification

### Check These Files:

1. **src/components/MachineCard.tsx**
   - Line 24: `onChangeManufacturer?: (machineId: string) => void;`
   - Line 36: `onChangeManufacturer,` in destructuring
   - Line 105-113: The menu item code exists

2. **src/pages/Dashboard.tsx**
   - Line 11: Import statement exists
   - Line 33: `changeManufacturerMachineId` state exists
   - Line 67: `handleChangeManufacturer` function exists
   - Line 691: `onChangeManufacturer={handleChangeManufacturer}` prop passed
   - Line 692: `showManagement={true}` is set
   - Line 753-764: Dialog component is rendered

3. **src/components/ChangeManufacturerDialog.tsx**
   - File exists and exports `ChangeManufacturerDialog`

---

## Quick Test

Add a console.log to verify the function is called:

In `src/components/MachineCard.tsx`, line 108:
```typescript
onChangeManufacturer(machine.id);
console.log('Change Model clicked for:', machine.id); // Add this
```

If you see the log in console but dialog doesn't open, the issue is in the dialog component.

---

## Still Not Working?

1. **Check React DevTools:**
   - Install React DevTools browser extension
   - Inspect `MachineCard` component
   - Check props: `onChangeManufacturer` should be a function

2. **Check Network Tab:**
   - Open DevTools → Network tab
   - Refresh page
   - Look for failed requests (red)
   - Check if `ChangeManufacturerDialog.tsx` is being loaded

3. **Check Build Output:**
   - Look at terminal where `npm run dev` is running
   - Check for any compilation errors or warnings

---

## Last Resort: Rebuild

If nothing works:

```bash
# Stop dev server
# Delete cache
rm -rf node_modules/.vite
rm -rf .vite

# Restart
npm run dev
```

Or on Windows PowerShell:
```powershell
Remove-Item -Recurse -Force node_modules\.vite -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force .vite -ErrorAction SilentlyContinue
npm run dev
```

