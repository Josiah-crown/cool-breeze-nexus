# 🤖 AI Prompt Guide

**Last Updated:** November 25, 2025  
**Purpose:** Guide for effectively working with AI assistants on this project

---

## 📖 Overview

This guide provides example prompts and best practices for working with AI assistants on the Cool Breeze Nexus project. Use these examples as templates for your own questions.

**Before asking questions:**
1. Check `AI_REFERENCE.md` for project context
2. Check `DAILY_LOGS/REMAINING_TASKS.md` for current tasks
3. Check `README.md` for documentation links

---

## 🎯 Best Practices

### **Effective Prompt Structure**
1. **Be specific** - Include file names, error messages, or specific features
2. **Provide context** - Reference relevant documentation or previous work
3. **Use file references** - Use `@filename` syntax to reference files
4. **State your goal** - What are you trying to accomplish?

### **Example Good Prompts:**
✅ "I need to add a new manufacturer. Can you check @HOW_TO_ADD_MACHINE_WITH_PARAMETERS.md and guide me through the process?"

✅ "The ESP32 is showing HTTP 401 errors. Check @ESP32_INTEGRATION_GUIDE.md and help me troubleshoot."

✅ "I want to update the deployment process. Review @DEPLOYMENT_GUIDE_GITHUB.md and suggest improvements."

### **Example Bad Prompts:**
❌ "Fix the bug" (too vague)
❌ "How does this work?" (no context)
❌ "Update everything" (not specific)

---

## 📝 Example Prompts by Category

### **🔧 Deployment & Setup**

#### Deploy to Production
```
I need to deploy the latest changes. Check @DEPLOYMENT_GUIDE_GITHUB.md and guide me through the process. If GitHub Actions fails, what's the manual fallback?
```

#### Manual Deployment
```
GitHub Actions isn't working. Can you walk me through the manual deployment process using @docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md?
```

#### Environment Variables
```
I need to update the Supabase project ID. Check @supabase/config.toml and all documentation files. The new project ID is wjyanxstvbiqefmgpccb. Update all references.
```

---

### **🗄️ Database & Migrations**

#### Add New Manufacturer
```
I want to add a new manufacturer called "Alliance". Check @ALLIANCE_MANUFACTURER_ADDITION.md for the pattern, and guide me through adding it to the database schema and code.
```

#### Run Migration
```
I need to run migration 4. Check @supabase/migrations/ and tell me what it does, then help me execute it safely.
```

#### Fix RLS Policies
```
I'm getting permission errors when accessing the Cirrus table. Check the RLS policies and help me fix them. Reference @docs/supabase/ for any relevant guides.
```

#### Database Schema Questions
```
Where is the complete database schema documented? I need to understand the table structure for adding a new feature.
```

---

### **🔌 ESP32 & Hardware**

#### Set Up New ESP32 Device
```
I need to set up a new ESP32 device. Walk me through the process using @ESP32_INTEGRATION_GUIDE.md. The device is for a Cirrus machine.
```

#### ESP32 Troubleshooting
```
My ESP32 is showing HTTP 401 errors. Check @ESP32_INTEGRATION_GUIDE.md and help me diagnose the issue. The device was working yesterday.
```

#### Update ESP32 Firmware
```
I want to update the ESP32 firmware. Compare @hardware/esp32/ESP32_Cirrus_Optimized_2Min/ESP32_Cirrus_Optimized_2Min.ino with the current production version and tell me what changed.
```

#### ESP32 Data Not Showing
```
The ESP32 is sending data (I see HTTP 201 in Serial Monitor), but it's not appearing on the dashboard. Help me troubleshoot using the data flow documentation.
```

---

### **💻 Frontend & UI**

#### Add New Feature
```
I want to add a new feature to display machine efficiency. Check the current dashboard structure in @src/pages/Dashboard.tsx and suggest where to add it.
```

#### Fix UI Bug
```
The machine cards aren't updating in real-time. Check @src/hooks/useMachineData.tsx and see if there's an issue with the data fetching.
```

#### Historical Data Issues
```
The historical graphs aren't showing the correct date range. Check @src/lib/historicalData.ts and fix the data range calculation.
```

#### Add New Component
```
I need to add a new component for displaying alert history. Check the existing component structure in @src/components/ and create a similar one.
```

---

### **📧 Alerts & Notifications**

#### Implement Alert Logic
```
I need to implement the alert checking logic. Check @docs/general/COMPLETE_ALERT_PARAMETERS.md for all alert conditions, and @DAILY_LOGS/REMAINING_TASKS.md for the current status. Help me create the alert monitoring function.
```

#### Email Configuration
```
I need to set up email notifications. Check @CPANEL_EMAIL_SETUP_GUIDE.md and guide me through the configuration.
```

#### Test Alert System
```
I want to test the alert system. Check @docs/general/RUN_DEMO_SETUP.md and help me create test data that will trigger alerts.
```

---

### **📚 Documentation**

#### Update Documentation
```
I've made changes to the deployment process. Update @README.md and @DEPLOYMENT_GUIDE_GITHUB.md to reflect the new steps. Also check if @AI_REFERENCE.md needs updates.
```

#### Find Documentation
```
I need to understand how the data flow works. Where is this documented? Check @docs/README.md and point me to the right files.
```

#### Create New Documentation
```
I've added a new feature for machine grouping. Help me create documentation for it and add it to the appropriate location in @docs/.
```

---

### **🐛 Troubleshooting**

