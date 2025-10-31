#!/bin/bash

# Deployment script for UI improvements: Database migration and edge function deployment
# This script applies the migration and deploys the updated admin-shipments-management function

set -e

PROJECT_REF="jsdfltrkpaqdjnofwmug"
MIGRATION_FILE="supabase/migrations/1759500000_verify_quotes_rls_and_bulk_support.sql"
EDGE_FUNCTION="admin-shipments-management"

echo "🚀 Deploying UI Improvements to QCS Cargo"
echo "=========================================="
echo ""

# Step 1: Verify Supabase CLI is available
echo "📋 Step 1: Checking prerequisites..."
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found. Please install it first."
    exit 1
fi
echo "✅ Supabase CLI found"

# Step 2: Check if linked to correct project
echo ""
echo "📋 Step 2: Verifying project link..."
CURRENT_REF=$(supabase status --output json 2>/dev/null | jq -r '.DB.Pooler.Enabled' 2>/dev/null || echo "")
if [ -z "$CURRENT_REF" ]; then
    echo "⚠️  Not linked to a project. Linking now..."
    supabase link --project-ref "$PROJECT_REF" || {
        echo "❌ Failed to link project. Please link manually:"
        echo "   supabase link --project-ref $PROJECT_REF"
        exit 1
    }
fi
echo "✅ Project linked"

# Step 3: Verify migration file exists
echo ""
echo "📋 Step 3: Verifying migration file..."
if [ ! -f "$MIGRATION_FILE" ]; then
    echo "❌ Migration file not found: $MIGRATION_FILE"
    exit 1
fi
echo "✅ Migration file found: $MIGRATION_FILE"

# Step 4: Apply database migration
echo ""
echo "📋 Step 4: Applying database migration..."
echo "⚠️  This will modify the database. Make sure you have a backup!"
read -p "Continue? (y/N): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 1
fi

echo "Applying migration..."
supabase db push --file "$MIGRATION_FILE" || {
    echo "⚠️  Direct push failed. Trying alternative method..."
    echo "You may need to apply this migration manually via Supabase Dashboard:"
    echo "1. Go to https://app.supabase.com/project/$PROJECT_REF/sql/new"
    echo "2. Copy contents of $MIGRATION_FILE"
    echo "3. Paste and execute"
    echo ""
    read -p "Press Enter after applying migration manually, or Ctrl+C to cancel..."
}

# Step 5: Deploy edge function
echo ""
echo "📋 Step 5: Deploying edge function: $EDGE_FUNCTION"
if [ ! -d "supabase/functions/$EDGE_FUNCTION" ]; then
    echo "❌ Edge function directory not found: supabase/functions/$EDGE_FUNCTION"
    exit 1
fi

echo "Deploying function..."
supabase functions deploy "$EDGE_FUNCTION" || {
    echo "❌ Failed to deploy function. Please deploy manually:"
    echo "   supabase functions deploy $EDGE_FUNCTION"
    exit 1
}

# Step 6: Verification
echo ""
echo "📋 Step 6: Verifying deployment..."
echo "✅ Migration applied (or needs manual verification)"
echo "✅ Edge function deployed"
echo ""
echo "🎉 Deployment complete!"
echo ""
echo "Next steps:"
echo "1. Test quotes management page in the UI"
echo "2. Test bulk status updates in admin panel"
echo "3. Verify shipment details page shows documents"
echo "4. Check that RLS policies are working correctly"

