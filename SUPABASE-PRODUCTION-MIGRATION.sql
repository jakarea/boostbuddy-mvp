-- ============================================================================
-- SUPABASE DATABASE MIGRATION - Apply All Schema Changes
-- Run this in Supabase Dashboard → Database → SQL Editor
-- This migration applies all changes made during comprehensive bug fixes
-- ============================================================================

-- ============================================================================
-- PART 1: NEW TABLES - Add Missing Production Tables
-- ============================================================================

-- 1. REVIEW CREDIT PRICING TABLE
-- Stores credit pricing configuration for different review order types
CREATE TABLE IF NOT EXISTS review_credit_pricing (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type TEXT NOT NULL UNIQUE, -- "REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"
  credits_per_unit INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default pricing data if table is empty
INSERT INTO review_credit_pricing (order_type, credits_per_unit)
VALUES
  ('REVIEW', 5),
  ('COMMENT', 3),
  ('COMMENT_WITH_PHOTO', 8)
ON CONFLICT (order_type) DO NOTHING;

-- Create indexes for review_credit_pricing
CREATE INDEX IF NOT EXISTS idx_review_credit_pricing_active ON review_credit_pricing(is_active);

-- 2. TELEGRAM GROUP CONFIGS TABLE
-- Stores Telegram group configuration for team notifications
CREATE TABLE IF NOT EXISTS telegram_group_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_name TEXT NOT NULL,
  group_chat_id TEXT NOT NULL,
  group_type TEXT NOT NULL, -- "ADMIN" or "EMPLOYEE"
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for telegram_group_configs
CREATE INDEX IF NOT EXISTS idx_telegram_group_configs_type ON telegram_group_configs(group_type);
CREATE INDEX IF NOT EXISTS idx_telegram_group_configs_active ON telegram_group_configs(is_active);

-- 3. APP SETTINGS TABLE
-- Stores application-wide settings as JSON
CREATE TABLE IF NOT EXISTS app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  value TEXT NOT NULL, -- JSON string for flexible settings
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add default app settings if table is empty
INSERT INTO app_settings (key, value)
VALUES
  ('telegram_bot', '{"bot_token": "", "admin_chat_id": ""}'),
  ('maintenance_mode', '{"enabled": false}')
ON CONFLICT (key) DO NOTHING;

-- 4. USER TELEGRAM CONFIGS TABLE
-- Stores personal Telegram chat IDs for users
CREATE TABLE IF NOT EXISTS user_telegram_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  chat_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  CONSTRAINT fk_user_telegram_user
    FOREIGN KEY (user_id)
    REFERENCES users(id)
    ON DELETE CASCADE
);

-- Create indexes for user_telegram_configs
CREATE INDEX IF NOT EXISTS idx_user_telegram_configs_user ON user_telegram_configs(user_id);

-- ============================================================================
-- PART 2: PERFORMANCE INDEXES - Optimize Database Queries
-- ============================================================================

-- Performance indexes for review_orders table
CREATE INDEX IF NOT EXISTS idx_review_orders_status_created
ON review_orders(status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_orders_employee_status
ON review_orders(assigned_employee_id, status);

CREATE INDEX IF NOT EXISTS idx_review_orders_user_created
ON review_orders(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_review_orders_status
ON review_orders(status);

-- ============================================================================
-- PART 3: USER MODEL UPDATES - Apply Schema Changes
-- ============================================================================

-- Add status column to users table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'status'
    ) THEN
        ALTER TABLE users ADD COLUMN status TEXT DEFAULT 'PENDING';

        -- Migrate existing data from isActive to status
        UPDATE users SET status =
            CASE
                WHEN is_active = true THEN 'ACTIVE'
                ELSE 'DEACTIVATED'
            END;
    END IF;
END $$;

-- Remove deprecated passwordHash column if it exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'passwordHash'
    ) THEN
        ALTER TABLE users DROP COLUMN passwordHash;
    END IF;
END $$;

-- Add telegram_chat_id column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'telegram_chat_id'
    ) THEN
        ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
    END IF;
END $$;

-- Add preferred_language column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'preferred_language'
    ) THEN
        ALTER TABLE users ADD COLUMN preferred_language TEXT DEFAULT 'en';
    END IF;
END $$;

-- ============================================================================
-- PART 4: SERVICE MODEL UPDATES - Add Column Mappings
-- ============================================================================

-- These changes are primarily for Prisma - the actual PostgreSQL
-- columns should already exist with the correct names.
-- No changes needed if columns already exist with underscores.

-- ============================================================================
-- PART 5: CREDIT PACKAGE MODEL UPDATES
-- ============================================================================

-- Ensure credits_amount column exists (may already exist as creditsAmount)
-- No action needed - Prisma handles the mapping

-- ============================================================================
-- PART 6: VERIFICATION QUERIES - Confirm Changes Applied
-- ============================================================================

-- Verify new tables exist
SELECT
    'review_credit_pricing' as table_name,
    COUNT(*) as row_count
FROM review_credit_pricing
UNION ALL
SELECT
    'telegram_group_configs' as table_name,
    COUNT(*) as row_count
FROM telegram_group_configs
UNION ALL
SELECT
    'app_settings' as table_name,
    COUNT(*) as row_count
FROM app_settings
UNION ALL
SELECT
    'user_telegram_configs' as table_name,
    COUNT(*) as row_count
FROM user_telegram_configs;

-- Verify performance indexes exist
SELECT
    indexname,
    tablename
FROM pg_indexes
WHERE indexname LIKE 'idx_review_orders%';

-- Verify users table has correct columns
SELECT
    column_name,
    data_type,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
AND column_name IN ('status', 'telegram_chat_id', 'preferred_language')
ORDER BY column_name;

-- ============================================================================
-- MIGRATION COMPLETE
-- ============================================================================
-- All schema changes have been applied successfully!
-- The database is now synchronized with the updated Prisma schema.
-- ============================================================================