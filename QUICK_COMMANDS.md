# 🚀 QCS Cargo - Quick Command Reference

## 🔄 Restart Vercel Deployment

### Option 1: One-Line Restart
```bash
./deploy.sh
```

### Option 2: Manual Steps
```bash
# Clean and rebuild
rm -rf dist node_modules/.vite-temp
pnpm install
pnpm run build:prod
vercel --prod
```

### Option 3: Force Redeploy
```bash
vercel --prod --force
```

## 📊 Check Deployment Status
```bash
# List all deployments
vercel ls

# Open current deployment
vercel open

# View logs
vercel logs
```

## 🛠️ Development Commands
```bash
# Start development server
pnpm run dev

# Build for production
pnpm run build:prod

# Preview production build
pnpm run preview

# Run linting
pnpm run lint
```

## 🔧 Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your Supabase credentials
# Required: VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
```

## 🌐 Current Deployment
- **Production URL**: https://qcscargo-1syn1ffe8-quiet-craft-solutions.vercel.app
- **Status**: ✅ Ready
- **Last Deploy**: Just completed successfully

## 📋 Troubleshooting
```bash
# If deployment fails, try:
rm -rf .vercel
vercel --prod

# If build fails:
rm -rf node_modules dist
pnpm install
pnpm run build:prod
```

---
**Last Updated**: January 2025