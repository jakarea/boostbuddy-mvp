# 🚀 Complete Telegram Notification Routing - Setup Guide

## 🎯 System Overview

Your Telegram notification routing system is now fully implemented with your specific requirements:

✅ **Admin Notifications**: All admins receive same notification (admin groups + personal)
✅ **Employee Notifications**: Single group notification only (admin-configured group)
✅ **Client Notifications**: Individual personal notification only (personal Chat ID)

---

## 📋 Implementation Checklist

### **Phase 1: Database Setup** (Required)

**1. Run the Telegram Group Migration**

```bash
# Copy the content of telegram-group-migration.sql
# Paste in Supabase SQL Editor and run
```

**What it creates:**
- `telegram_group_configs` table for team groups
- RLS policies for security
- Indexes for performance

### **Phase 2: Bot Configuration** (Required)

**1. Create Telegram Bot**

1. Open Telegram → Search `@BotFather`
2. Send `/newbot`
3. Follow prompts and save Bot Token
4. Format: `123456789:ABCdefGHIjklMNOpqrsTUVwxyz`

**2. Get Personal Chat ID**

1. Search for `@userinfobot` in Telegram
2. Click `/start`
3. Copy your Chat ID (numeric)

**3. Configure in System**

Go to **Admin Panel → Notifications → Telegram Configuration**
- Enter Bot Token
- Enter your Admin Chat ID
- Click "Save Configuration"
- Click "Test Notification"

### **Phase 3: Group Configuration** (Required for Employees)

**1. Create Employee Group**

1. Open Telegram → Create new group
2. Name it: "BoostBuddy Employees"
3. Add your bot to the group
4. Grant send message permissions

**2. Get Group Chat ID**

1. Add `@GetMyId` bot to the group
2. Bot will reply with Group Chat ID (negative number)
3. Format: `-1001234567890`

**3. Configure in System**

Go to **Admin Panel → Telegram Groups**
- Click "Add Group"
- Group Name: "BoostBuddy Employees"
- Group Chat ID: `-1001234567890`
- Group Type: "EMPLOYEE"
- Click "Save"
- Click "Test" to verify

### **Phase 4: Admin Group Setup** (Optional but Recommended)

**1. Create Admin Team Group**

1. Create Telegram group for admins
2. Add your bot to the group
3. Get Group Chat ID

**2. Configure in System**

- Add group in Admin Panel
- Group Type: "ADMIN"
- Test notification

### **Phase 5: Client Setup** (Optional - Individual Clients)

**For each client wanting notifications:**

1. Client gets personal Chat ID from `@userinfobot`
2. Client starts your bot (search for bot username → click `/start`)
3. Client configures in User Panel → Notifications → Telegram Configuration
4. Client enters personal Chat ID and saves

---

## 🔧 Testing the System

### **Quick Test Commands**

```typescript
// Test admin routing (all admins)
import { sendAdminNotificationAction } from '@/app/actions/telegram-routing';

await sendAdminNotificationAction(
  "🧪 Admin Test",
  "Testing admin notification routing",
  "TEST",
  "MEDIUM"
);

// Test employee routing (employee group)
import { sendEmployeeNotificationAction } from '@/app/actions/telegram-routing';

await sendEmployeeNotificationAction(
  "🧪 Employee Test",
  "Testing employee group notification routing",
  "TEST",
  "MEDIUM"
);

// Test client routing (individual client)
import { sendClientNotificationAction } from '@/app/actions/telegram-routing';

await sendClientNotificationAction(
  "client@example.com",
  "🧪 Client Test",
  "Testing client personal notification routing",
  "TEST",
  "MEDIUM"
);
```

### **Run Complete Test Suite**

```typescript
import { runTelegramRoutingTests } from '@/app/actions/telegram-routing-test';

const results = await runTelegramRoutingTests({
  testEmail: "your-test@example.com",
  runAll: true
});

console.log("Test Results:", results);
```

---

## 📊 Verification Checklist

After setup, verify each component:

### **Bot Configuration**
- [ ] Bot created via BotFather
- [ ] Bot Token saved in system
- [ ] Admin Chat ID configured
- [ ] Test notification received

### **Employee Group**
- [ ] Employee Telegram group created
- [ ] Bot added to group with permissions
- [ ] Group Chat ID configured in system
- [ ] Test message received in group

### **Admin Groups**
- [ ] Admin Telegram group(s) created
- [ ] Bot added to admin groups
- [ ] Group Chat IDs configured
- [ ] Test messages received

### **Client Configuration**
- [ ] Client knows how to get Chat ID
- [ ] Client has started bot
- [ ] Client configured personal Chat ID
- [ ] Client receives test messages

### **System Integration**
- [ ] Admin notifications reach all admins
- [ ] Employee notifications go to single group
- [ ] Client notifications are individual
- [ ] Database logging works
- [ ] Real-time notifications function

---

## 🎯 Usage Examples in Code

### **Order Placement Scenario**

