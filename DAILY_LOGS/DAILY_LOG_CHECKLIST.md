# Daily Log Creation Checklist

## ⚠️ **CRITICAL: Date Verification**

**ALWAYS verify the current date before creating a daily log!**

### Date Verification Steps:
1. ✅ **Check the user's system date** - Don't assume based on existing log files
2. ✅ **Use the actual current date** - Not the date of the most recent log file
3. ✅ **Format:** `YYYY-MM-DD` (e.g., `2025-11-20`)
4. ✅ **File naming:** `YYYY-MM-DD_DESCRIPTION.md` (e.g., `2025-11-20_GITHUB_DEPLOYMENT.md`)

### Common Mistakes to Avoid:
- ❌ **DON'T** use the date from the most recent log file
- ❌ **DON'T** assume "today" based on file timestamps
- ❌ **DON'T** use yesterday's date
- ✅ **DO** verify the actual current date
- ✅ **DO** use consistent date format throughout the file

---

## 📋 Required Sections

### 1. **Header**
- Date in format: `# Daily Log - Month Day, Year - Description`
- Example: `# Daily Log - November 20, 2025 - GitHub Deployment Fix`

### 2. **Session Summary**
- Time Period
- Overview

### 3. **Major Accomplishments**
- Status indicators (✅ COMPLETED, ⏳ IN PROGRESS, etc.)
- Detailed descriptions
- Files modified
- Results/outcomes

### 4. **Technical Details** (if applicable)
- How things work
- Implementation details
- Configuration changes

### 5. **Files Modified**
- List all files changed
- Group by category if many files

### 6. **Issues Resolved**
- Numbered list of problems fixed
- Brief description of solutions

### 7. **Key Learnings** (if applicable)
- Important concepts learned
- Best practices discovered

### 8. **Next Steps**
- Completed items
- Remaining tasks

### 9. **Statistics**
- Files modified count
- Issues resolved count
- Time to completion

### 10. **Key Takeaways**
- Main points to remember

### 11. **Related Files**
- Files modified today
- Related documentation

### 12. **Footer**
- **Last Updated:** [Current Date] (must match file date!)
- **Session Duration:** [Time]
- **Status:** [Summary]

---

## ✅ Pre-Creation Checklist

Before creating a daily log:

- [ ] **Verify current date** (don't use date from existing logs)
- [ ] **Check for existing log** for today (don't duplicate)
- [ ] **Use consistent naming:** `YYYY-MM-DD_DESCRIPTION.md`
- [ ] **Match date in header and footer**
- [ ] **Include all required sections**
- [ ] **Use proper status indicators** (✅, ⏳, ❌)
- [ ] **List all files modified**
- [ ] **Document issues resolved**
- [ ] **Include next steps/remaining tasks**

---

## 📝 Naming Convention

**Format:** `YYYY-MM-DD_DESCRIPTION.md`

**Examples:**
- `2025-11-20_GITHUB_DEPLOYMENT.md`
- `2025-11-19_SESSION_SUMMARY.md`
- `2025-11-18_RLS_FIX.md`

**Rules:**
- Use ISO date format (YYYY-MM-DD)
- Use descriptive, short description
- Use UPPERCASE for description
- Separate date and description with underscore

---

## 🔍 Verification Before Saving

Before finalizing the log:

- [ ] Date in filename matches current date
- [ ] Date in header matches filename date
- [ ] Date in footer matches filename date
- [ ] All dates are consistent throughout
- [ ] No references to "yesterday" or "tomorrow" (use actual dates)
- [ ] File doesn't already exist for today

---

## 💡 Tips

1. **Always ask for confirmation** if unsure about the date
2. **Check file system timestamps** as a secondary verification
3. **Use consistent date format** throughout the entire file
4. **Double-check the footer** - it's easy to copy-paste from an old log
5. **When in doubt, ask the user** what today's date is

---

## 📝 Updating REMAINING_TASKS.md

### When to Update (When updating, Ensure there is a daily log to record the updates to):
- After completing tasks mentioned in daily logs 
- When user confirms tasks are completed
- When tasks are properly documented in daily logs

### Update Process:

1. **Verify Task Completion:**
   - ✅ Task must be documented in a daily log with matching date
   - ✅ Daily log must explain what was completed and how
   - ✅ All sub-tasks should be documented
   - ⚠️ **DO NOT remove tasks that aren't documented in logs**

2. **Remove Completed Tasks:**
   - **DELETE the entire task section** from REMAINING_TASKS.md
   - Do NOT mark as completed and leave in the list
   - Do NOT create a "Completed Tasks" section
   - Completed tasks are tracked in daily logs, not in REMAINING_TASKS.md

3. **Add New Tasks:**
   - Add new tasks identified during the session
   - Use proper priority levels (🔴 High, 🟡 Medium, 🟢 Low)
   - Include source date and status
   - Number tasks sequentially within each priority section

4. **Update Header:**
   - Update "Last Updated" date
   - Note that completed tasks have been removed
   - Reference daily logs for completion details

5. **Update Task Summary:**
   - Remove completed tasks from summary sections
   - Keep only active/pending tasks
   - Update recommended order of completion

6. **Verification:**
   - ⚠️ **ALWAYS verify task is documented in daily log** before removing
   - ⚠️ **ALWAYS verify with user** if uncertain about completion status
   - Don't remove tasks without proper documentation
   - Ask user if unsure whether a task is truly done

### Example Update Format:

**Before (in REMAINING_TASKS.md):**
```
### 1. Fix GitHub Actions Deployment
**Source:** November 18, 2025  
**Status:** ✅ **COMPLETED** - November 19, 2025
...
```

**After (in REMAINING_TASKS.md):**
```
[Task completely removed - see 2025-11-20_FULL_SESSION.md for details]
```

**In Daily Log (2025-11-20_FULL_SESSION.md):**
```
### 1. Fixed GitHub Actions Deployment with Environment Variables
**Status:** ✅ **COMPLETED** - Morning session
[Full documentation of what was done]
```

---

**Last Updated:** November 20, 2025  
**Purpose:** Prevent date mistakes in daily log creation  
**Status:** ✅ Active checklist

