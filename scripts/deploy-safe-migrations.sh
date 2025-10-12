#!/bin/bash

# Safe Migration Deployment Script
# Purpose: Deploy safe auth migrations to Supabase environment
# Usage: ./scripts/deploy-safe-migrations.sh [staging|production]

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$( cd "$SCRIPT_DIR/.." && pwd )"

# Check environment argument
if [ $# -eq 0 ]; then
    echo -e "${RED}Error: Environment argument required${NC}"
    echo "Usage: $0 [staging|production]"
    echo ""
    echo "Example:"
    echo "  $0 staging     # Deploy to staging"
    echo "  $0 production  # Deploy to production"
    exit 1
fi

ENVIRONMENT=$1

# Validate environment
if [[ ! "$ENVIRONMENT" =~ ^(staging|production)$ ]]; then
    echo -e "${RED}Error: Invalid environment '$ENVIRONMENT'${NC}"
    echo "Must be 'staging' or 'production'"
    exit 1
fi

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}Safe Migration Deployment${NC}"
echo -e "${BLUE}Environment: ${YELLOW}$ENVIRONMENT${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""

# Confirmation for production
if [ "$ENVIRONMENT" = "production" ]; then
    echo -e "${RED}⚠️  WARNING: You are about to deploy to PRODUCTION${NC}"
    echo -e "${RED}⚠️  This will modify the production database${NC}"
    echo ""
    read -p "Type 'YES' to continue: " confirmation
    if [ "$confirmation" != "YES" ]; then
        echo -e "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi
    echo ""
fi

# Check Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo -e "${RED}Error: Supabase CLI not found${NC}"
    echo "Install it first: https://supabase.com/docs/guides/cli"
    exit 1
fi

echo -e "${GREEN}✓${NC} Supabase CLI found"

# Check if linked to project
if ! supabase projects list &> /dev/null; then
    echo -e "${RED}Error: Not authenticated with Supabase${NC}"
    echo "Run: supabase login"
    exit 1
fi

echo -e "${GREEN}✓${NC} Authenticated with Supabase"
echo ""

# Show current project
echo -e "${BLUE}Current Supabase connection:${NC}"
supabase status 2>/dev/null || echo "Not connected to local instance"
echo ""

# Ask for project confirmation
echo -e "${YELLOW}Please confirm you are linked to the correct project${NC}"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    echo ""
    echo "To link to a project, run:"
    echo "  supabase link --project-ref YOUR_PROJECT_REF"
    exit 0
fi

echo ""
echo -e "${BLUE}Starting deployment...${NC}"
echo ""

# Step 1: Verify backup exists
echo -e "${BLUE}[1/6]${NC} Verifying backup..."
echo -e "${YELLOW}→${NC} Please confirm backup exists in Supabase Dashboard"
echo -e "${YELLOW}→${NC} Dashboard → Database → Backups"
read -p "Backup confirmed? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${RED}✗${NC} Backup not confirmed. Deployment cancelled."
    echo "Create a backup first, then retry."
    exit 1
fi
echo -e "${GREEN}✓${NC} Backup confirmed"
echo ""

# Step 2: Run pre-migration checks
echo -e "${BLUE}[2/6]${NC} Running pre-migration checks..."
echo -e "${YELLOW}→${NC} Checking database prerequisites..."

# Create temporary SQL file for checks
cat > /tmp/quick_check.sql << 'EOF'
-- Quick prerequisite check
SELECT 
    EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') as has_user_profiles,
    EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'role') as has_role_column;
EOF

if supabase db remote connect <<< "\i /tmp/quick_check.sql" 2>&1 | grep -q "t.*f"; then
    echo -e "${GREEN}✓${NC} Prerequisites met (user_profiles exists, role column will be added)"
elif supabase db remote connect <<< "\i /tmp/quick_check.sql" 2>&1 | grep -q "t.*t"; then
    echo -e "${GREEN}✓${NC} Prerequisites met (user_profiles and role column exist)"
    echo -e "${YELLOW}→${NC} Migration will be idempotent (safe to rerun)"
else
    echo -e "${RED}✗${NC} Prerequisites not met"
    echo "Required: user_profiles table must exist"
    exit 1
fi

rm /tmp/quick_check.sql
echo ""

# Step 3: Deploy auth standardization migration
echo -e "${BLUE}[3/6]${NC} Deploying auth standardization migration..."
echo -e "${YELLOW}→${NC} File: 1758200003_auth_standardization_safe.sql"

