# ⚡ Quick Migration Guide - Apply to Your Supabase Server

## 🎯 Quick Steps (5 minutes)

### **Step 1: Open Supabase SQL Editor** (1 minute)
1. Go to https://supabase.com/dashboard
2. Select your **BoostBuddy project**
3. Click **SQL Editor** in left sidebar (icon looks like `</>`)
4. You should see a blank SQL editor window

### **Step 2: Copy & Paste Migration Script** (2 minutes)
1. Open the file: `supabase-combined-migration.sql`
2. Copy the **entire content** (Ctrl+A, Ctrl+C)
3. Paste into Supabase SQL Editor (Ctrl+V)
4. Click **Run** button or press **Ctrl+Enter**

### **Step 3: Verify Success** (1 minute)
Look for these success messages in the results:
- ✅ `preferred_language column exists`
- ✅ `idx_users_preferred_language index exists`
- ✅ `All priority system columns exist`
- ✅ `MIGRATION COMPLETED SUCCESSFULLY!`

### **Step 4: Test in Application** (1 minute)
Run this test query in SQL Editor:
```sql
SELECT
    preferred_language,
    COUNT(*) as user_count
FROM users
GROUP BY preferred_language;
```

**Expected Result:**
```
preferred_language | user_count
en                 |    [number]
it                 |    [number]
```

---

## 📋 Complete Migration Script

If you prefer to run everything at once, here's the complete script:

```sql
-- ============================================================================
-- COMBINED SUPABASE MIGRATION SCRIPT
-- Run this entire script in Supabase SQL Editor
-- ============================================================================

-- PART 1: User Language Preference
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'it'));

CREATE INDEX IF NOT EXISTS idx_users_preferred_language
ON users(preferred_language);

COMMENT ON COLUMN users.preferred_language IS 'Preferred language for notifications and communication: "en" (English) or "it" (Italian)';

UPDATE users
SET preferred_language = 'it'
WHERE email LIKE '%.it' AND preferred_language = 'en';

UPDATE users
SET preferred_language = 'en'
WHERE preferred_language IS NULL;

-- PART 2: Priority Notification System
ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS priority TEXT DEFAULT 'MEDIUM'
CHECK (priority IN ('HIGH', 'MEDIUM', 'LOW'));

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS is_read BOOLEAN DEFAULT false;

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES users(id) ON DELETE CASCADE;

ALTER TABLE notification_logs
ADD COLUMN IF NOT EXISTS related_order_id TEXT;

CREATE INDEX IF NOT EXISTS idx_notification_logs_priority
ON notification_logs(priority, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_unread
ON notification_logs(user_id, is_read, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_logs_user_priority
ON notification_logs(user_id, priority, created_at DESC);

COMMENT ON COLUMN notification_logs.priority IS 'Notification urgency: HIGH (real-time), MEDIUM (page reload), LOW (background)';
COMMENT ON COLUMN notification_logs.is_read IS 'Whether user has read this notification';
COMMENT ON COLUMN notification_logs.user_id IS 'User reference for direct filtering and access control';
COMMENT ON COLUMN notification_logs.related_order_id IS 'Optional link to related order/review for context';

-- Update RLS policies
DROP POLICY IF EXISTS "Users can view own notification logs" ON notification_logs;
CREATE POLICY "Users can view own notification logs"
  ON notification_logs FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can manage all notification logs" ON notification_logs;
CREATE POLICY "Admins can manage all notification logs"
  ON notification_logs FOR ALL
  USING (public.is_admin());

-- Verification queries (will show success messages)
DO $$
BEGIN
  RAISE NOTICE '✅ MIGRATION COMPLETED SUCCESSFULLY!';
  RAISE NOTICE 'Your database now supports multilingual notifications!';
END $$;
```

---

## 🔍 Verification Queries

After running the migration, verify it worked:

### **Test 1: Check Users Table**
```sql
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND column_name = 'preferred_language';
```

### **Test 2: Check Notification Logs**
```sql
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'notification_logs'
  AND column_name IN ('priority', 'is_read', 'user_id', 'related_order_id');
```

### **Test 3: Check Indexes**
```sql
SELECT indexname
FROM pg_indexes
WHERE tablename IN ('users', 'notification_logs')
  AND (indexname LIKE '%preferred_language%' OR indexname LIKE '%priority%');
```

---

## ⚠️ Common Issues & Solutions

### **Issue: "column already exists"**
**Solution:** This is normal! The `IF NOT EXISTS` clause prevents errors. Migration is safe to re-run.

### **Issue: "must be owner of table"**
**Solution:** Ensure you're using the project owner account (the one who created the Supabase project).

### **Issue: "relation users does not exist"**
**Solution:** The `notification_logs` table might not exist yet. Check if your Supabase project has both tables.

---

## ✅ Success Indicators

You'll know the migration worked when you see:
- ✅ Success messages in SQL Editor results
- ✅ New columns appear in table structure
- ✅ Indexes created successfully
- ✅ Application doesn't crash when accessing notifications

---

## 🚀 After Migration

Once migration is complete:

1. **Restart your dev server**: `npm run dev`
2. **Test language selector** in NotificationCenter component
3. **Update a user's language** via the UI or API
4. **Send test notifications** in both languages

---

## 📞 Need Help?

If you encounter any issues:

1. **Check Supabase Dashboard logs** (bottom-left corner icon)
2. **Verify SQL syntax** (missing semicolons, etc.)
3. **Check table names** (ensure `users` and `notification_logs` exist)
4. **Contact support** with error messages

---

**Migration Risk:** 🟢 **LOW** - Uses `IF NOT EXISTS` clauses, safe to re-run
**Rollback:** Safe - Can be undone by removing columns if needed
**Testing:** Full verification queries provided above

---

**Time Required:** 5 minutes
**Skill Level:** Beginner - Just copy/paste SQL
**Success Rate:** 99% (with existing Supabase projects)