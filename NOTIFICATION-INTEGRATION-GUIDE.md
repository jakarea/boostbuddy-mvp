# 🔔 Notification System Integration Guide

## 📱 Quick Integration Steps

### **Step 1: Add NotificationCenter to Panel Layouts**

Add the NotificationCenter component to each panel's header:

```tsx
// app/a/layout.tsx (Admin Panel)
import NotificationCenter from '@/components/NotificationCenter';

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">Admin Panel</h1>
          <NotificationCenter userRole="ADMIN" />
        </div>
      </header>
      {children}
    </div>
  );
}
```

```tsx
// app/c/layout.tsx (Client Panel)
export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">Client Dashboard</h1>
          <NotificationCenter userRole="CLIENT" />
        </div>
      </header>
      {children}
    </div>
  );
}
```

```tsx
// app/e/layout.tsx (Employee Panel)
export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b">
        <div className="flex items-center justify-between px-4">
          <h1 className="text-xl font-bold">Employee Dashboard</h1>
          <NotificationCenter userRole="EMPLOYEE" />
        </div>
      </header>
      {children}
    </div>
  );
}
```

### **Step 2: Enable Supabase Realtime**

1. Go to your Supabase Dashboard
2. Navigate to **Database → Replication**
3. Find the `notification_logs` table
4. Click **Enable Realtime**
5. Add RLS policies to allow users to subscribe:

```sql
-- Add to your Supabase SQL Editor
DROP POLICY IF EXISTS "Users can realtime own notifications" ON notification_logs;
CREATE POLICY "Users can realtime own notifications"
  ON notification_logs FOR RECEIVE
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Admins can realtime all notifications" ON notification_logs;
CREATE POLICY "Admins can realtime all notifications"
  ON notification_logs FOR RECEIVE
  USING (public.is_admin());
```

### **Step 3: Apply Database Migration**

Run the migration script in your Supabase SQL Editor:

```sql
-- Copy contents from: prisma/migrations/20260805_add_priority_notifications/migration.sql
-- Or run individual commands:

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
```

## 🧪 Testing the Integration

### **Test 1: Basic Notification**

```typescript
// In any server action or API route
import { sendNotificationAction } from '@/app/actions/notifications';

await sendNotificationAction(
  'user@example.com',
  '🧪 Test Notification',
  'This is a test notification to verify the system works',
  'TELEGRAM',
  'TEST',
  'HIGH' // This should trigger real-time delivery
);
```

### **Test 2: Priority Classification**

Test different priority levels:

```typescript
// HIGH priority (real-time)
await sendNotificationAction(email, subject, body, 'TELEGRAM', type, 'HIGH');

// MEDIUM priority (page reload)
await sendNotificationAction(email, subject, body, 'TELEGRAM', type, 'MEDIUM');

// LOW priority (background)
await sendNotificationAction(email, subject, body, 'TELEGRAM', type, 'LOW');
```

### **Test 3: User-Specific Notifications**

```typescript
// With related order context
await sendNotificationAction(
  email,
  '📝 New Review Order',
  'You have been assigned a new review order',
  'TELEGRAM',
  'REVIEW_ORDER_ASSIGNED',
  'HIGH',
  orderId // This links notification to specific order
);
```

## 🎨 UI Features

### **NotificationCenter Component Features:**

1. **Bell Icon with Badge**
   - Red badge shows unread HIGH priority count
   - Animated ping effect for new notifications
   - Green dot shows Realtime connection status

2. **Notification Panel**
   - Priority filter tabs (ALL, HIGH, MEDIUM, LOW)
   - Sorted by priority first, then date
   - Color-coded priority badges
   - Mark as read/delete actions

3. **Priority Badges**
   - 🔴 HIGH: Red background
   - 🟡 MEDIUM: Yellow background
   - 🔵 LOW: Blue background

4. **Real-time Updates**
   - Instant delivery for HIGH priority
   - Browser notifications (if permission granted)
   - Sound alerts
   - Auto-refresh on connection changes

## 🔍 Troubleshooting

### **Issue: No Realtime Connection**
**Solution**: Enable Realtime in Supabase Dashboard for notification_logs table

### **Issue: No Notifications Showing**
**Solution**: Check RLS policies and ensure user_id is properly set

### **Issue: Badge Count Not Updating**
**Solution**: Verify unread count query is working correctly

### **Issue: Sound Not Playing**
**Solution**: Add sound file to `/public/sounds/notification.mp3`

## 📊 Monitoring Free Tier Usage

The system is optimized for Supabase free tier:

- **Realtime Connections**: Only for HIGH priority (17 events)
- **Connection Duration**: Minimal, auto-cleanup on disconnect
- **Fallback**: 30-second polling if Realtime fails
- **Expected Usage**: ~10-20 concurrent connections max

## 🚀 Production Checklist

- [ ] Database migration applied
- [ ] Realtime enabled in Supabase
- [ ] RLS policies updated
- [ ] NotificationCenter integrated in all panels
- [ ] Sound file added to public folder
- [ ] Test notifications sent successfully
- [ ] Realtime subscriptions working
- [ ] Browser notifications tested
- [ ] Free tier usage monitored

---

**Integration Difficulty**: ⭐⭐ (Easy - ~30 minutes)
**Production Ready**: ✅ Yes
**Maintenance**: Low (set and forget)