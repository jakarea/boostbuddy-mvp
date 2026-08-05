# 👥 Telegram Group Messaging - Complete Guide

## 🎯 Overview

Telegram group messaging allows you to send notifications to multiple users simultaneously. Perfect for:
- Admin team alerts
- Employee notifications
- Client support groups
- Department-specific updates

---

## 🔧 How Group Messaging Works

### Key Differences: Individual vs Group

| Feature | Individual Chat | Group Chat |
|---------|----------------|------------|
| **Chat ID Format** | Positive number (`987654321`) | Negative number (`-1001234567890`) |
| **Bot Requirements** | User starts bot with `/start` | Bot must be added to group |
| **Permissions** | Automatic after `/start` | Admin must grant permissions |
| **Message Format** | Same API call | Same API call |
| **Use Cases** | Personal notifications | Team/broadcast notifications |

### Technical Implementation

**The API call is IDENTICAL** - only the `chat_id` changes:

```typescript
// Individual message
await sendMessage({
  chat_id: "987654321",  // Individual user
  text: "Your personal notification"
});

// Group message
await sendMessage({
  chat_id: "-1001234567890",  // Group
  text: "Team notification"
});
```

---

## 🚀 Setting Up Group Messaging

### Step 1: Create Telegram Group

1. Open Telegram and create a new group:
   - Click "New Group" (or "New Channel" for broadcast lists)
   - Add initial members (can be just you for testing)
   - Set group name and description

2. **Important**: Convert to **Supergroup** for better features:
   - Go to Group Info → Edit → Convert to Supergroup
   - Supergroups support better bot permissions and larger member counts

### Step 2: Add Your Bot to the Group

1. Go to your newly created group
2. Click group name to open group info
3. Click "Add Member" or "+"
4. Search for your bot by username (e.g., `@boostbuddy_bot`)
5. Add bot to group

### Step 3: Grant Bot Permissions

When you add the bot, Telegram will ask what permissions to grant:

**Required Permissions:**
- ✅ **Send Messages** - Essential for notifications
- ✅ **Send Media** - If sending images/files
- ✅ **Edit Messages** - For updating notifications
- ✅ **Pin Messages** - For important alerts

**Optional Permissions:**
- 📝 **Manage Topics** - For threaded discussions
- 👥 **Add Members** - If bot needs to invite users

### Step 4: Get Group Chat ID

**Method 1: Forward Message (Easiest)**
1. Send a message to the group from your personal account
2. Forward that message to your bot
3. Bot receives message with group Chat ID in `forward_from_chat_id`

**Method 2: Use @GetMyId Bot**
1. Add `@GetMyId` bot to your group
2. The bot will reply with the group Chat ID (negative number)
3. Format: `-1001234567890`

**Method 3: API Call (Advanced)**
```typescript
const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getUpdates`);
const updates = await response.json();
// Find the message from your group and extract chat_id
```

### Step 5: Test Group Messaging

```typescript
// Test message to group
await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    chat_id: "-1001234567890",  // Your group Chat ID
    text: "✅ *BoostBuddy Group Test*\n\nThis is a test message to the group!",
    parse_mode: "Markdown"
  })
});
```

---

## 📊 Database Schema Enhancement

### Group Configuration Table

```sql
CREATE TABLE telegram_group_configs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_name TEXT NOT NULL,           -- Display name for the group
  group_chat_id TEXT NOT NULL UNIQUE, -- Group Chat ID (negative number)
  group_type TEXT NOT NULL,          -- "ADMIN", "EMPLOYEE", "CLIENT_SUPPORT", etc.
  is_active BOOLEAN DEFAULT true,     -- Enable/disable group
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Example data
INSERT INTO telegram_group_configs (group_name, group_chat_id, group_type) VALUES
('Admin Team', '-1001234567890', 'ADMIN'),
('Employee Notifications', '-1009876543210', 'EMPLOYEE'),
('Client Support', '-1005555555555', 'CLIENT_SUPPORT');
```

### Notification Logs Enhancement

```sql
-- Add group delivery tracking
ALTER TABLE notification_logs
ADD COLUMN telegram_groups_sent TEXT[];  -- Array of group Chat IDs

-- Or use separate table for detailed tracking
CREATE TABLE telegram_group_deliveries (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  notification_id UUID REFERENCES notification_logs(id),
  group_chat_id TEXT NOT NULL,
  delivery_status TEXT,  -- "SENT", "FAILED", "PENDING"
  error_message TEXT,
  sent_at TIMESTAMP DEFAULT NOW()
);
```

---

## 🛠️ Implementation Examples

### Basic Group Message Function

```typescript
/**
 * Send message to a Telegram group
 */
