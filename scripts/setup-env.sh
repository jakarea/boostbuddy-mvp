#!/bin/bash

# BoostBuddy MVP - Environment Variable Setup Script
# This script helps you add environment variables to Vercel

set -e

echo "🚀 BoostBuddy MVP - Environment Variable Setup"
echo "================================================"
echo ""
echo "This script will help you add environment variables to your Vercel project."
echo "Please have your credentials ready before starting."
echo ""

# Check if user is authenticated
if ! vercel whoami > /dev/null 2>&1; then
    echo "❌ You're not authenticated with Vercel. Please run: vercel login"
    exit 1
fi

echo "✓ Authenticated with Vercel"
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to add environment variable
add_env_var() {
    local var_name=$1
    local description=$2
    local default_value=$3

    echo -e "${YELLOW}Setting: $var_name${NC}"
    echo "Description: $description"

    if [ -n "$default_value" ]; then
        echo "Default value available (from .env.local)"
        read -p "Use default value? (y/n): " use_default

        if [ "$use_default" = "y" ]; then
            value="$default_value"
        else
            read -p "Enter value: " value
        fi
    else
        read -p "Enter value: " value
    fi

    if [ -n "$value" ]; then
        vercel env add "$var_name" production <<< "$value"
        echo -e "${GREEN}✓ Added $var_name${NC}"
    else
        echo "⚠️  Skipped $var_name (no value provided)"
    fi
    echo ""
}

# Get current values from .env.local if it exists
if [ -f ".env.local" ]; then
    echo "Found .env.local - will use as defaults where applicable"
    eval "$(grep -v '^#' .env.local | grep '=' | export -p)"
fi

# Database Configuration
echo "📊 Step 1: Database Configuration"
echo "=================================="
echo "Your Supabase project URL: https://ugwjvpzwaqnghrbeuput.supabase.co"
echo ""
echo "Please get your connection string from:"
echo "Supabase Dashboard → Settings → Database → Connection String → URI"
echo "IMPORTANT: Use Session pooler (port 6543)"
echo ""

add_env_var "DATABASE_URL" "Supabase PostgreSQL connection string" ""

# Supabase Configuration
echo "🔐 Step 2: Supabase Configuration"
echo "=================================="
echo "Please get your API keys from:"
echo "Supabase Dashboard → Settings → API"
echo ""

add_env_var "NEXT_PUBLIC_SUPABASE_URL" "Supabase project URL" "${NEXT_PUBLIC_SUPABASE_URL:-}"
add_env_var "NEXT_PUBLIC_SUPABASE_ANON_KEY" "Supabase public key" "${NEXT_PUBLIC_SUPABASE_ANON_KEY:-}"
add_env_var "SUPABASE_SERVICE_ROLE_KEY" "Supabase admin key (sensitive)" "${SUPABASE_SERVICE_ROLE_KEY:-}"

# Stripe Configuration
echo "💳 Step 3: Stripe Configuration"
echo "================================"
echo "Please get your PRODUCTION keys from:"
echo "Stripe Dashboard → Developers → API keys (switch to Live mode)"
echo ""

add_env_var "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY" "Stripe publishable key (pk_live_...)" "${NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:-}"
add_env_var "STRIPE_SECRET_KEY" "Stripe secret key (sk_live_...) - SENSITIVE" "${STRIPE_SECRET_KEY:-}"
add_env_var "STRIPE_WEBHOOK_SECRET" "Stripe webhook secret (whsec_...) - SENSITIVE" "${STRIPE_WEBHOOK_SECRET:-}"

# Site Configuration
echo "🌐 Step 4: Site Configuration"
echo "==============================="
echo "Your production domain: boostbuddy.it"
echo ""

add_env_var "NEXT_PUBLIC_SITE_URL" "Production site URL" "https://boostbuddy.it"

# Summary
echo "================================================"
echo -e "${GREEN}✓ Environment Variable Setup Complete!${NC}"
echo ""
echo "📋 Next Steps:"
echo "   1. Verify your environment variables:"
echo "      vercel env ls"
echo ""
echo "   2. Deploy to production:"
echo "      vercel --prod"
echo ""
echo "   3. Monitor deployment:"
echo "      vercel logs --follow"
echo ""
echo "⚠️  Important Notes:"
echo "   - Make sure to use PRODUCTION Stripe keys, not test keys"
echo "   - Set up Stripe webhook after first deployment"
echo "   - Test all functionality after deployment"
echo ""
echo "📚 For detailed instructions, see PRODUCTION_SETUP.md"
