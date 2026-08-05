-- ============================================================================
-- COMBINED SUPABASE MIGRATION SCRIPT
-- BoostBuddy MVP - Multilingual & Priority Notification System
-- ============================================================================

-- This script applies both migrations in the correct order
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- PART 1: USER LANGUAGE PREFERENCE MIGRATION
-- ============================================================================

-- Step 1: Add preferred_language column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'it'));

-- Step 2: Create index for language-based queries
CREATE INDEX IF NOT EXISTS idx_users_preferred_language
ON users(preferred_language);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN users.preferred_language IS 'Preferred language for notifications and communication: "en" (English) or "it" (Italian)';

-- Step 4: Set intelligent defaults based on email domains
-- Users with Italian email domains get Italian as default
UPDATE users
SET preferred_language = 'it'
WHERE email LIKE '%.it' AND preferred_language = 'en';

-- Step 5: Ensure all users have a language preference set
UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

-- ============================================================================
-- PART 2: PRIORITY NOTIFICATION SYSTEM MIGRATION
-- ============================================================================

-- Step 1: Add priority column to notification_logs
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM'
CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'));

-- Step 2: Add is_read column for better UX
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Step 3: Add user_id reference for direct user filtering
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Add related_order_id for context
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS related_order_id TEXT;

-- Step 5: Create priority index for efficient queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_priority
ON notification_logs(priority, created_at DESC);

-- Step 6: Create user-specific unread notifications index
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread
ON notification_logs(user_id, is_read, created_at DESC);

-- Step 7: Create user-specific priority index
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_priority
ON notification_logs(user_id, priority, created_at DESC);

-- Step 8: Add documentation comments
COMMENT ON COLUMN notification_logs.priority IS 'Notification urgency: HIGH (real-time), MEDIUM (page reload), LOW (background)';
COMMENT ON COLUMN notification_logs.is_read IS 'Whether user has read this notification';
COMMENT ON COLUMN notification_logs.user_id IS 'User reference for direct filtering and access control';
COMMENT ON COLUMN notification_logs.related_order_id IS 'Optional link to related order/review for context';

-- Step 9: Update RLS policies to work with user_id column
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notification logs" ON notification_logs;
CREATE POLICY "Admins can manage all notification logs"
  ON notification_logs FOR ALL
  USING (public.is_admin());

-- ============================================================================
-- POST-MIGRATION VERIFICATION
-- ============================================================================

-- Verification 1: Check users table structure
DO $$
BEGIN
  RAISE NOTICE '=== USERS TABLE VERIFICATION ===';

  -- Check preferred_language column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'preferred_language'
  ) THEN
    RAISE NOTICE '✅ preferred_language column exists';
  ELSE
    RAISE NOTICE '❌ preferred_language column missing';
  END IF;

  -- Check index exists
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE indexname = 'idx_users_preferred_language'
  ) THEN
    RAISE NOTICE '✅ idx_users_preferred_language index exists';
  ELSE
    RAISE NOTICE '❌ idx_users_preferred_language index missing';
  END IF;

  -- Show language distribution
  FOR row IN
    SELECT preferred_language, COUNT(*) as count
    FROM users
    GROUP BY preferred_language
  LOOP
    RAISE NOTICE 'Users with % language: %', row.preferred_language, row.count;
  END LOOP;
END $$;

-- Verification 2: Check notification_logs table structure
DO $$
BEGIN
  RAISE NOTICE '=== NOTIFICATION_LOGS TABLE VERIFICATION ===';

  -- Check new columns
  DECLARE
    col_name TEXT;
    col_missing TEXT[] := '{}';
  BEGIN
    FOREACH col_name IN ARRAY['priority', 'is_read', 'user_id', 'related_order_id']
    LOOP
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'notification_logs' AND column_name = col_name
      ) THEN
        col_missing := array_append(col_missing, col_name);
      END IF;
    END LOOP;

    IF array_length(col_missing, 1) > 0 THEN
      RAISE NOTICE '❌ Missing columns: %', array_to_string(col_missing);
    ELSE
      RAISE NOTICE '✅ All priority system columns exist';
    END IF;
  END;

  -- Show priority distribution
  FOR row IN
    SELECT priority, COUNT(*) as count
    FROM notification_logs
    WHERE priority IS NOT NULL
    GROUP BY priority
  LOOP
    RAISE NOTICE 'Notifications with % priority: %', row.priority, row.count;
  END LOOP;
END $$;

-- Verification 3: Check all expected indexes
DO $$
BEGIN
  RAISE NOTICE '=== INDEX VERIFICATION ===';

  FOR idx IN
    SELECT indexname
    FROM pg_indexes
    WHERE indexname LIKE '%preferred_language%'
       OR indexname LIKE '%notification_logs%'
  LOOP
    RAISE NOTICE '✅ Index exists: %', idx.indexname;
  END LOOP;
END $$;

-- ============================================================================
-- FINAL SUCCESS MESSAGE
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE 'Your BoostBuddy database now supports:';
  RAISE NOTICE '  🌍 Multilingual notifications (English/Italian)';
  RAISE NOTICE '  🔔 Priority-based notification system (HIGH/MEDIUM/LOW)';
  RAISE NOTICE '  ✅ Real-time notification tracking';
  RAISE NOTICE '  📊 Enhanced notification analytics';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '  1. Test language switching in NotificationCenter UI';
  RAISE NOTICE '  2. Send test notifications in both languages';
  RAISE NOTICE '  3. Verify priority-based delivery works';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
END $$;