# Environment Variables & Credential Management

This document explains how to securely manage API keys, database credentials, and other sensitive information in this project.

## 🔐 Security Overview

Your credentials are now stored securely using environment variables. Here's what we've set up:

### Files Created:
- `.env.local` - Your actual credentials (NEVER commit this!)
- `.env.example` - Template file showing what variables are needed
- Updated `src/lib/supabase.ts` - Now uses environment variables instead of hardcoded values

## 📁 Environment Files

### `.env.local` (Your Secret File)
- Contains your actual API keys and credentials
- Automatically ignored by Git (listed in `.gitignore`)
- Only exists on your local machine
- **NEVER commit this file to version control**

### `.env.example` (Template File)
- Shows what environment variables are needed
- Safe to commit to version control
- Helps team members know what credentials they need
- Copy this file to create your own `.env.local`

## 🚀 How to Use Environment Variables

### In Vite/React (Client-side):
```typescript
// Use VITE_ prefix for client-side variables
const apiUrl = import.meta.env.VITE_SUPABASE_URL
const apiKey = import.meta.env.VITE_SUPABASE_ANON_KEY
```

### In Node.js/Server-side:
```typescript
// No prefix needed for server-side variables
const secretKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const dbUrl = process.env.DATABASE_URL
```

## ⚠️ Important Security Rules

### ✅ DO:
- Use `VITE_` prefix for variables that need to be accessible in the browser
- Keep service role keys and secrets server-side only (no `VITE_` prefix)
- Use `.env.local` for local development
- Use your hosting platform's environment variable settings for production
- Regularly rotate your API keys
- Use different credentials for development, staging, and production

### ❌ DON'T:
- Never commit `.env.local` or any file with actual credentials
- Never put service role keys in client-side code (no `VITE_` prefix)
- Never hardcode credentials directly in your source code
- Never share credentials in chat, email, or documentation

## 🔑 Types of Supabase Keys

### Anon Key (Public)
- Safe to use in client-side code
- Has limited permissions based on your RLS policies
- Use with `VITE_` prefix: `VITE_SUPABASE_ANON_KEY`

### Service Role Key (Secret)
- Full database access - VERY DANGEROUS if exposed
- Only use in server-side functions or secure environments
- Never use with `VITE_` prefix: `SUPABASE_SERVICE_ROLE_KEY`

## 🌍 Environment-Specific Setup

### Local Development
1. Copy `.env.example` to `.env.local`
2. Fill in your actual values
3. Restart your development server

### Production Deployment
1. Set environment variables in your hosting platform:
   - Vercel: Project Settings → Environment Variables
   - Netlify: Site Settings → Environment Variables
   - Railway: Variables tab
   - Heroku: Config Vars

## 🔄 Adding New Credentials

When you need to add new API keys:

1. Add them to `.env.example` with placeholder values:
   ```bash
   # New API Service
   VITE_NEW_API_KEY=your_api_key_here
   ```

2. Add the actual value to `.env.local`:
   ```bash
   VITE_NEW_API_KEY=actual_key_value_here
   ```

3. Use in your code:
   ```typescript
   const apiKey = import.meta.env.VITE_NEW_API_KEY
   ```

## 🛠️ Troubleshooting

### "Missing environment variables" error:
- Check that `.env.local` exists and has the required variables
- Restart your development server after adding new variables
- Ensure variable names match exactly (case-sensitive)

### Variables not loading:
- Client-side variables must have `VITE_` prefix
- Restart development server after changes
- Check for typos in variable names

### Production issues:
- Verify environment variables are set in your hosting platform
- Check that variable names match between local and production
- Ensure no trailing spaces in variable values

## 📚 Additional Resources

- [Vite Environment Variables Guide](https://vitejs.dev/guide/env-and-mode.html)
- [Supabase API Keys Documentation](https://supabase.com/docs/guides/api/api-keys)
- [Environment Variables Best Practices](https://12factor.net/config)

## 🆘 Emergency: Credentials Compromised

If you accidentally commit credentials:

1. **Immediately rotate/regenerate** the compromised keys in your Supabase dashboard
2. Update `.env.local` with new credentials
3. Remove credentials from Git history (contact your team lead)
4. Update production environment variables
5. Review access logs for any unauthorized usage

Remember: It's better to be safe and rotate keys if you're unsure!