#### General Troubleshooting
```
I'm seeing [specific error]. Check the troubleshooting guides in @docs/general/ and help me diagnose the issue.
```

#### Connection Issues
```
Machines are showing as "disconnected" but the ESP32 is sending data. Check @scripts/check-and-fix-connection.mjs and help me fix the connection status.
```

#### Data Not Appearing
```
Data isn't showing on the dashboard. Help me check:
1. Is ESP32 sending data? (check readings_raw table)
2. Is trigger processing data? (check cirrus/coolbreeze tables)
3. Are RLS policies correct? (check Supabase)
```

#### Build Errors
```
I'm getting build errors when running `npm run build`. Check the error messages and help me fix them.
```

---

### **✅ Task Management**

#### Check Task Status
```
Check @DAILY_LOGS/REMAINING_TASKS.md and tell me what tasks are high priority and what their current status is.
```

#### Mark Task Complete
```
I've completed task 1 (Alert Logic Implementation). Check @DAILY_LOGS/REMAINING_TASKS.md and remove it from the list. Make sure it's documented in today's daily log.
```

#### Add New Task
```
I need to add a new task: "Implement billing system". Add it to @DAILY_LOGS/REMAINING_TASKS.md in the appropriate priority section.
```

#### Update Task Progress
```
Task 1 (Alert Logic Implementation) is partially complete. Update @DAILY_LOGS/REMAINING_TASKS.md to reflect the current status - alert checking is done, but email sending is still pending.
```

---

### **🔄 Code Review & Refactoring**

#### Review Code Changes
```
I've made changes to the alert system. Review @src/components/AlertThresholdsEditor.tsx and suggest improvements or potential issues.
```

#### Refactor Code
```
The historical data fetching code is getting complex. Check @src/lib/historicalData.ts and suggest how to refactor it for better maintainability.
```

#### Code Cleanup
```
I want to clean up the codebase. Check for:
1. Debug logging that should be removed
2. Commented-out code
3. Unused imports
Start with @src/pages/Dashboard.tsx.
```

---

### **🔍 Understanding the Codebase**

#### How Does X Work?
```
I want to understand how the machine data flows from ESP32 to the dashboard. Check the relevant files and explain the data flow step by step.
```

#### Where Is X Implemented?
```
Where is the user hierarchy logic implemented? I need to understand how users see different machines based on their role.
```

#### What Files Handle X?
```
What files are involved in the alert system? I need to understand the complete implementation before making changes.
```

---

## 🎓 Advanced Prompt Patterns

### **Multi-Step Tasks**
```
I need to:
1. Add a new manufacturer to the database
2. Update the frontend to support it
3. Create ESP32 configuration for it
4. Update documentation

Check the relevant guides and help me do this step by step.
```

### **Comparison Tasks**
```
Compare the current database schema with the proposed architecture in @PROPOSED_DATABASE_ARCHITECTURE.md. What needs to change for the migration?
```

### **Verification Tasks**
```
I've updated the Supabase project ID. Verify that all active files have been updated correctly. Check:
- Configuration files
- Documentation files
- Code files
- Environment variable examples
```

### **Research Tasks**
```
I need to understand how to implement [feature]. Research the codebase and documentation, then provide a plan for implementation.
```

---

## 📋 Quick Reference

### **Most Common Prompts**

1. **Deployment:**
   - "Help me deploy using @DEPLOYMENT_GUIDE_GITHUB.md"
   - "GitHub Actions failed, manual deployment using @docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md"

2. **ESP32:**
   - "Set up new ESP32 using @ESP32_INTEGRATION_GUIDE.md"
   - "ESP32 HTTP 401 error - troubleshoot using integration guide"

3. **Database:**
   - "Add new manufacturer following @ALLIANCE_MANUFACTURER_ADDITION.md pattern"
   - "Fix RLS policies for [table name]"

4. **Documentation:**
   - "Update @README.md with [new information]"
   - "Where is [topic] documented? Check @docs/README.md"

5. **Tasks:**
   - "Check @DAILY_LOGS/REMAINING_TASKS.md for current priorities"
   - "Mark task [X] complete in @DAILY_LOGS/REMAINING_TASKS.md"

---

## 🚨 Emergency Prompts

### **Production Down**
```
The production site is down. Check @DEPLOYMENT_GUIDE_GITHUB.md and @docs/general/MANUAL_UPLOAD_QUICK_GUIDE.md. Help me restore it quickly.
```

### **Data Loss**
```
I think data was lost. Check @docs/general/SYSTEM_ACCESS_AND_BACKUP.md for backup procedures and help me restore from backup.
```

### **Security Issue**
```
I'm seeing unauthorized access attempts. Check RLS policies and help me secure the system. Reference @docs/supabase/ for security best practices.
```

---

## 💡 Tips for Better Results

1. **Reference Specific Files:** Use `@filename` to point AI to specific files
2. **Provide Context:** Mention what you've already tried or what you know
3. **Ask Follow-ups:** Don't hesitate to ask for clarification
4. **Verify Changes:** Always ask AI to verify changes were made correctly
5. **Check Documentation:** Ask AI to check if documentation needs updates after changes

---

## 📞 Related Files

- **`AI_REFERENCE.md`** - Project context for AI assistants
- **`README.md`** - Main project documentation
- **`DAILY_LOGS/REMAINING_TASKS.md`** - Current task list
- **`docs/README.md`** - Documentation index

---

**Remember:** The more specific and contextual your prompts, the better the AI can help you!

