#!/bin/bash
# ========================================
# Supabase CLI Sync Script
# ========================================
# Purpose: Automate schema sync from Production to Staging
# Usage: ./cli_sync_script.sh
# ========================================

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Supabase CLI Schema Sync${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI is not installed${NC}"
    echo "Install it with: npm install -g supabase"
    exit 1
fi

echo -e "${GREEN}✓ Supabase CLI found${NC}"

# Check if logged in
if ! supabase projects list &> /dev/null; then
    echo -e "${YELLOW}Not logged in. Please login:${NC}"
    supabase login
fi

echo -e "${GREEN}✓ Logged in to Supabase${NC}"
echo ""

# Get project refs
echo -e "${YELLOW}Available projects:${NC}"
supabase projects list

echo ""
read -p "Enter PRODUCTION project ref: " PROD_REF
read -p "Enter STAGING project ref: " STAGING_REF

echo ""
echo -e "${YELLOW}Step 1: Pulling schema from PRODUCTION...${NC}"
supabase link --project-ref "$PROD_REF"
supabase db pull

echo -e "${GREEN}✓ Schema pulled from production${NC}"
echo ""

# Get the latest migration file
LATEST_MIGRATION=$(ls -t supabase/migrations/*.sql | head -1)
echo -e "${YELLOW}Latest migration: ${LATEST_MIGRATION}${NC}"
echo ""

read -p "Review the migration file above. Press Enter to continue..."

echo ""
echo -e "${YELLOW}Step 2: Linking to STAGING...${NC}"
supabase link --project-ref "$STAGING_REF"

echo -e "${GREEN}✓ Linked to staging${NC}"
echo ""

read -p "Have you reset the staging database? (y/n): " RESET_CONFIRM
if [ "$RESET_CONFIRM" != "y" ]; then
    echo -e "${YELLOW}Please reset staging database via dashboard first${NC}"
    echo "Dashboard → Settings → Database → Reset Database"
    read -p "Press Enter after resetting..."
fi

echo ""
echo -e "${YELLOW}Step 3: Pushing migrations to STAGING...${NC}"
supabase db push

echo -e "${GREEN}✓ Migrations pushed to staging${NC}"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Schema sync complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}Next steps:${NC}"
echo "1. Migrate data using: 20251208_simple_data_export.sql"
echo "2. Verify with: 20251208_check_migration_status.sql"
echo ""