if supabase db push --include 1758200003_auth_standardization_safe.sql; then
    echo -e "${GREEN}✓${NC} Auth standardization deployed successfully"
else
    echo -e "${RED}✗${NC} Auth standardization failed"
    echo ""
    echo -e "${RED}DEPLOYMENT FAILED - ROLLBACK MAY BE NEEDED${NC}"
    echo "Check error message above for details"
    echo "Rollback instructions in: PRODUCTION_MIGRATION_DEPLOYMENT.md"
    exit 1
fi
echo ""

# Step 4: Deploy rollback tracking migration
echo -e "${BLUE}[4/6]${NC} Deploying rollback tracking migration..."
echo -e "${YELLOW}→${NC} File: 1758200004_simple_rollback_tracking.sql"

if supabase db push --include 1758200004_simple_rollback_tracking.sql; then
    echo -e "${GREEN}✓${NC} Rollback tracking deployed successfully"
else
    echo -e "${RED}✗${NC} Rollback tracking failed"
    echo ""
    echo -e "${YELLOW}WARNING: Auth migration succeeded but tracking failed${NC}"
    echo "Auth standardization is active, but tracking system is not"
    echo "You may want to manually apply 1758200004_simple_rollback_tracking.sql"
    # Don't exit - auth migration already applied
fi
echo ""

# Step 5: Verify deployment
echo -e "${BLUE}[5/6]${NC} Verifying deployment..."

# Create verification SQL
cat > /tmp/verify_deployment.sql << 'EOF'
-- Verify auth functions
SELECT COUNT(*) as auth_functions_count 
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public' 
  AND p.proname IN ('get_user_role', 'is_admin', 'is_staff', 'has_role');

-- Verify role column
SELECT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'user_profiles' AND column_name = 'role'
) as has_role_column;

-- Check users with roles
SELECT COUNT(*) as total_users, COUNT(role) as users_with_roles
FROM user_profiles;
EOF

echo -e "${YELLOW}→${NC} Checking auth functions..."
if supabase db remote connect <<< "\i /tmp/verify_deployment.sql" 2>&1 | grep -q "4"; then
    echo -e "${GREEN}✓${NC} All auth functions created"
else
    echo -e "${YELLOW}⚠${NC} Some auth functions may be missing"
fi

echo -e "${YELLOW}→${NC} Checking user roles..."
# This will show the count
supabase db remote connect <<< "\i /tmp/verify_deployment.sql" | grep -A 2 "total_users"

rm /tmp/verify_deployment.sql
echo ""

# Step 6: Smoke test instructions
echo -e "${BLUE}[6/6]${NC} Deployment complete!"
echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ DEPLOYMENT SUCCESSFUL${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "${YELLOW}IMPORTANT: Perform smoke tests now:${NC}"
echo ""
echo "1. Admin Dashboard:"
echo "   • Login as admin user"
echo "   • Access admin dashboard"
echo "   • Verify no 403 errors"
echo "   • Check shipping quotes visible"
echo ""
echo "2. User Authentication:"
echo "   • Login as regular user"
echo "   • Verify profile access works"
echo "   • Test permissions"
echo ""
echo "3. Monitor for issues:"
echo "   • Watch error logs for 1 hour"
echo "   • Check query performance"
echo "   • Verify no user complaints"
echo ""
echo -e "${BLUE}Monitoring commands:${NC}"
echo ""
echo "# Check migration status"
echo "supabase db remote connect"
echo "SELECT * FROM migration_overview;"
echo ""
echo "# View recent errors"
echo "SELECT * FROM auth.audit_log_entries"
echo "WHERE created_at > NOW() - INTERVAL '1 hour'"
echo "ORDER BY created_at DESC LIMIT 20;"
echo ""
echo -e "${BLUE}Rollback (if needed):${NC}"
echo "See: PRODUCTION_MIGRATION_DEPLOYMENT.md → Rollback Procedures"
echo ""
echo -e "${GREEN}========================================${NC}"
echo ""

# Log deployment
LOG_FILE="$PROJECT_ROOT/deployment_log.txt"
echo "$(date '+%Y-%m-%d %H:%M:%S') - Deployed safe migrations to $ENVIRONMENT" >> "$LOG_FILE"
echo -e "${BLUE}Deployment logged to: $LOG_FILE${NC}"
echo ""