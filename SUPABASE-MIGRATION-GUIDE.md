# 🚀 Supabase Database Migration Guide

## 📋 Overview

This guide will help you apply the database migrations for the **multilingual notification system** to your production Supabase database.

## 🎯 Migrations to Apply

1. **User Language Preference** - Add `preferred_language` column to users table
2. **Priority Notification System** - Enhance `notification_logs` table with priority features

---

## 🗄️ Migration 1: User Language Preference

### **Step 1: Access Supabase SQL Editor**

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your **BoostBuddy project**
3. Navigate to **SQL Editor** (left sidebar → SQL Editor icon)

### **Step 2: Execute Migration Script**

Copy and paste the following SQL into the SQL Editor:

```sql
-- ============================================================================
-- Migration 1: Add User Language Preference
-- BoostBuddy MVP - Multilingual Notification Support
-- ============================================================================

-- Step 1: Add preferred_language column to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'it'));

-- Step 2: Create index for language-based queries (useful for analytics)
CREATE INDEX IF NOT EXISTS idx_users_preferred_language
ON users(preferred_language);

-- Step 3: Add comment for documentation
COMMENT ON COLUMN users.preferred_language IS 'Preferred language for notifications and communication: "en" (English) or "it" (Italian)';

-- Step 4: Set default language based on existing data (optional)
-- Users with Italian email domains get Italian as default
UPDATE users
SET preferred_language = 'it'
WHERE email LIKE '%.it' AND preferred_language = 'en';

-- Step 5: Update existing users to have 'en' as default if not set
UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

-- Verification query
SELECT
    id,
    email,
    preferred_language,
    COUNT(*) as total_users
FROM users
GROUP BY preferred_language;
```

### **Step 3: Verify Migration**

Run this verification query to confirm the migration:

```sql
-- Check that the column exists and has values
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'users'
  AND column_name = 'preferred_language';
```

**Expected Result:**
- `column_name`: "preferred_language"
- `data_type`: "text"
- `is_nullable`: "NO"
- `column_default`: "'en'::text"

---

## 🗄️ Migration 2: Priority Notification System

### **Step 4: Execute Priority System Migration**

Still in the SQL Editor, run this second migration script:

```sql
-- ============================================================================
-- Migration 2: Priority-Based Dynamic Notification System
-- BoostBuddy MVP - Enhanced Notification Features
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

-- Step 9: Update RLS policies to work with user_id
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notification logs" ON notification_logs;
CREATE POLICY "Admins can manage all notification logs"
  ON notification_logs FOR ALL
  USING (public.is_admin());
```

### **Step 5: Verify Priority System Migration**

Run this verification query:

```sql
-- Check new columns exist
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'notification_logs'
  AND column_name IN ('priority', 'is_read', 'user_id', 'related_order_id')
ORDER BY column_name;
```

**Expected Result:**
- 4 new columns should appear
- `priority`: "text", DEFAULT: "'MEDIUM'::text"
- `is_read`: "boolean", DEFAULT: "false"
- `user_id`: "uuid", REFERENCES users(id)
- `related_order_id`: "text"

---

## 🔍 Post-Migration Verification

### **Step 6: Run Complete Verification**

Execute this comprehensive verification script:

```sql
-- ============================================================================
-- Post-Migration Verification
-- ============================================================================

-- Check users table has language preference
SELECT
    COUNT(*) FILTER (WHERE preferred_language = 'en') as english_users,
    COUNT(*) FILTER (WHERE preferred_language = 'it') as italian_users,
    COUNT(*) as total_users
FROM users;

-- Check notification_logs has priority columns
SELECT
    COUNT(*) FILTER (WHERE priority = 'HIGH') as high_priority,
    COUNT(*) FILTER (WHERE priority = 'MEDIUM') as medium_priority,
    COUNT(*) FILTER (WHERE priority = 'LOW') as low_priority,
    COUNT(*) as total_notifications
FROM notification_logs;

-- Verify indexes were created
SELECT
    schemaname,
    tablename,
    indexname
FROM pg_indexes
WHERE tablename IN ('users', 'notification_logs')
  AND indexname LIKE '%preferred_language%'
  OR indexname LIKE '%notification_logs%priority%'
ORDER BY tablename, indexname;
```

**Expected Results:**
- Users table should show distribution of language preferences
- Notification_logs should show priority distribution
- Indexes should show `idx_users_preferred_language` and notification log indexes

---

## 🚨 Troubleshooting

### **Issue 1: Column Already Exists**

If you get "column already exists" error:

```sql
-- Check if column exists
SELECT column_name FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'preferred_language';

-- If it exists, skip the migration and update defaults
UPDATE users SET preferred_language = 'en' WHERE preferred_language IS NULL;
```

### **Issue 2: Foreign Key Constraint Error**

If the `user_id` foreign key fails:

```sql
-- First ensure the users table exists and has correct structure
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'id';
```

### **Issue 3: RLS Policy Error**

If RLS policy creation fails:

```sql
-- Check if is_admin function exists
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_name = 'is_admin';

-- If missing, create it first (from your schema.sql)
```

---

## ✅ Migration Checklist

- [ ] Access Supabase SQL Editor
- [ ] Execute Migration 1 (User Language Preference)
- [ ] Execute Migration 2 (Priority Notification System)
- [ ] Run verification queries
- [ ] Check RLS policies updated
- [ ] Confirm indexes created
- [ ] Test with sample data

---

## 🎯 After Migration

Once migrations are successfully applied, you can:

1. **Test language preference** by updating a user's language:
   ```sql
   UPDATE users SET preferred_language = 'it' WHERE email = 'user@example.com';
   ```

2. **Test priority notifications** by inserting test data:
   ```sql
   INSERT INTO notification_logs (recipient, subject, body, type, channel, status, priority, user_id)
   VALUES ('test@example.com', 'Test Subject', 'Test Body', 'TEST', 'TELEGRAM', 'SENT', 'HIGH', (SELECT id FROM users LIMIT 1));
   ```

3. **Verify the application works** by checking if the NotificationCenter component loads properly

---

## 📞 Support

If you encounter any issues during migration:

1. **Check Supabase logs** in the Dashboard
2. **Verify table permissions** in Database → Permissions
3. **Test SQL in development** before production
4. **Contact Supabase support** if system errors occur

---

**Migration Status**: 🔄 Ready to apply
**Estimated Time**: 5-10 minutes
**Risk Level**: Low (uses IF NOT EXISTS clauses)
**Rollback**: Safe to re-run if needed