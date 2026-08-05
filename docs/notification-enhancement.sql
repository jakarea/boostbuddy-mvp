-- ============================================================================
-- Priority-Based Dynamic Notification System Enhancement
-- BoostBuddy MVP - Database Schema Enhancement
-- ============================================================================

-- Step 1: Add priority column to classify notification urgency
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM'
CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'));

-- Step 2: Add is_read column for better UX and unread tracking
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

-- Step 3: Add user_id reference for direct user queries and filtering
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

-- Step 4: Add related_order_id for context and linking
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS related_order_id TEXT;

-- Step 5: Create index for efficient priority-based queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_priority
ON notification_logs(priority, created_at DESC);

-- Step 6: Create index for user-specific unread notifications
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread
ON notification_logs(user_id, is_read, created_at DESC);

-- Step 7: Create index for priority-based user queries
CREATE INDEX IF NOT EXISTS idx_notification_logs_user_priority
ON notification_logs(user_id, priority, created_at DESC);

-- Step 8: Add comments for documentation
COMMENT ON COLUMN notification_logs.priority IS 'Notification urgency: HIGH (real-time), MEDIUM (page reload), LOW (background)';
COMMENT ON COLUMN notification_logs.is_read IS 'Whether user has read this notification';
COMMENT ON COLUMN notification_logs.user_id IS 'User reference for direct filtering and access control';
COMMENT ON COLUMN notification_logs.related_order_id IS 'Optional link to related order/review for context';

-- Step 9: Enable Realtime on notification_logs table (via Supabase Dashboard)
-- Run this in Supabase Dashboard: Database -> Realtime -> Enable notification_logs

-- ============================================================================
-- Sample Data Migration (optional - updates existing records)
-- ============================================================================

-- Set default priority for existing records based on type
UPDATE notification_logs
SET priority = CASE
  WHEN type IN ('CREDITS_ADJUSTED', 'ORDER_CANCELLED') THEN 'HIGH'
  WHEN type IN ('SYSTEM', 'INFO') THEN 'LOW'
  ELSE 'MEDIUM'
END
WHERE priority IS NULL OR priority = 'MEDIUM';