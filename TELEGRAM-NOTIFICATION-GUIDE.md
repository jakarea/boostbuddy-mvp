# 📱 Telegram Notification System - Complete Guide

## 🎯 Overview

The BoostBuddy MVP Telegram notification system enables real-time notifications to be delivered to both administrators and users via Telegram messaging. This system is currently **DISABLED for development** and needs to be enabled for production use.

---

## 🔧 How Telegram Notifications Work

### Architecture Overview

The Telegram notification system operates on a **two-tier architecture**:

1. **Admin-Level Bot Configuration** (Global)
   - Single Telegram bot for the entire application
   - Admin configures bot token and default chat ID
   - Used for system-wide notifications and admin alerts

2. **User-Level Chat ID Configuration** (Personal)
   - Each user configures their personal Telegram Chat ID
   - Uses the admin's bot to send individual messages
   - Enables personalized notifications per user

### Message Delivery Flow

```
┌─────────────────────────────────────────────────────────────┐
│ 1. Event Trigger (e.g., Order Created, Profile Assigned)    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 2. sendMultilingualNotificationAction()                      │
│    - Determines recipient's language preference             │
│    - Selects appropriate message template (EN/IT)           │
│    - Sets priority level (HIGH/MEDIUM/LOW)                   │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ▼
┌─────────────────────────────────────────────────────────────┐
│ 3. sendNotificationAction()                                   │
│    - Logs notification to database (notification_logs)       │
│    - Triggers Supabase Realtime for HIGH priority           │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   ├───▶ Admin Telegram Channel (if configured)
                   │    - Global admin notifications
                   │
                   └───▶ User Personal Telegram (if configured)
                        - Individual user notifications
```

### Bot ID vs User Chat ID (Critical Distinction)

**Telegram Bot ID**: The identifier for your bot (obtained from BotFather)
- Example: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
- Format: `{bot_id}:{access_token}`
- Purpose: Authenticates API calls to Telegram
- ❌ **NOT** for receiving messages

**User Chat ID**: Your personal Telegram account identifier
- Example: `987654321` (numeric only)
- Purpose: Where messages get delivered
- ✅ **This is what users need to configure**

---

## 🚀 Setup Instructions

### Phase 1: Admin Bot Setup (One-Time)

#### Step 1: Create Telegram Bot via BotFather

1. Open Telegram and search for `@BotFather`
2. Send `/newbot` command
3. Follow the prompts:
   - Choose a name: `BoostBuddy Bot` (or your preference)
   - Choose a username: `boostbuddy_bot` (must end in 'bot')
4. **Save the Bot Token** immediately!
   - Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   - You'll need this for configuration

#### Step 2: Get Your Admin Chat ID

1. Search for `@userinfobot` or `@GetMyChatID_Bot` in Telegram
2. Click `/start` button
3. Bot will return your numeric Chat ID
4. **Save this Chat ID** for admin configuration

#### Step 3: Configure in BoostBuddy Admin Panel

