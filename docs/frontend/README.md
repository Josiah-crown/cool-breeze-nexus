# 💻 Frontend Documentation

Documentation for website, UI components, and frontend-specific features.

---

## 📋 Files

### **Historical Data**
- **[HISTORICAL_DATA_SETUP.md](./HISTORICAL_DATA_SETUP.md)** - Guide for setting up historical data tracking on the website

### **Machine Configuration**
- **[MACHINE_SUBCATEGORY_SETUP.md](./MACHINE_SUBCATEGORY_SETUP.md)** - Setup guide for machine subcategories (Cirrus, CoolBreeze, etc.)
- **[ADDING_NEW_SUBCATEGORIES.md](./ADDING_NEW_SUBCATEGORIES.md)** - Guide for adding new machine subcategories/manufacturers

---

## 🚀 Quick Start

**Setting up historical data:**
1. Review [HISTORICAL_DATA_SETUP.md](./HISTORICAL_DATA_SETUP.md)
2. Ensure Supabase processing tables are set up (see [../supabase/](../supabase/))

**Adding new machine types:**
1. Read [ADDING_NEW_SUBCATEGORIES.md](./ADDING_NEW_SUBCATEGORIES.md)
2. Update configuration in `src/lib/machineConfig.ts`
3. Follow the guide for database changes if needed

---

## 📖 Topics Covered

- Historical data fetching and display
- Machine subcategory selection
- Dynamic UI components
- Configuration management
- Type-safe TypeScript setup