```typescript
export async function handleNewOrder(orderId: string) {
  const order = await getOrderDetails(orderId);

  // 1. Notify ALL admins (all admins get this)
  await sendAdminNotificationAction(
    "📦 New Order Placed",
    `Order #${orderId} placed by ${order.clientName}\n\nService: ${order.serviceName}\nAmount: €${order.amount}`,
    "NEW_ORDER",
    "MEDIUM",
    orderId
  );

  // 2. Notify employee group (all employees see in group)
  await sendEmployeeNotificationAction(
    "🔔 New Order Available",
    `A new order is available for assignment!\n\nService: ${order.serviceName}\nPrice: €${order.amount}\nClient: ${order.clientName}`,
    "ORDER_AVAILABLE",
    "HIGH",
    orderId
  );

  // 3. Notify specific client (only this client)
  await sendClientNotificationAction(
    order.clientEmail,
    "✅ Order Confirmed",
    `Your order #${orderId} has been confirmed.\n\nService: ${order.serviceName}\nAmount: €${order.amount}\n\nWe'll notify you when assigned.`,
    "ORDER_CONFIRMED",
    "HIGH",
    orderId
  );
}
```

### **Profile Assignment Scenario**

```typescript
export async function handleProfileAssignment(profileId: string, clientEmail: string) {
  const profile = await getProfileDetails(profileId);

  // Notify admins
  await sendAdminNotificationAction(
    "🔗 Profile Assigned",
    `Profile ${profile.profileName} assigned to ${clientEmail}`,
    "PROFILE_ASSIGNED",
    "MEDIUM",
    profileId
  );

  // Notify specific client only
  await sendClientNotificationAction(
    clientEmail,
    "✅ Browser Profile Ready",
    `Your profile ${profile.profileName} is ready!\n\nLogin: ${profile.accountEmail}\nPassword: ${profile.accountPassword}\nExpires: ${profile.expirationDate}`,
    "PROFILE_READY",
    "HIGH",
    profileId
  );
}
```

---

## 🚨 Troubleshooting

### **Issue: "No employee group configured"**

**Solution:**
1. Create employee Telegram group
2. Add bot to group
3. Get Group Chat ID from `@GetMyId`
4. Configure in Admin Panel → Telegram Groups

### **Issue: "Client not receiving notifications"**

**Solution:**
1. Client needs to get personal Chat ID from `@userinfobot`
2. Client must start your bot (search username → `/start`)
3. Client configures Chat ID in User Panel → Notifications

### **Issue: "Admins not receiving notifications"**

**Solution:**
1. Check bot configuration (Bot Token + Chat ID)
2. Ensure admin groups are configured
3. Verify bot has permissions in admin groups
4. Test with individual admin Chat IDs

### **Issue: "Messages going to wrong place"**

**Solution:**
1. Check routing logic in `telegram-routing.ts`
2. Verify user roles are correct in database
3. Check group types (ADMIN vs EMPLOYEE vs CLIENT)

---

## 📈 Monitoring & Maintenance

### **Check System Status**

```typescript
import { getTelegramRoutingStatusAction } from '@/app/actions/telegram-routing';

const status = await getTelegramRoutingStatusAction();
console.log('System Status:', status.config);
```

### **Daily Tasks**
- Monitor failed notifications in database
- Check group accessibility (hourly cron job)
- Review notification logs

### **Weekly Tasks**
- Verify all groups are still accessible
- Test emergency notifications
- Review delivery success rates

### **Monthly Tasks**
- Clean up old notification logs (cron job)
- Update group memberships
- Review and optimize templates

---

## ✅ Production Deployment

### **Before Going Live**

1. **Test all routing scenarios** (Admin, Employee, Client)
2. **Verify group configurations** (accessibility, permissions)
3. **Test multilingual support** (English/Italian)
4. **Enable cron jobs** (retry failed, verify groups)
5. **Monitor system performance** (delivery times, success rates)

### **Environment Variables**

```env
# Required
TELEGRAM_BOT_TOKEN=your_bot_token_here

# Optional (if using cron jobs)
CRON_SECRET=your_cron_secret
APP_URL=https://your-domain.com
```

### **GitHub Secrets** (for cron jobs)

1. Go to GitHub repository → Settings → Secrets
2. Add `CRON_SECRET`
3. Add `APP_URL`

---

## 🎉 Summary

Your complete Telegram notification routing system includes:

✅ **Smart Routing**: Automatic routing based on user roles
✅ **Admin Broadcasting**: All admins receive notifications
✅ **Employee Group**: Single group for all employees
✅ **Client Personal**: Individual notifications
✅ **Multilingual Support**: English/Italian templates
✅ **Real-time Integration**: HIGH priority messages
✅ **Error Handling**: Graceful fallbacks
✅ **Database Logging**: Complete audit trail
✅ **Cron Jobs**: Automatic retry and maintenance

**The system is production-ready and follows your exact requirements!** 🚀