#!/bin/bash
# Twilio Setup Script for Supabase
# This script helps configure Twilio WhatsApp notifications

set -e

echo "🚀 Twilio WhatsApp Configuration for QCS Cargo"
echo "=============================================="
echo ""

# Check if Twilio CLI is installed
if ! command -v twilio &> /dev/null; then
    echo "❌ Twilio CLI not found. Installing..."
    npm install -g twilio-cli
fi

echo "📋 Two ways to configure Twilio:"
echo ""
echo "Option 1: Interactive Login (Manual)"
echo "------------------------------------"
echo "Run this command in your terminal:"
echo "  twilio login"
echo ""
echo "Then follow the prompts to enter:"
echo "  - Account SID (from https://www.twilio.com/console)"
echo "  - Auth Token (from https://www.twilio.com/console)"
echo ""

echo "Option 2: Manual Profile Setup (if you have credentials)"
echo "--------------------------------------------------------"
echo "Run this command with your actual credentials:"
echo "  twilio profiles:create \\"
echo "    --account-sid ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \\"
echo "    --auth-token your_auth_token_here"
echo ""

# Get credentials from user or environment
if [ -z "$TWILIO_ACCOUNT_SID" ] || [ -z "$TWILIO_AUTH_TOKEN" ]; then
    echo "⚠️  Credentials not found in environment."
    echo ""
    echo "To set Supabase secrets manually:"
    echo ""
    echo "1. Get your credentials from: https://www.twilio.com/console"
    echo "2. Get your WhatsApp-enabled number from: https://console.twilio.com/us1/develop/phone-numbers/manage/incoming"
    echo ""
    echo "Then run these commands:"
    echo ""
    echo "  supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
    echo "  supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token"
    echo "  supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1234567890"
    echo ""
    exit 0
fi

echo "✅ Found credentials in environment variables!"
echo ""

# Verify we can authenticate
echo "🔐 Verifying Twilio credentials..."
if twilio api:core:accounts:fetch --account-sid "$TWILIO_ACCOUNT_SID" > /dev/null 2>&1; then
    echo "✅ Twilio credentials verified!"
else
    echo "❌ Failed to verify credentials. Please check your Account SID and Auth Token."
    exit 1
fi

# Get WhatsApp number if not provided
if [ -z "$TWILIO_WHATSAPP_FROM" ]; then
    echo "📱 Fetching your WhatsApp-enabled numbers..."
    twilio phone-numbers:list --format=json | grep -i whatsapp || echo "⚠️  No WhatsApp numbers found. Check Twilio Console."
    echo ""
    echo "Please set TWILIO_WHATSAPP_FROM manually:"
    echo "  supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1234567890"
else
    echo "✅ WhatsApp number configured: $TWILIO_WHATSAPP_FROM"
fi

# Set Supabase secrets
echo ""
echo "🔧 Setting Supabase secrets..."
supabase secrets set TWILIO_ACCOUNT_SID="$TWILIO_ACCOUNT_SID"
supabase secrets set TWILIO_AUTH_TOKEN="$TWILIO_AUTH_TOKEN"

if [ -n "$TWILIO_WHATSAPP_FROM" ]; then
    supabase secrets set TWILIO_WHATSAPP_FROM="$TWILIO_WHATSAPP_FROM"
fi

echo ""
echo "✅ Configuration complete!"
echo ""
echo "📋 Verify secrets are set:"
echo "  supabase secrets list"
echo ""
echo "🧪 Test WhatsApp sending (optional):"
echo "  twilio api:messages:create \\"
echo "    --from \"$TWILIO_WHATSAPP_FROM\" \\"
echo "    --to \"whatsapp:+1234567890\" \\"
echo "    --body \"Test message from QCS Cargo\""
echo ""

