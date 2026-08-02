#!/bin/bash

# BoostBuddy MVP - Update Existing Deployment Script
# For updating an existing project with new features

set -e

echo "🚀 BoostBuddy MVP - Deployment Update"
echo "======================================"
echo ""

# Check git status
echo "📋 Checking git status..."
CHANGED_FILES=$(git status --short | wc -l | tr -d ' ')
echo "Found $CHANGED_FILES changed files"

if [ "$CHANGED_FILES" -eq 0 ]; then
    echo "✓ No uncommitted changes"
else
    echo "⚠️  You have uncommitted changes"
    echo ""
    read -p "Commit changes now? (y/n): " commit_now

    if [ "$commit_now" = "y" ]; then
        echo "Please provide a commit message:"
        read -p "> " commit_message

        if [ -z "$commit_message" ]; then
            commit_message="feat: update application with new features"
        fi

        git add .
        git commit -m "$commit_message"
        echo "✓ Changes committed"
    else
        echo "⚠️  Proceeding with uncommitted changes"
    fi
fi

echo ""

# Test build locally
echo "🔨 Testing local build..."
read -p "Run local build test? (recommended) (y/n): " test_build

if [ "$test_build" = "y" ]; then
    echo "Building..."
    if npm run build; then
        echo "✓ Build successful"
    else
        echo "❌ Build failed. Please fix errors before deploying."
        exit 1
    fi
else
    echo "⚠️  Skipping build test"
fi

echo ""

# Check Vercel environment
echo "🔍 Checking Vercel environment..."
if vercel whoami > /dev/null 2>&1; then
    echo "✓ Authenticated with Vercel"
else
    echo "❌ Not authenticated with Vercel"
    echo "Run: vercel login"
    exit 1
fi

echo ""

# Check environment variables
echo "🔍 Checking environment variables..."
ENV_COUNT=$(vercel env ls 2>&1 | grep -c " production" || echo "0")

if [ "$ENV_COUNT" -eq 0 ]; then
    echo "⚠️  No production environment variables found"
    echo ""
    echo "You need to add your production credentials:"
    echo "  vercel env add DATABASE_URL production"
    echo "  vercel env add NEXT_PUBLIC_SUPABASE_URL production"
    echo "  vercel env add SUPABASE_SERVICE_ROLE_KEY production"
    echo "  vercel env add NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY production"
    echo "  vercel env add STRIPE_SECRET_KEY production"
    echo "  vercel env add STRIPE_WEBHOOK_SECRET production"
    echo "  vercel env add NEXT_PUBLIC_SITE_URL production"
    echo ""
    read -p "Add environment variables now? (y/n): " add_env

    if [ "$add_env" = "y" ]; then
        ./scripts/setup-env.sh
    else
        echo "⚠️  Proceeding without environment variables"
    fi
else
    echo "✓ Found $ENV_COUNT environment variables"
fi

echo ""

# Deploy to preview first
echo "🚀 Deploying to preview environment..."
read -p "Deploy to preview first? (recommended) (y/n): " preview_deploy

if [ "$preview_deploy" = "y" ]; then
    echo "Deploying to preview..."
    vercel

    echo ""
    echo "✓ Preview deployed"
    echo "Test your preview URL before deploying to production"
    echo ""
    read -p "Continue to production deployment? (y/n): " prod_deploy

    if [ "$prod_deploy" != "y" ]; then
        echo "Deployment stopped. Test preview URL and run again."
        exit 0
    fi
fi

echo ""

# Deploy to production
echo "🚀 Deploying to production..."
read -p "Deploy to production? (y/n): " prod_confirm

if [ "$prod_confirm" = "y" ]; then
    echo "Deploying..."
    vercel --prod

    echo ""
    echo "✓ Production deployment complete!"
    echo ""
    echo "📋 Next Steps:"
    echo "  1. Test your deployment: https://boostbuddy.it"
    echo "  2. Check Vercel logs: vercel logs"
    echo "  3. Monitor Supabase logs"
    echo "  4. Test payment flow with small amount"
    echo ""
    echo "🔧 Quick Commands:"
    echo "  vercel logs              # View deployment logs"
    echo "  vercel ls                # List deployments"
    echo "  vercel rollback          # Rollback if needed"
else
    echo "Production deployment cancelled"
fi

echo ""
echo "✓ Deployment process complete"
