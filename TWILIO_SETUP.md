
# Twilio CLI Setup Guide

## Quick Start

If you have your Twilio credentials ready, you can set them directly in Supabase:

```bash
# Get these from https://www.twilio.com/console
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here

# Get your WhatsApp number from Twilio Console
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

## Prerequisites
- Node.js installed (for npm)
- Twilio account credentials (Account SID and Auth Token)
- WhatsApp-enabled phone number in Twilio

## Installation

### Install Twilio CLI
```bash
npm install -g twilio-cli
```

### Verify Installation
```bash
twilio --version
```

## Authentication

### Method 1: Interactive Login (Recommended)
```bash
twilio login
```
This will:
1. Open your browser to authenticate
2. Save your credentials securely
3. Set up a default profile

### Method 2: Manual Credential Setup
```bash
twilio profiles:create \
  --account-sid ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx \
  --auth-token your_auth_token_here \
  --profile-name default
```

### Verify Authentication
```bash
twilio api:core:accounts:fetch
```

## Get Your WhatsApp-Enabled Number

### List your phone numbers
```bash
twilio phone-numbers:list
```

### Or use the Twilio Console
1. Go to https://console.twilio.com/us1/develop/phone-numbers/manage/incoming
2. Find your WhatsApp-enabled number
3. It should start with `whatsapp:+`

## Configure Supabase Secrets

Once you have your credentials:

```bash
# Get your Account SID (from twilio login output or console)
supabase secrets set TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Get your Auth Token (from twilio login output or console)  
supabase secrets set TWILIO_AUTH_TOKEN=your_auth_token_here

# Set your WhatsApp sender number (format: whatsapp:+1234567890)
supabase secrets set TWILIO_WHATSAPP_FROM=whatsapp:+1234567890
```

## Verify Secrets Are Set

```bash
supabase secrets list
```

You should see:
- TWILIO_ACCOUNT_SID
- TWILIO_AUTH_TOKEN  
- TWILIO_WHATSAPP_FROM

## Test WhatsApp Sending

You can test via Twilio CLI:

```bash
twilio api:messages:create \
  --from "whatsapp:+1234567890" \
  --to "whatsapp:+1234567890" \
  --body "Test message from Twilio CLI"
```

## Troubleshooting

### If CLI login fails:
1. Make sure you're using the correct Twilio account
2. Check your Account SID and Auth Token in the Twilio Console
3. Verify your phone number has WhatsApp enabled

### If secrets aren't working:
1. Check secret names match exactly (case-sensitive)
2. Verify no extra spaces in values
3. Redeploy Edge Functions after setting secrets