async function sendToGroup(
  botToken: string,
  groupChatId: string,
  subject: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const response = await fetch(
      `https://api.telegram.org/bot${botToken}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: groupChatId,  // Group Chat ID (negative number)
          text: `*${subject}*\n\n${message}`,
          parse_mode: "Markdown",
        })
      }
    );

    if (!response.ok) {
      const error = await response.json();
      return {
        success: false,
        error: error?.description || "Unknown error"
      };
    }

    return { success: true };
  } catch (error: any) {
    return {
      success: false,
      error: error?.message || "Network error"
    };
  }
}
```

### Broadcast to Multiple Groups

```typescript
/**
 * Send notification to multiple groups simultaneously
 */
async function broadcastToGroups(
  botToken: string,
  groupIds: string[],
  subject: string,
  message: string
): Promise<{ success: boolean; sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;

  // Send to all groups in parallel
  const results = await Promise.allSettled(
    groupIds.map(groupId =>
      sendToGroup(botToken, groupId, subject, message)
    )
  );

  results.forEach(result => {
    if (result.status === 'fulfilled' && result.value.success) {
      sent++;
    } else {
      failed++;
    }
  });

  return { success: sent > 0, sent, failed };
}
```

### Enhanced Notification Dispatch with Groups

```typescript
/**
 * Enhanced sendNotificationAction with group support
 */
export async function sendNotificationWithGroupsAction(
  recipient: string,
  subject: string,
  body: string,
  channel: "EMAIL" | "TELEGRAM",
  type: string,
  priority?: "HIGH" | "MEDIUM" | "LOW",
  relatedOrderId?: string,
  targetGroups?: string[]  // NEW: Array of group Chat IDs
) {
  try {
    const supabaseAdmin = createAdminClient();

    // 1. Individual delivery (existing functionality)
    const adminCreds = await loadAdminTelegramCredentials(supabaseAdmin);
    await dispatchToTelegram(adminCreds, subject, body);

    // 2. User personal delivery (existing functionality)
    const botToken = await loadAdminBotToken(supabaseAdmin);
    if (botToken) {
      const userChatId = await loadUserChatId(supabaseAdmin, recipient);
      if (userChatId) {
        await dispatchToTelegram({ bot_token: botToken, chat_id: userChatId }, subject, body);
      }
    }

    // 3. Group delivery (NEW functionality)
    if (targetGroups && targetGroups.length > 0 && botToken) {
      const groupResults = await broadcastToGroups(
        botToken,
        targetGroups,
        subject,
        body
      );

      console.log(`[GROUPS] Sent to ${groupResults.sent} groups, ${groupResults.failed} failed`);
    }

    // 4. Database logging
    const { error } = await supabaseAdmin
      .from("notification_logs")
      .insert({
        recipient,
        subject,
        body,
        type,
        channel,
        status: "SENT",
        priority: priority || "MEDIUM",
        user_id: userId,
        related_order_id: relatedOrderId || null,
        telegram_groups_sent: targetGroups || []  // Track group delivery
      });

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error?.message || "Failed to process notification" };
  }
}
```

---

## 🎨 Advanced Group Features

### Group-Specific Message Formatting

```typescript
/**
 * Format message specifically for groups
 */
function formatGroupMessage(
  notificationType: string,
  params: Record<string, any>,
  groupType: string
): string {
  const baseMessage = getNotificationTemplate("en", notificationType).body(params);

  // Add group-specific prefix
  const groupPrefixes = {
    ADMIN: "🚨 *ADMIN ALERT*",
    EMPLOYEE: "👷 *EMPLOYEE NOTIFICATION*",
    CLIENT_SUPPORT: "🎫 *SUPPORT UPDATE*"
  };

  const prefix = groupPrefixes[groupType] || "📢 *NOTIFICATION*";

  return `${prefix}\n\n${baseMessage}`;
}
```

### Group Mentions

```typescript
/**
 * Message with @ mentions for specific group members
 */
async function sendWithMention(
  botToken: string,
  groupChatId: string,
  message: string,
  mentionUserIds?: string[]  // Telegram user IDs to mention
) {
  let formattedMessage = message;

  // Add mentions if provided
  if (mentionUserIds && mentionUserIds.length > 0) {
    const mentions = mentionUserIds
      .map(id => `[user](tg://user?id=${id})`)
      .join(' ');
    formattedMessage = `${mentions}\n\n${message}`;
  }

  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: groupChatId,
      text: formattedMessage,
      parse_mode: "Markdown",
      disable_web_page_preview: true
    })
  });
}
```

### Threaded Messages (Topics)

```typescript
/**
 * Send message to specific topic in forum groups
 */
