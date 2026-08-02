#!/bin/bash

# BoostBuddy MVP - Deployment Checklist Script
# This script checks if you're ready for production deployment

set -e

echo "🚀 BoostBuddy MVP - Pre-Deployment Checklist"
echo "============================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check_pass() {
    echo -e "${GREEN}✓${NC} $1"
}

check_fail() {
    echo -e "${RED}✗${NC} $1"
}

check_warn() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# 1. Check if git is clean
echo "📋 Checking git status..."
if [ -z "$(git status --porcelain)" ]; then
    check_pass "Working directory is clean"
else
    check_fail "You have uncommitted changes"
    echo "   Please commit or stash your changes first"
    exit 1
fi

# 2. Check if production environment template exists
echo ""
echo "📋 Checking environment setup..."
if [ -f ".env.production.template" ]; then
    check_pass "Production environment template exists"
else
    check_fail "Production environment template missing"
fi

# 3. Check if dependencies are installed
echo ""
echo "📋 Checking dependencies..."
if [ -d "node_modules" ]; then
    check_pass "Dependencies are installed"
else
    check_warn "Dependencies not installed"
    echo "   Run: npm install"
fi

# 4. Check Prisma schema
echo ""
echo "📋 Checking Prisma setup..."
if grep -q "provider = \"postgresql\"" prisma/schema.prisma; then
    check_pass "Prisma schema configured for PostgreSQL"
else
    check_fail "Prisma schema not configured for PostgreSQL"
    echo "   Update prisma/schema.prisma datasource provider"
fi

# 5. Check vercel.json
echo ""
echo "📋 Checking Vercel configuration..."
if [ -f "vercel.json" ]; then
    check_pass "Vercel configuration exists"
else
    check_fail "vercel.json is missing"
fi

# 6. Check for hardcoded secrets
echo ""
echo "📋 Checking for hardcoded secrets..."
SECRETS_FOUND=0

# Check for common secret patterns
if grep -r "sk_test_" app/ lib/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
    check_fail "Found test Stripe keys in code"
    SECRETS_FOUND=1
fi

if grep -r "sk_live_" app/ lib/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
    check_fail "Found live Stripe keys in code"
    SECRETS_FOUND=1
fi

if grep -r "sb_secret_" app/ lib/ --include="*.ts" --include="*.tsx" --include="*.js" --include="*.jsx" > /dev/null 2>&1; then
    check_fail "Found Supabase service keys in code"
    SECRETS_FOUND=1
fi

if [ $SECRETS_FOUND -eq 0 ]; then
    check_pass "No hardcoded secrets found in source code"
fi

# 7. Check .gitignore
echo ""
echo "📋 Checking .gitignore..."
if grep -q ".env.local" .gitignore && grep -q ".env.production" .gitignore; then
    check_pass "Environment files are in .gitignore"
else
    check_warn "Make sure .env files are in .gitignore"
fi

# 8. Test build
echo ""
echo "📋 Testing production build..."
echo "   Running: npm run build"
if npm run build > /tmp/boostbuddy-build.log 2>&1; then
    check_pass "Production build successful"
else
    check_fail "Production build failed"
    echo "   Check /tmp/boostbuddy-build.log for details"
    exit 1
fi

# Summary
echo ""
echo "============================================"
echo -e "${GREEN}✓ Pre-deployment checks passed!${NC}"
echo ""
echo "📝 Next Steps:"
echo "   1. Copy .env.production.template and fill in production values"
echo "   2. Add environment variables to Vercel Dashboard"
echo "   3. Deploy: vercel --prod"
echo "   4. Set up Stripe webhook in production"
echo "   5. Test deployment thoroughly"
echo ""
echo "📚 For detailed instructions, see DEPLOYMENT_GUIDE.md"
echo ""
