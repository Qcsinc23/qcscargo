#!/bin/bash

# QCS Cargo - Vercel Deployment Script
# This script handles the complete deployment process

set -e  # Exit on any error

echo "🚀 Starting QCS Cargo Deployment Process..."

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check if required files exist
print_status "Checking project structure..."

if [ ! -f "package.json" ]; then
    print_error "package.json not found!"
    exit 1
fi

if [ ! -f ".env.local" ]; then
    print_warning ".env.local not found. Make sure to set up environment variables!"
    print_status "You can copy .env.example to .env.local and fill in your values"
fi

# Install dependencies
print_status "Installing dependencies with pnpm..."
if command -v pnpm &> /dev/null; then
    pnpm install
else
    print_warning "pnpm not found, using npm instead..."
    npm install
fi

# Run linting
print_status "Running linter..."
if command -v pnpm &> /dev/null; then
    pnpm run lint
else
    npm run lint
fi

# Build the project
print_status "Building project for production..."
if command -v pnpm &> /dev/null; then
    pnpm run build:prod
else
    npm run build:prod
fi

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    print_error "Vercel CLI not found!"
    print_status "Installing Vercel CLI globally..."
    npm install -g vercel
fi

# Deploy to Vercel
print_status "Deploying to Vercel..."
vercel --prod

print_success "Deployment completed successfully! 🎉"
print_status "Your application should now be live on Vercel."