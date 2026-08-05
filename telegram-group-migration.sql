-- ============================================================================
-- TELEGRAM GROUP CONFIGURATIONS - Database Migration
-- BoostBuddy MVP - Employee/Team Group Messaging System
-- ============================================================================

-- This migration creates the telegram_group_configs table for team-based notifications
-- Run this in Supabase SQL Editor

-- ============================================================================
-- PART 1: Create telegram_group_configs table
-- ============================================================================

-- Create the main table
CREATE TABLE IF NOT EXISTS telegram_group_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,
  group_chat_id TEXT NOT NULL UNIQUE,
  group_type TEXT NOT NULL CHECK (group_type IN ('ADMIN', 'EMPLOYEE', 'CLIENT_SUPPORT', 'BILLING')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================================
-- PART 2: Create indexes for efficient queries
-- ============================================================================

-- Index for group type and active status lookups
CREATE INDEX IF NOT EXISTS idx_group_configs_type_active
ON telegram_group_configs(group_type, is_active);

-- Index for active group lookups
CREATE INDEX IF NOT EXISTS idx_group_configs_active
ON telegram_group_configs(is_active);

-- Index for group type lookups
CREATE INDEX IF NOT EXISTS idx_group_configs_type
ON telegram_group_configs(group_type);

-- ============================================================================
-- PART 3: Enable Row Level Security (RLS)
-- ============================================================================

ALTER TABLE telegram_group_configs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PART 4: Create RLS policies
-- ============================================================================

-- Admins can manage all group configurations
CREATE POLICY "Admins can manage telegram group configs"
  ON telegram_group_configs FOR ALL
  USING (public.is_admin());

-- Anyone (including employees/clients) can view active group configs
-- This allows employees to know which groups they should join
CREATE POLICY "Anyone can view active telegram group configs"
  ON telegram_group_configs FOR SELECT
  USING (is_active = true);

-- ============================================================================
-- PART 5: Add documentation comments
-- ============================================================================

COMMENT ON TABLE telegram_group_configs IS 'Telegram group configurations for team-based notifications instead of individual messaging';

COMMENT ON COLUMN telegram_group_configs.group_name IS 'Human-readable name for the group (e.g., "BoostBuddy Employees", "Admin Team")';

COMMENT ON COLUMN telegram_group_configs.group_chat_id IS 'Telegram group Chat ID (negative number for groups, e.g., -1001234567890). Get this by adding @GetMyId bot to your group.';

COMMENT ON COLUMN telegram_group_configs.group_type IS 'Type of team/group: ADMIN (admin team), EMPLOYEE (all employees), CLIENT_SUPPORT (support team), BILLING (billing team)';

COMMENT ON COLUMN telegram_group_configs.is_active IS 'Whether this group is currently active for notifications. Inactive groups are automatically disabled if they become inaccessible.';

-- ============================================================================
-- PART 6: Create trigger for updated_at timestamp
-- ============================================================================

-- Create or replace function to update timestamp
CREATE OR REPLACE FUNCTION update_telegram_group_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger
DROP TRIGGER IF EXISTS update_telegram_groups_updated_at ON telegram_group_configs;
CREATE TRIGGER update_telegram_groups_updated_at
  BEFORE UPDATE ON telegram_group_configs
  FOR EACH ROW
  EXECUTE FUNCTION update_telegram_group_updated_at();

-- ============================================================================
-- PART 7: Verification queries
-- ============================================================================

-- Verify table creation
DO $$
BEGIN
  RAISE NOTICE '=== TELEGRAM GROUP CONFIGS VERIFICATION ===';

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'telegram_group_configs'
  ) THEN
    RAISE NOTICE '✅ telegram_group_configs table exists';
  ELSE
    RAISE NOTICE '❌ telegram_group_configs table missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_group_configs_type_active'
  ) THEN
    RAISE NOTICE '✅ idx_group_configs_type_active index exists';
  ELSE
    RAISE NOTICE '❌ idx_group_configs_type_active index missing';
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_group_configs_active'
  ) THEN
    RAISE NOTICE '✅ idx_group_configs_active index exists';
  ELSE
    RAISE NOTICE '❌ idx_group_configs_active index missing';
  END IF;
END $$;

-- Show RLS status
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'telegram_group_configs';

-- ============================================================================
-- PART 8: Example data (commented out - uncomment for testing)
-- ============================================================================

/*
-- Example: Insert test group configurations
INSERT INTO telegram_group_configs (group_name, group_chat_id, group_type) VALUES
('BoostBuddy Admin Team', '-1001234567890', 'ADMIN'),
('BoostBuddy Employees', '-1009876543210', 'EMPLOYEE'),
('Client Support Team', '-1005555555555', 'CLIENT_SUPPORT')
ON CONFLICT (group_chat_id) DO NOTHING;
*/

-- ============================================================================
-- PART 9: Usage instructions
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ TELEGRAM GROUP CONFIGURATIONS MIGRATION COMPLETED!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '  1. Create Telegram groups for your teams (Admin, Employees, etc.)';
  RAISE NOTICE '  2. Add your bot to each group with send message permissions';
  RAISE NOTICE '  3. Get group Chat IDs using @GetMyId bot (negative numbers)';
  RAISE NOTICE '  4. Configure groups in Admin Panel → Telegram Groups';
  RAISE NOTICE '  5. Test each group configuration';
  RAISE NOTICE '';
  RAISE NOTICE 'Benefits:';
  RAISE NOTICE '  ✅ One message reaches entire team instantly';
  RAISE NOTICE '  ✅ No need to manage individual employee Chat IDs';
  RAISE NOTICE '  ✅ Better team coordination and awareness';
  RAISE NOTICE '  ✅ Reduced API calls and rate limit concerns';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;