#!/bin/bash

# =====================================================
# PRODUCTION DATABASE CLEANUP EXECUTION SCRIPT
# =====================================================
# This script executes the clean slate approach via CLI
# Replaces manual Supabase dashboard operations
# =====================================================

set -e  # Exit on any error

echo "🚀 Starting Production Database Cleanup via CLI..."
echo "=================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if we have the required environment variables
if [ -z "$SUPABASE_DB_URL" ]; then
    echo -e "${RED}❌ ERROR: SUPABASE_DB_URL environment variable not set${NC}"
    echo "Please set your production database URL:"
    echo "export SUPABASE_DB_URL='postgresql://postgres:[password]@[host]:5432/postgres'"
    exit 1
fi

echo -e "${BLUE}📋 Cleanup Plan:${NC}"
echo "1. Backup current data"
echo "2. Clean duplicate user profiles"
echo "3. Reset RLS policies"
echo "4. Create missing profiles"
echo "5. Verify authentication flow"
echo ""

# Confirm execution
read -p "🔥 This will modify PRODUCTION database. Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}⚠️  Operation cancelled by user${NC}"
    exit 0
fi

echo -e "${BLUE}🔧 Step 1: Executing Database Cleanup...${NC}"
if psql "$SUPABASE_DB_URL" -f scripts/production-database-cleanup.sql; then
    echo -e "${GREEN}✅ Database cleanup completed successfully${NC}"
else
    echo -e "${RED}❌ Database cleanup failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Step 2: Resetting RLS Policies...${NC}"
if psql "$SUPABASE_DB_URL" -f scripts/production-rls-reset.sql; then
    echo -e "${GREEN}✅ RLS policies reset successfully${NC}"
else
    echo -e "${RED}❌ RLS policy reset failed${NC}"
    exit 1
fi

echo ""
echo -e "${BLUE}🔧 Step 3: Verifying Database State...${NC}"
psql "$SUPABASE_DB_URL" -c "
SELECT 
    'Final State Check' as status,
    COUNT(*) as total_profiles,
    COUNT(DISTINCT user_id) as unique_users,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'customer' THEN 1 END) as customer_count
FROM user_profiles;
"

echo ""
echo -e "${BLUE}🔧 Step 4: Checking RLS Policies...${NC}"
psql "$SUPABASE_DB_URL" -c "
SELECT 
    policyname,
    cmd,
    permissive
FROM pg_policies 
WHERE tablename = 'user_profiles'
ORDER BY policyname;
"

echo ""
echo -e "${GREEN}🎉 PRODUCTION CLEANUP COMPLETE!${NC}"
echo "=================================================="
echo -e "${GREEN}✅ Database duplicates cleaned${NC}"
echo -e "${GREEN}✅ RLS policies simplified${NC}"
echo -e "${GREEN}✅ Authentication flow standardized${NC}"
echo -e "${GREEN}✅ Missing profiles created${NC}"
echo ""
echo -e "${YELLOW}📋 Next Steps:${NC}"
echo "1. Test user registration on production"
echo "2. Test user login on production"
echo "3. Verify admin access works"
echo "4. Monitor for any authentication errors"
echo ""
echo -e "${BLUE}🔍 To test authentication:${NC}"
echo "- Visit your production site"
echo "- Try registering a new user"
echo "- Try logging in with existing credentials"
echo "- Check admin dashboard access"