1. Navigate to **Admin Panel → Notifications**
2. Find **Telegram Configuration** section
3. Enter:
   - **Bot Token**: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`
   - **Chat ID**: `987654321` (your admin Chat ID)
4. Click **Save Configuration**
5. Click **Test Notification** to verify setup

### Phase 2: User Setup (Per User)

#### Step 1: Admin Starts the Bot

Before users can receive notifications, the admin must:
1. Find the bot in Telegram (search for your bot username)
2. Click `/start` button to activate the bot

#### Step 2: Users Configure Their Chat ID

For each user who wants Telegram notifications:

1. **Get Personal Chat ID:**
   - Open Telegram
   - Search for `@userinfobot` or `@GetMyChatID_Bot`
   - Click `/start`
   - Copy the numeric Chat ID returned

2. **Start BoostBuddy Bot:**
   - Search for your bot username (e.g., `@boostbuddy_bot`)
   - Click `/start` button
   - This is required to allow bot to send messages

3. **Configure in BoostBuddy:**
   - Navigate to **User Panel → Notifications**
   - Find **Telegram Configuration** section
   - **Important**: Click the **"How to get your Chat ID"** help button
   - Paste your Chat ID (numeric only, no colons)
   - Click **Save**
   - Click **Test Notification** to verify

---

## 🔌 Telegram API Integration

### API Endpoint

```
POST https://api.telegram.org/bot{BOT_TOKEN}/sendMessage
```

### Message Format

```json
{
  "chat_id": "987654321",
  "text": "✅ *BoostBuddy Test Notification*\n\nYour Telegram bot is configured and working correctly.",
  "parse_mode": "Markdown"
}
```

### Response Handling

**Success Response:**
```json
{
  "ok": true,
  "result": {
    "message_id": 123,
    "from": {"id": 123456789, "is_bot": true, "first_name": "BoostBuddy Bot"},
    "chat": {"id": 987654321, "type": "private"},
    "date": 1696780000,
    "text": "notification content"
  }
}
```

**Error Response:**
```json
{
  "ok": false,
  "description": "bot was blocked by the user",
  "error_code": 403
}
```

---

## 🎨 Message Functions & Templates

### Multilingual Template System

The system uses **parameterized templates** in both English and Italian:

**Example Template Structure:**
```typescript
ACCOUNT_READY: {
  subject: "🎉 Your BoostBuddy Account is Ready!",
  body: (params) => `Hello ${params.name},\n\nYour ${params.role.toLowerCase()} account has been created...`
}
```

### Notification Types with Telegram Support

| Type | Priority | Telegram Template | Example Use Case |
|------|----------|-------------------|------------------|
| `ACCOUNT_READY` | HIGH | ✅ | New account created |
| `CREDITS_ADJUSTED` | HIGH | ✅ | Credits balance changed |
| `ORDER_ASSIGNED` | HIGH | ✅ | Employee order assignment |
| `ORDER_CANCELLED` | HIGH | ✅ | Order cancellation |
| `ORDER_ACCEPTED` | HIGH | ✅ | Order accepted by employee |
| `PROFILE_ASSIGNED` | MEDIUM | ✅ | Browser profile assigned |
| `PROFILE_EXPIRING` | MEDIUM | ✅ | Profile expiration warning |
| `INVOICE_GENERATED` | LOW | ✅ | New invoice created |
| `SYSTEM` | LOW | ✅ | System announcements |

### Message Formatting

**Bold Text:**
```
*Bold text*  → Bold text
```

**Links:**
```
[Link Text](https://example.com)
```

**Emojis:**
```
✅ ❌ 🎉 🔔 ⚠️ 📊 💰 👤
```

---

## 🔒 Security Features

### Chat ID Validation

The system includes **automatic validation** to prevent common mistakes:

1. **Bot ID Detection:**
   - Prevents users from entering the bot's ID instead of their Chat ID
   - Compares against bot token and returns specific error message

2. **Bot Chat ID Detection:**
   - Detects if Chat ID belongs to a bot account
   - Returns helpful error message directing to user info bots

3. **Blocked User Detection:**
   - Identifies if user has blocked the bot
   - Returns instruction to unblock or restart the bot

### Row-Level Security (RLS)

All Telegram configurations are protected by Supabase RLS:
- Users can only access their own configuration
- Admins can access all configurations
- Automatic user_id validation on all operations

---

## 🛠️ Enabling Telegram Notifications

### Current Status: DISABLED

The Telegram notification functionality is currently **disabled for development**. To enable for production:

### Step 1: Remove Development Disable

**File:** `app/actions/notifications.ts` (Line 159)
```typescript
// REMOVE THESE LINES:
// TELEGRAM NOTIFICATIONS DISABLED
console.info("[TELEGRAM] Notifications disabled - skipping delivery.");
return;
```

**File:** `app/actions/user-telegram.ts` (Lines 109-111)
```typescript
// REMOVE THESE LINES:
// TELEGRAM NOTIFICATIONS DISABLED
console.info("[TELEGRAM] User test notifications disabled - skipping API call.");
return { success: true };
```

### Step 2: Update dispatchToTelegram Function

**File:** `app/actions/notifications.ts` (Line 154)

**Replace current no-op function with:**
```typescript
async function dispatchToTelegram(
  credentials: TelegramCredentials | null,
  subject: string,
  body: string
): Promise<void> {
  if (!credentials) {
    console.warn("[TELEGRAM] No credentials configured - skipping delivery");
    return;
  }

  try {
    const url = `https://api.telegram.org/bot${credentials.bot_token}/sendMessage`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: credentials.chat_id,
        text: `*${subject}*\n\n${body}`,
        parse_mode: "Markdown",
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      console.error("[TELEGRAM] API Error:", error?.description || "Unknown error");
    } else {
      console.log("[TELEGRAM] Message delivered successfully");
    }
  } catch (error) {
    console.error("[TELEGRAM] Delivery failed:", error);
  }
}
```

### Step 3: Test Configuration

1. **Test Admin Bot:**
   - Go to Admin Panel → Notifications → Telegram Configuration
   - Click "Test Notification"
   - Should receive message in your Telegram

2. **Test User Configuration:**
   - Log in as a regular user
   - Configure personal Chat ID in User Panel → Notifications
   - Click "Test Notification"
   - Should receive message in your Telegram

3. **Test Real-time Notifications:**
   - Trigger a HIGH priority event (e.g., assign profile)
   - Verify notification appears in both web UI and Telegram

---

## 🔧 Troubleshooting

### Common Issues & Solutions

| Issue | Cause | Solution |
|-------|-------|----------|
| "bot was blocked by the user" | User blocked the bot | Go to Telegram, find bot, unblock it |
| "chat not found" | Wrong Chat ID or bot not started | Verify Chat ID and click `/start` with bot |
| "bot can't send messages to bots" | Entered Bot ID instead of Chat ID | Get correct Chat ID from @userinfobot |
| No message received | Bot not started | Click `/start` button with your bot |
| Messages delayed | Telegram API rate limiting | Built-in retry logic handles this |

### Verification Commands

**Check Bot Status:**
```bash
curl https://api.telegram.org/bot{BOT_TOKEN}/getMe
```

**Get Bot Information:**
```bash
curl https://api.telegram.org/bot{BOT_TOKEN}/getChat?chat_id={CHAT_ID}
```

---

## 📊 Database Schema

### admin Telegram Configuration
```sql
-- Stores in app_settings table
{
  "key": "telegram_bot",
  "value": {
    "bot_token": "123456789:ABCdefGHIjklMNOpqrsTUVwxyz",
    "chat_id": "987654321"
  }
}
```

### user Telegram Configuration
```sql
-- user_telegram_configs table
{
  "user_id": "uuid",
  "chat_id": "987654321",
  "created_at": "timestamp",
  "updated_at": "timestamp"
}
```

### Notification Logs
```sql
-- notification_logs table with Telegram support
{
  "id": "uuid",
  "user_id": "uuid",
  "recipient": "user@example.com",
  "subject": "Notification Subject",
  "body": "Notification body content",
  "type": "ORDER_ASSIGNED",
  "channel": "TELEGRAM",
  "priority": "HIGH",
  "status": "SENT",
  "is_read": false,
  "related_order_id": "order_uuid",
  "created_at": "timestamp"
}
```

---

## 🎯 Priority-Based Delivery

The system intelligently routes notifications based on priority:

### HIGH Priority (Real-time + Telegram)
- **Web**: Instant via Supabase Realtime WebSocket
- **Telegram**: Immediate delivery
- **Examples**: Order assigned, Order accepted, Credits adjusted

### MEDIUM Priority (Page Reload + Telegram)
- **Web**: Visible on next page load
- **Telegram**: Delivered within 1 minute
- **Examples**: Profile assigned, Payment received

### LOW Priority (Background + Telegram)
- **Web**: Visible in notification center
- **Telegram**: Batched delivery (every 5 minutes)
- **Examples**: System announcements, Weekly summaries

---

## 🌍 Multilingual Support

### Language Preference Detection

1. **Automatic Detection**: Email domain (`.it` → Italian)
2. **User Override**: Manual selection in notification center
3. **Fallback**: English as default

### Template Parameter System

```typescript
// Template with parameters
ORDER_ASSIGNED: {
  subject: "📦 New Order Assignment",
  body: (params) => `
    Hello ${params.employeeName},

    You have been assigned a new ${params.orderType} order.
    Client: ${params.clientName}
    Service: ${params.serviceName}

    Please review and accept the order.
  `
}
```

---

## ✅ Production Checklist

Before enabling Telegram notifications in production:

- [ ] Bot created via BotFather
- [ ] Bot token saved securely
- [ ] Admin Chat ID configured
- [ ] Test notification sent successfully
- [ ] Users instructed on Chat ID acquisition
- [ ] RLS policies verified for user_telegram_configs
- [ ] Development disable flags removed
- [ ] dispatchToTelegram function updated
- [ ] Real-time notifications tested
- [ ] Multilingual templates verified
- [ ] Error handling tested (blocked users, invalid IDs)

---

## 📞 Support & Resources

**Official Resources:**
- [Telegram Bot API](https://core.telegram.org/bots/api)
- [BotFather](https://t.me/botfather)
- [Telegram Bots FAQ](https://core.telegram.org/bots/faq)

**Helpful Bots:**
- `@userinfobot` - Get your Chat ID
- `@GetMyChatID_Bot` - Alternative Chat ID bot
- `@BotFather` - Create and manage bots

---

## 🔄 Integration with Real-time System

Telegram notifications work seamlessly with the priority-based real-time system:

1. **HIGH Priority Events**:
   - Web: Instant WebSocket notification
   - Telegram: Immediate delivery (parallel)

2. **Database Logging**:
   - All notifications logged to `notification_logs`
   - User-specific filtering via `user_id`

3. **Fallback Handling**:
   - If Telegram delivery fails, notification still logged
   - Web notifications continue working

This creates a **multi-channel notification system** where users receive alerts through both web and Telegram simultaneously.