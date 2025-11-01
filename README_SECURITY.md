# Security Best Practices for QCS Cargo

## 🔒 Secrets Management

**NEVER commit API keys, tokens, or credentials to Git!**

### Current Secret Status

All production secrets are stored securely in **Supabase Secrets**:
- ✅ Resend API Key (Email service)
- ✅ Twilio Account SID & Auth Token (WhatsApp service)
- ✅ Twilio WhatsApp From number

### If You Need to Add a New Secret

1. **Get the secret value** from the service dashboard
2. **Set in Supabase Secrets:**
   ```bash
   supabase secrets set NEW_SECRET_NAME=your_secret_value
   ```
3. **Use in Edge Functions:**
   ```typescript
   const secret = Deno.env.get('NEW_SECRET_NAME')
   ```
4. **Document with placeholders only:**
   ```markdown
   Set via: `supabase secrets set NEW_SECRET_NAME=your_value_here`
   ```

### Documentation Rules

✅ **DO:**
- Use placeholders: `re_*`, `AC*`, `your_key_here`
- Refer to Supabase Secrets: "Configured in Supabase secrets"
- Use examples without real values

❌ **DON'T:**
- Never include real API keys in documentation
- Never hardcode secrets in source code
- Never commit `.env.local` or files with real values

## 🛡️ Git Protection

### Pre-commit Hook

A pre-commit hook is available to prevent committing secrets:
```bash
# Install the hook
cp .githooks/pre-commit .git/hooks/pre-commit
chmod +x .git/hooks/pre-commit
```

This will automatically scan for common secret patterns before each commit.

### .gitignore Protection

The `.gitignore` includes patterns to prevent committing:
- API keys (`re_*`, `AC*`)
- Environment files (`.env*`)
- Secret patterns (`*SECRET*`, `*API_KEY*`)

## 🚨 If Secrets Are Exposed

1. **Rotate immediately** in the service dashboard
2. **Update Supabase Secrets** with new values
3. **Redeploy Edge Functions**
4. **Remove from Git history** if needed (see `SECRETS_CLEANUP_SUMMARY.md`)

## 📚 Documentation

- `SECRETS_MANAGEMENT.md` - Complete guide for managing secrets
- `SECRETS_CLEANUP_SUMMARY.md` - Security cleanup status
- `.env.example` - Template for environment variables

---

**Remember:** When in doubt, rotate! 🔒

