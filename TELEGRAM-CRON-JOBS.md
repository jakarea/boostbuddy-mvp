# ⏰ Telegram Notification System - Cron Jobs Analysis

## 🎯 Do You Need Cron Jobs?

**Short Answer**: **YES**, but optional for basic functionality.

**Current Status**: ✅ **Works WITHOUT cron jobs** for real-time notifications

**When you NEED cron jobs**:
- ✅ Retry failed notifications
- ✅ Send periodic summaries (daily/weekly)
- ✅ Clean up old notification logs
- ✅ Verify group accessibility periodically
- ✅ Process notification queues

---

## 📋 Recommended Cron Jobs

### **1. Failed Notification Retry** (Optional)

**Purpose**: Retry notifications that failed due to temporary issues (rate limits, network errors)

**Frequency**: Every 5 minutes

```typescript
// File: app/api/cron/retry-failed-notifications/route.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Verify cron job secret (prevent unauthorized access)
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get failed notifications from last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    const { data: failedNotifications } = await supabase
      .from("notification_logs")
      .select("*")
      .eq("status", "FAILED")
      .eq("channel", "TELEGRAM")
      .gte("created_at", oneHourAgo)
      .limit(50);

    if (!failedNotifications || failedNotifications.length === 0) {
      return NextResponse.json({ success: true, retried: 0, message: "No failed notifications to retry" });
    }

    // Retry each failed notification
    let retried = 0;
    for (const notification of failedNotifications) {
      try {
        const result = await sendTelegramRetry(notification);
        if (result.success) {
          await supabase
            .from("notification_logs")
            .update({ status: "SENT", retry_count: (notification.retry_count || 0) + 1 })
            .eq("id", notification.id);
          retried++;
        }
      } catch (error) {
        console.error(`Failed to retry notification ${notification.id}:`, error);
      }
    }

    return NextResponse.json({
      success: true,
      retried,
      total: failedNotifications.length,
      message: `Successfully retried ${retried}/${failedNotifications.length} notifications`
    });
  } catch (error) {
    console.error("Cron job failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

async function sendTelegramRetry(notification: any) {
  // Implementation of retry logic
  return { success: true };
}
```

---

### **2. Group Accessibility Verification** (Recommended)

**Purpose**: Automatically check if Telegram groups are still accessible and disable inactive ones

**Frequency**: Every hour

```typescript
// File: app/api/cron/verify-telegram-groups/route.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { verifyAllGroupsAction } from "@/app/actions/telegram-groups";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Run group verification
    const result = await verifyAllGroupsAction();

    if (result.success && result.results) {
      const accessible = result.results.filter(r => r.accessible).length;
      const total = result.results.length;

      // Send admin alert if many groups failed
      if (accessible < total && accessible < total * 0.5) {
        await sendAdminAlert(`⚠️ Telegram Group Verification: Only ${accessible}/${total} groups are accessible!`);
      }

      return NextResponse.json({
        success: true,
        accessible,
        total,
        results: result.results
      });
    }

    return NextResponse.json({ success: false, error: result.error });
  } catch (error) {
    console.error("Group verification cron failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
```

---

### **3. Old Notification Logs Cleanup** (Optional)

**Purpose**: Clean up old notification logs to prevent database bloat

**Frequency**: Daily at 2 AM

```typescript
// File: app/api/cron/cleanup-notifications/route.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Delete notifications older than 90 days (configurable)
    const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

    const { data: oldNotifications } = await supabase
      .from("notification_logs")
      .select("id")
      .lt("created_at", ninetyDaysAgo)
      .limit(1000);

    if (oldNotifications && oldNotifications.length > 0) {
      const idsToDelete = oldNotifications.map(n => n.id);

      const { error } = await supabase
        .from("notification_logs")
        .delete()
        .in("id", idsToDelete);

      if (error) throw error;

      return NextResponse.json({
        success: true,
        deleted: oldNotifications.length,
        message: `Cleaned up ${oldNotifications.length} old notifications`
      });
    }

    return NextResponse.json({
      success: true,
      deleted: 0,
      message: "No old notifications to clean up"
    });
  } catch (error) {
    console.error("Cleanup cron failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}
```

---

### **4. Daily Summary Notifications** (Optional)

**Purpose**: Send daily summaries of important notifications to admin/employee groups

**Frequency**: Daily at 9 AM

```typescript
// File: app/api/cron/daily-summary/route.ts

import { createAdminClient } from "@/lib/supabase/admin";
import { sendToEmployeeGroupAction, sendToAdminGroupAction } from "@/app/actions/telegram-groups";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    // Verify cron job secret
    const authHeader = request.headers.get("authorization");
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const supabase = createAdminClient();

    // Get yesterday's notifications
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const startOfDay = new Date(yesterday.setHours(0, 0, 0, 0)).toISOString();
    const endOfDay = new Date(yesterday.setHours(23, 59, 59, 999)).toISOString();

    const { data: notifications } = await supabase
      .from("notification_logs")
      .select("*")
      .gte("created_at", startOfDay)
      .lte("created_at", endOfDay)
      .order("created_at", { ascending: false });

    if (!notifications || notifications.length === 0) {
      return NextResponse.json({ success: true, message: "No notifications yesterday" });
    }

    // Generate summary
    const summary = generateDailySummary(notifications);

    // Send to admin group
    await sendToAdminGroupAction(
      "📊 Daily Notification Summary",
      summary,
      "LOW"
    );

    return NextResponse.json({
      success: true,
      notifications: notifications.length,
      summary
    });
  } catch (error) {
    console.error("Daily summary cron failed:", error);
    return NextResponse.json({ error: "Cron job failed" }, { status: 500 });
  }
}

function generateDailySummary(notifications: any[]): string {
  const highPriority = notifications.filter(n => n.priority === "HIGH").length;
  const mediumPriority = notifications.filter(n => n.priority === "MEDIUM").length;
  const lowPriority = notifications.filter(n => n.priority === "LOW").length;
  const failed = notifications.filter(n => n.status === "FAILED").length;

  return `
