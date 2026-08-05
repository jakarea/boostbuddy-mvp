#!/bin/bash

# ============================================================================
# Supabase Migration Deployment Script
# BoostBuddy MVP - Apply database migrations to production
# ============================================================================

set -e  # Exit on error

echo "🚀 BoostBuddy MVP - Supabase Migration Deployment"
echo "════════════════════════════════════════════════════════════"
echo ""

# Check if Supabase CLI is installed
if ! command -v supabase &> /dev/null; then
    echo "❌ Supabase CLI not found!"
    echo ""
    echo "Please install it first:"
    echo "  npm install -g supabase"
    echo ""
    echo "Or run the migration manually in Supabase Dashboard:"
    echo "  1. Go to https://supabase.com/dashboard"
    echo "  2. Select your project"
    echo "  3. Navigate to SQL Editor"
    echo "  4. Copy the contents of supabase-combined-migration.sql"
    echo "  5. Click 'Run' to execute"
    exit 1
fi

# Check if user is logged in
echo "🔐 Checking Supabase authentication..."
if ! supabase projects list &> /dev/null; then
    echo "❌ Not logged in to Supabase!"
    echo ""
    echo "Please login first:"
    echo "  supabase login"
    exit 1
fi

echo "✅ Supabase CLI authenticated"
echo ""

# Get list of projects
echo "📋 Available Supabase projects:"
supabase projects list
echo ""

# Ask user to select project (if multiple)
PROJECTS=$(supabase projects list --json)
PROJECT_COUNT=$(echo "$PROJECTS" | grep -o '"id"' | wc -l)

if [ "$PROJECT_COUNT" -gt 1 ]; then
    echo "⚠️  Multiple projects found. Please ensure your SUPABASE_PROJECT_ID env var is set."
    echo "   Or manually run the SQL in Supabase Dashboard."
else
    PROJECT_ID=$(echo "$PROJECTS" | grep -o '"id":"[^"]*' | cut -d'"' -f4)
    if [ -n "$PROJECT_ID" ]; then
        echo "📍 Found project: $PROJECT_ID"
    fi
fi

echo ""
echo "📝 Migration Options:"
echo "════════════════════════════════════════════════════════════"
echo ""
echo "1️⃣  Automatic (using Supabase CLI)"
echo "2️⃣  Manual (via Supabase Dashboard)"
echo ""
read -p "Choose migration method (1 or 2): " choice

case $choice in
  1)
    echo "🤖 Applying migration via Supabase CLI..."
    echo ""

    # Set project if available
    if [ -n "$PROJECT_ID" ]; then
        export SUPABASE_PROJECT_ID="$PROJECT_ID"
    fi

    # Check if project ref is set
    if [ -z "$SUPABASE_PROJECT_ID" ] && [ -n "$SUPABASE_PROJECT_REF" ]; then
        export SUPABASE_PROJECT_ID="$SUPABASE_PROJECT_REF"
    fi

    # Try to apply migration
    if [ -n "$SUPABASE_PROJECT_ID" ]; then
        echo "📍 Applying to project: $SUPABASE_PROJECT_ID"
        echo ""

        # Read the migration SQL
        MIGRATION_SQL=$(cat supabase-combined-migration.sql)

        # Apply via db execute (if available)
        if supabase db execute "$MIGRATION_SQL" 2>/dev/null; then
            echo "✅ Migration applied successfully!"
        else
            echo "⚠️  CLI method not fully supported."
            echo "📋 Falling back to manual method..."
            echo ""
            echo "📋 Copy this SQL and run it in Supabase Dashboard:"
            echo "════════════════════════════════════════════════════════════"
            echo "$MIGRATION_SQL"
            echo "════════════════════════════════════════════════════════════"
        fi
    else
        echo "❌ Could not determine project ID."
        echo "Please use manual method (Option 2)."
    fi
    ;;

  2)
    echo "📋 Manual Migration Instructions:"
    echo ""
    echo "1. Go to https://supabase.com/dashboard"
    echo "2. Select your BoostBuddy project"
    echo "3. Navigate to SQL Editor (left sidebar → SQL icon)"
    echo "4. Copy the entire contents of: supabase-combined-migration.sql"
    echo "5. Paste into SQL Editor"
    echo "6. Click 'Run' or press Ctrl+Enter to execute"
    echo ""
    echo "✅ After execution, you should see success messages"
    echo ""
    echo "To verify the migration worked, run this query:"
    echo "SELECT preferred_language, COUNT(*) FROM users GROUP BY preferred_language;"
    ;;

  *)
    echo "❌ Invalid choice. Exiting."
    exit 1
    ;;
esac

echo ""
echo "🎉 Migration process completed!"
echo ""
echo "📚 Next Steps:"
echo "  1. Verify columns were added"
echo "  2. Test language preference in app"
echo "  3. Send multilingual notifications"
echo ""
echo "For detailed guide, see: SUPABASE-MIGRATION-GUIDE.md"