async function sendToTopic(
  botToken: string,
  groupChatId: string,
  topicId: string,  // Message thread ID
  message: string
) {
  await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      chat_id: groupChatId,
      message_thread_id: topicId,  // Thread ID for forum groups
      text: message,
      parse_mode: "Markdown"
    })
  });
}
```

---

## 📋 Use Case Examples

### Admin Team Alerts

```typescript
// New high-risk order requires admin attention
await sendNotificationWithGroupsAction(
  "admin@boostbuddy.com",
  "⚠️ High-Risk Order Alert",
  "New order requires manual review",
  "TELEGRAM",
  "ORDER_REQUIRES_REVIEW",
  "HIGH",
  orderId,
  ["-1001234567890"]  // Admin team group
);
```

### Employee Notifications

```typescript
// Broadcast new order availability to all active employees
await broadcastToGroups(
  botToken,
  ["-1009876543210"],  // Employee notification group
  "📦 New Order Available",
  `A new ${serviceType} order is now available for assignment.\n\nClient: ${clientName}\nPrice: ${price}€`
);
```

### Department-Specific Updates

```typescript
// Different groups for different departments
const departmentGroups = {
  SUPPORT: "-1001111111111",
  BILLING: "-1002222222222",
  TECHNICAL: "-1003333333333"
};

await sendToGroup(
  botToken,
  departmentGroups.SUPPORT,
  "Support Ticket Update",
  "New high-priority support ticket received"
);
```

---

## 🔒 Group Management & Security

### Group Configuration Management

```typescript
/**
 * Add new group configuration
 */
export async function addGroupConfigAction(
  groupName: string,
  groupChatId: string,
  groupType: string
) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = createAdminClient();

  // Validate group Chat ID format (should be negative for groups)
  if (!groupChatId.startsWith('-')) {
    return {
      success: false,
      error: "Invalid group Chat ID format (should be negative number)"
    };
  }

  // Test that bot can actually send to this group
  const testResult = await sendToGroup(
    botToken,
    groupChatId,
    "Test",
    "BoostBuddy group configuration test"
  );

  if (!testResult.success) {
    return {
      success: false,
      error: `Cannot send to group: ${testResult.error}`
    };
  }

  // Save group configuration
  const { error } = await supabaseAdmin
    .from("telegram_group_configs")
    .insert({
      group_name: groupName,
      group_chat_id: groupChatId,
      group_type: groupType
    });

  return { success: !error, error: error?.message };
}
```

### Active Group Monitoring

```typescript
/**
 * Check if groups are still accessible
 */
export async function verifyGroupsAction() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = createAdminClient();
  const { data: groups } = await supabaseAdmin
    .from("telegram_group_configs")
    .select("*")
    .eq("is_active", true);

  const results = [];

  for (const group of groups || []) {
    const testResult = await sendToGroup(
      botToken,
      group.group_chat_id,
      "Verification",
      "BoostBuddy group accessibility check"
    );

    results.push({
      group: group.group_name,
      chat_id: group.group_chat_id,
      accessible: testResult.success,
      error: testResult.error
    });

    // Update group status if failed
    if (!testResult.success) {
      await supabaseAdmin
        .from("telegram_group_configs")
        .update({ is_active: false })
        .eq("id", group.id);
    }
  }

  return { success: true, results };
}
```

---

## ✅ Production Checklist

For group messaging in production:

- [ ] Create required Telegram groups (admin, employee, etc.)
- [ ] Add bot to each group with proper permissions
- [ ] Get and save group Chat IDs (negative numbers)
- [ ] Create `telegram_group_configs` table
- [ ] Add group configuration UI in admin panel
- [ ] Implement group testing functionality
- [ ] Set up group monitoring and verification
- [ ] Document group purposes and member access
- [ ] Test group message delivery
- [ ] Monitor Telegram API rate limits for groups

---

## 🎯 Best Practices

1. **Group Organization**: Create separate groups for different purposes
2. **Permission Management**: Only grant necessary permissions to bots
3. **Message Formatting**: Use clear prefixes for different notification types
4. **Rate Limiting**: Consider Telegram's rate limits when sending to multiple groups
5. **Error Handling**: Monitor group accessibility and disable non-responsive groups
6. **Member Management**: Regularly review and update group memberships
7. **Testing**: Always test new groups before production use

---

**Yes! You can send messages to Telegram groups, and it's actually perfect for team notifications and admin alerts!** 📱✅