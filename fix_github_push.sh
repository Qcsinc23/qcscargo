#!/bin/bash
# Script to fix GitHub push blocked by secret scanning

echo "🔒 GitHub Push Protection - Fixing Secrets in History"
echo "=================================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Check current branch
CURRENT_BRANCH=$(git branch --show-current)
echo "Current branch: ${GREEN}$CURRENT_BRANCH${NC}"
echo ""

# Option 1: Allow the push (if secrets rotated)
echo "${YELLOW}Option 1: Allow push (if secrets already rotated)${NC}"
echo "   Run: git push --set-upstream origin $CURRENT_BRANCH"
echo "   GitHub will prompt you to allowlist the secret"
echo ""

# Option 2: Create clean branch from current state
echo "${YELLOW}Option 2: Create clean branch from current state${NC}"
echo "   This creates a new branch with all fixes but rewrites history"
echo ""

read -p "Choose option (1 or 2): " option

if [ "$option" == "1" ]; then
    echo ""
    echo "${GREEN}Attempting push with GitHub allowlist...${NC}"
    git push --set-upstream origin "$CURRENT_BRANCH"
    echo ""
    echo "If blocked, GitHub will provide a URL to allowlist the secret."
    echo "Go to that URL, confirm the secret is rotated, then push again."
    
elif [ "$option" == "2" ]; then
    echo ""
    echo "${GREEN}Creating clean branch...${NC}"
    
    # Get the base (main)
    git fetch origin main
    
    # Create new clean branch from main
    CLEAN_BRANCH="${CURRENT_BRANCH}-clean"
    echo "Creating branch: $CLEAN_BRANCH"
    
    git checkout origin/main
    git checkout -b "$CLEAN_BRANCH"
    
    # Cherry-pick only the latest commit (which is clean)
    echo "Cherry-picking clean commits..."
    git cherry-pick da10039 2>/dev/null || echo "Commit da10039 already included"
    
    # Add current clean files
    git checkout "$CURRENT_BRANCH" -- .
    
    # Check for any secrets (using pattern matching, not actual secrets)
    if grep -rE "(AC[a-zA-Z0-9]{32}|re_[A-Za-z0-9_-]{20,})" . 2>/dev/null | grep -v ".git" | grep -v "node_modules" | grep -v "^\./" | grep -v "example\|placeholder\|your_"; then
        echo "${RED}⚠️  WARNING: Secrets still found in files!${NC}"
        exit 1
    fi
    
    # Commit
    git add -A
    git commit -m "security: Remove secrets from documentation and add protection mechanisms"
    
    echo ""
    echo "${GREEN}✅ Clean branch created: $CLEAN_BRANCH${NC}"
    echo ""
    echo "Push with:"
    echo "  git push --set-upstream origin $CLEAN_BRANCH"
    
    # Switch back to original branch
    git checkout "$CURRENT_BRANCH"
    
else
    echo "${RED}Invalid option${NC}"
    exit 1
fi

echo ""
echo "${GREEN}Done!${NC}"

