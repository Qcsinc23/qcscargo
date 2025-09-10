# 🚀 QCS Cargo - Vercel Deployment Guide

This guide provides all the commands needed to set up and deploy the QCS Cargo project to Vercel.

## 📋 Prerequisites

Before deploying, ensure you have:
- Node.js (v18 or higher)
- pnpm (preferred) or npm
- Vercel CLI
- Supabase project set up
- Environment variables configured

## 🔧 Quick Setup Commands

### 1. Install Dependencies
```bash
# Using pnpm (recommended)
pnpm install

# Or using npm
npm install
```

### 2. Install Vercel CLI (if not already installed)
```bash
npm install -g vercel
```

### 3. Set Up Environment Variables
```bash
# Copy the example file
cp .env.example .env.local

# Edit .env.local with your actual Supabase credentials
# Required variables:
# - VITE_SUPABASE_URL
# - VITE_SUPABASE_ANON_KEY
```

### 4. Build and Test Locally
```bash
# Run development server
pnpm run dev

# Build for production
pnpm run build:prod

# Preview production build
pnpm run preview
```

## 🚀 Deployment Commands

### Option 1: Use the Automated Script
```bash
# Run the deployment script
./deploy.sh
```

### Option 2: Manual Deployment
```bash
# 1. Install dependencies
pnpm install

# 2. Run linting
pnpm run lint

# 3. Build for production
pnpm run build:prod

# 4. Deploy to Vercel
vercel --prod
```

### Option 3: Quick Redeploy
```bash
# If already configured, just redeploy
vercel --prod
```

## 🔄 Restart/Redeploy Process

To restart your Vercel deployment:

### 1. Clean and Rebuild
```bash
# Clean build cache
rm -rf dist node_modules/.vite-temp

# Reinstall dependencies
pnpm install

# Build fresh
pnpm run build:prod
```

### 2. Force Redeploy
```bash
# Deploy with force flag
vercel --prod --force
```

### 3. Complete Reset
```bash
# Remove Vercel configuration
rm -rf .vercel

# Reconfigure and deploy
vercel --prod
```

## ⚙️ Vercel Configuration

The project includes a [`vercel.json`](vercel.json) file with optimized settings:
- Build command: `pnpm run build:prod`
- Output directory: `dist`
- SPA routing support
- Asset caching headers
- Edge function support for Supabase functions

## 🌍 Environment Variables in Vercel

Set these in your Vercel dashboard (Project Settings → Environment Variables):

### Required Variables:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_ANON_KEY` - Your Supabase anon key

### Optional Variables:
- `SUPABASE_SERVICE_ROLE_KEY` - For server-side functions
- `DATABASE_URL` - Direct database connection
- `SUPABASE_JWT_SECRET` - JWT verification

## 🔍 Troubleshooting

### Build Failures
```bash
# Clear all caches
rm -rf node_modules dist .vercel
pnpm install
pnpm run build:prod
```

### Environment Variable Issues
1. Check variable names match exactly (case-sensitive)
2. Ensure `VITE_` prefix for client-side variables
3. Restart deployment after adding variables

### Deployment Stuck
```bash
# Cancel current deployment
vercel cancel

# Start fresh deployment
vercel --prod
```

## 📊 Project Structure

```
qcscargo/
├── src/                    # React application source
├── supabase/              # Supabase configuration and functions
├── public/                # Static assets
├── dist/                  # Build output (auto-generated)
├── vercel.json           # Vercel configuration
├── deploy.sh             # Automated deployment script
├── .env.local            # Local environment variables
└── .env.example          # Environment template
```

## 🎯 Deployment Checklist

- [ ] Dependencies installed (`pnpm install`)
- [ ] Environment variables set (`.env.local` and Vercel dashboard)
- [ ] Build passes locally (`pnpm run build:prod`)
- [ ] Linting passes (`pnpm run lint`)
- [ ] Supabase project configured
- [ ] Vercel CLI installed and authenticated
- [ ] Domain configured (if custom domain)

## 🔗 Useful Commands

```bash
# Check Vercel status
vercel ls

# View deployment logs
vercel logs

# Open deployed site
vercel open

# Check build locally
pnpm run preview

# Run development server
pnpm run dev
```

## 📞 Support

If you encounter issues:
1. Check the build logs in Vercel dashboard
2. Verify environment variables are set correctly
3. Ensure Supabase project is accessible
4. Check network connectivity and permissions

---

**Last Updated:** January 2025
**Project:** QCS Cargo Shipping Platform
**Framework:** React + Vite + TypeScript + Supabase