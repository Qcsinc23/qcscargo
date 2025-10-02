# Resend API Setup Guide for Quote Email System

## Overview
The quote email system uses [Resend](https://resend.com) to send branded quotation emails to customers. Without proper configuration, quotes are saved but emails aren't delivered.

## Setup Steps

### 1. Create Resend Account
1. Go to [resend.com](https://resend.com)
2. Sign up for a free account (100 emails/day free tier)
3. Verify your email address

### 2. Get API Key
1. Log into Resend dashboard
2. Navigate to **API Keys** section
3. Click **Create API Key**
4. Name it "QCS Cargo Production" or similar
5. Copy the API key (starts with `re_`)
   - **Important**: Save it immediately - you can only view it once!

### 3. Verify Sending Domain
1. In Resend dashboard, go to **Domains**
2. Click **Add Domain**
3. Enter your domain: `qcs-cargo.com`
4. Add the DNS records provided by Resend to your domain registrar:
   - SPF record
   - DKIM record  
   - DMARC record (optional but recommended)
5. Wait for DNS propagation (usually 15-60 minutes)
6. Click **Verify Domain** once records are added

**Note**: Until domain is verified, you can only send to verified email addresses.

### 4. Configure Supabase Edge Functions

#### Option A: Supabase Dashboard (Recommended)
1. Go to your Supabase project dashboard
2. Navigate to **Project Settings** → **Edge Functions**
3. Click on **Secrets** tab
4. Add new secret:
   - Name: `RESEND_API_KEY`
   - Value: `re_your_api_key_here`
5. Click **Save**

#### Option B: Supabase CLI
```bash
# Make sure you're in your project directory
cd /path/to/qcscargo

# Set the secret
supabase secrets set RESEND_API_KEY=re_your_api_key_here

# Verify it's set
supabase secrets list
```

### 5. Test Email Delivery

After configuration, test the system:

1. Go to shipping calculator: `https://qcs-cargo.com/shipping-calculator`
2. Calculate a rate
3. Click "Email my QCS Cargo quote"
4. Fill in the form
5. Submit

**Expected Results:**
- ✅ Success message: "Quote saved successfully. Email delivery pending." → "Quote request saved and emailed successfully."
- ✅ Customer receives email with PDF attachment
- ✅ Quote appears on customer dashboard
- ✅ Quote appears in admin quote management

### 6. Monitor Email Delivery

#### Resend Dashboard
- View sent emails in **Logs** section
- Check delivery status, opens, clicks
- Review bounce/complaint reports

#### Supabase Edge Function Logs
```bash
# View logs for quote-request function
supabase functions logs quote-request --tail
```

## Troubleshooting

### Emails Not Sending
1. **Check API Key**: Verify `RESEND_API_KEY` is set correctly
   ```bash
   supabase secrets list
   ```

2. **Check Domain Verification**: Ensure domain is verified in Resend dashboard

3. **Review Function Logs**:
   ```bash
   supabase functions logs quote-request
   ```

4. **Test API Key Directly**:
   ```bash
   curl -X POST 'https://api.resend.com/emails' \
     -H 'Authorization: Bearer re_your_api_key' \
     -H 'Content-Type: application/json' \
     -d '{
       "from": "QCS Cargo <quotes@qcs-cargo.com>",
       "to": "test@example.com",
       "subject": "Test Email",
       "html": "<p>Test</p>"
     }'
   ```

### Common Errors

**"Resend API key not configured"**
- API key is missing from environment variables
- Solution: Add `RESEND_API_KEY` to Supabase secrets

**"Email delivery pending"**
- API key is not set
- API key is invalid
- Domain not verified (can only send to verified addresses)

**"Failed to send quote email: 403"**
- API key doesn't have permission
- Domain not verified
- Solution: Verify domain in Resend dashboard

## Email Configuration

The system uses these email settings (defined in `quote-utils.ts`):

- **From**: `QCS Cargo <quotes@qcs-cargo.com>`
- **Reply-To**: `quotes@qcs-cargo.com`
- **Subject**: `Your QCS Cargo Quote {QUOTE_REFERENCE}`
- **Attachments**: PDF quotation document

## Cost Estimates

### Resend Pricing (as of 2024)
- **Free Tier**: 100 emails/day, 3,000/month
- **Pro Tier**: $20/month for 50,000 emails
- **Enterprise**: Custom pricing

For QCS Cargo's expected volume:
- Estimated 10-30 quotes/day = 300-900/month
- **Recommendation**: Free tier is sufficient initially
- Upgrade to Pro if exceeding 100 quotes/day

## Security Best Practices

1. **Never commit API keys** to version control
2. **Use Supabase Secrets** for production keys
3. **Rotate keys regularly** (every 90 days)
4. **Monitor usage** in Resend dashboard
5. **Set up alerts** for unusual activity
6. **Use separate keys** for development/production

## Support

- **Resend Documentation**: https://resend.com/docs
- **Resend Support**: support@resend.com
- **Supabase Secrets**: https://supabase.com/docs/guides/cli/managing-config#secrets