📅 **Yesterday's Notifications**

🔴 High Priority: ${highPriority}
🟡 Medium Priority: ${mediumPriority}
🟢 Low Priority: ${lowPriority}
❌ Failed: ${failed}

📊 Total: ${notifications.length} notifications
  `.trim();
}
```

---

## 🚀 Vercel Cron Job Configuration

### **Option 1: Vercel Cron Jobs (Pro Plan)**

**File: `vercel.json`**

```json
{
  "crons": [
    {
      "path": "/api/cron/retry-failed-notifications",
      "schedule": "*/5 * * * *"
    },
    {
      "path": "/api/cron/verify-telegram-groups",
      "schedule": "0 * * * *"
    },
    {
      "path": "/api/cron/cleanup-notifications",
      "schedule": "0 2 * * *"
    },
    {
      "path": "/api/cron/daily-summary",
      "schedule": "0 9 * * *"
    }
  ]
}
```

**Limitation**: Only available on Vercel Pro plan ($20/month)

---

### **Option 2: External Cron Services (Free Tier Compatible)**

#### **A. Cron-Job.org**

1. Go to https://cron-job.org
2. Create free account
3. Add cron jobs pointing to your API routes:
   ```
   URL: https://your-domain.com/api/cron/retry-failed-notifications
   Headers: Authorization: Bearer YOUR_CRON_SECRET
   Schedule: Every 5 minutes
   ```

#### **B. GitHub Actions**

**File: `.github/workflows/notification-crons.yml`**

```yaml
name: Notification Cron Jobs

on:
  schedule:
    - cron: '*/5 * * * *'  # Every 5 minutes
    - cron: '0 * * * *'    # Every hour
    - cron: '0 2 * * *'    # Daily at 2 AM
    - cron: '0 9 * * *'    # Daily at 9 AM
  workflow_dispatch:       # Manual trigger

jobs:
  retry-failed:
    if: github.event.schedule == '*/5 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Retry Failed Notifications
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://your-domain.com/api/cron/retry-failed-notifications"

  verify-groups:
    if: github.event.schedule == '0 * * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Verify Telegram Groups
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://your-domain.com/api/cron/verify-telegram-groups"

  cleanup:
    if: github.event.schedule == '0 2 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Cleanup Old Notifications
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://your-domain.com/api/cron/cleanup-notifications"

  daily-summary:
    if: github.event.schedule == '0 9 * * *'
    runs-on: ubuntu-latest
    steps:
      - name: Send Daily Summary
        run: |
          curl -X GET \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            "https://your-domain.com/api/cron/daily-summary"
```

#### **C. EasyCron**

1. Go to https://easycron.com
2. Create free account (1 cron job on free tier)
3. Configure cron job to call your API endpoints

---

### **Option 3: Serverless Cron Providers**

#### **Temporal Workflows**

```typescript
// More advanced - for complex cron workflows
import { workflow } from "@temporalio/workflow";

export async function notificationRetryWorkflow() {
  // Retry logic with built-in scheduling
}
```

---

## 🔒 Security: Cron Job Authentication

**IMPORTANT**: Always protect your cron endpoints!

### **Environment Variables**

```env
# .env.local
CRON_SECRET=your-super-secret-random-string-here
```

### **Middleware Protection**

```typescript
// lib/cron-auth.ts
import { NextRequest, NextResponse } from "next/server";

export function validateCronAuth(request: NextRequest): NextResponse | null {
  const authHeader = request.headers.get("authorization");
  const expectedAuth = `Bearer ${process.env.CRON_SECRET}`;

  if (authHeader !== expectedAuth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return null; // Auth is valid
}
```

---

## 📋 Implementation Priority

### **Essential (Implement First)**
1. ✅ **Group Verification** - Prevents sending to inaccessible groups
2. ✅ **Failed Notification Retry** - Ensures reliability

### **Important (Implement Second)**
3. ✅ **Old Notifications Cleanup** - Database maintenance
4. ✅ **Daily Summary** - Admin visibility

### **Optional (Implement Later)**
5. 📊 **Analytics & Reports** - Notification performance metrics
6. 📈 **Usage Statistics** - Track notification patterns

---

## 🎯 Recommendation for Free Tier

### **Best Approach: GitHub Actions**

**Why?**
- ✅ Free for public repositories
- ✅ Reliable scheduling
- ✅ Easy to configure
- ✅ Good for development/production
- ✅ No additional services needed

**Setup Time**: 15 minutes
**Cost**: Free
**Reliability**: High

---

## ✅ Summary

**Do you need cron jobs?**

**For Basic Functionality**: ❌ **NO**
- Real-time notifications work fine without cron jobs
- Group messaging handles concurrent requests efficiently
- Database logging happens automatically

**For Production System**: ✅ **YES**
- Automatic retry for failed notifications
- Group accessibility monitoring
- Database cleanup and maintenance
- Daily summaries and reporting

**Recommendation**: Start with **GitHub Actions** for free, reliable cron job execution.

**Priority**:
1. Group verification (hourly)
2. Failed notification retry (every 5 min)
3. Database cleanup (daily)
4. Daily summaries (daily)

---

**Bottom Line**: Your Telegram notification system works perfectly without cron jobs for basic functionality, but adding them makes it more reliable and production-ready! 🚀