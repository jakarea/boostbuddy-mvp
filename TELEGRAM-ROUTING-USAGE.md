# 📱 Telegram Notification Routing - Usage Examples

## 🎯 Routing Rules Implemented

Your specific requirements have been implemented:

✅ **Admin notifications**: All admins receive same notification (via admin groups + personal)
✅ **Employee notifications**: Single group notification only (admin-configured group)
✅ **Client notifications**: Individual personal notification only (personal Chat ID)

---

## 🚀 Usage Examples

### **1. Admin Notifications (All Admins)**

```typescript
// Send to ALL admins (admin groups + personal Chat IDs)
import { sendAdminNotificationAction } from '@/app/actions/telegram-routing';

const result = await sendAdminNotificationAction(
  "🚨 Critical System Alert",
  "Database connection failed. Immediate attention required.",
  "SYSTEM_ALERT",
  "HIGH",
  relatedOrderId
);

// Result: All admins receive notification via:
// - Admin Telegram groups (if configured)
// - Individual admin personal Chat IDs (if configured)
```

**Delivery Flow:**
```
Notification → Admin Groups (all) → Individual Admins (all)
              ↓                     ↓
         Group Chat IDs      Personal Chat IDs
```

### **2. Employee Notifications (Single Group)**

```typescript
// Send to ALL employees via single group
import { sendEmployeeNotificationAction } from '@/app/actions/telegram-routing';

const result = await sendEmployeeNotificationAction(
  "📦 New Order Available",
  `A new ${serviceType} order is now available for assignment.\n\nClient: ${clientName}\nPrice: €${price}`,
  "NEW_ORDER_AVAILABLE",
  "HIGH",
  orderId
);

// Result: Single message sent to employee group
```

**Delivery Flow:**
```
Notification → Employee Group (single)
              ↓
         Group Chat ID (one message)
```

### **3. Client Notifications (Individual)**

```typescript
// Send to specific client only
import { sendClientNotificationAction } from '@/app/actions/telegram-routing';

const result = await sendClientNotificationAction(
  "client@example.com",
  "✅ Profile Assigned",
  `Your browser profile has been assigned and is ready to use.\n\nProfile: ${profileName}\nExpires: ${expirationDate}`,
  "PROFILE_ASSIGNED",
  "HIGH",
  profileId
);

// Result: Only this specific client receives notification
```

**Delivery Flow:**
```
Notification → Individual Client Chat ID
              ↓
         Personal Chat ID (one message)
```

---

## 🔧 Integration Examples

### **Order Assignment Notification**

```typescript
// In your order assignment logic
import { sendAdminNotificationAction, sendEmployeeNotificationAction, sendClientNotificationAction } from '@/app/actions/telegram-routing';

export async function notifyOrderAssignment(orderId: string) {
  const order = await getOrderDetails(orderId);

  // 1. Notify admins (all admins get this)
  await sendAdminNotificationAction(
    "📦 New Order Placed",
    `Order #${order.id} has been placed by ${order.clientName}.\n\nService: ${order.serviceName}\nAmount: €${order.amount}`,
    "NEW_ORDER",
    "MEDIUM",
    orderId
  );

  // 2. Notify employees (all employees via group)
  await sendEmployeeNotificationAction(
    "🔔 New Order Available",
    `A new order is available for assignment!\n\nService: ${order.serviceName}\nPrice: €${order.amount}\nClient: ${order.clientName}\n\nCheck your dashboard for details.`,
    "ORDER_AVAILABLE",
    "HIGH",
    orderId
  );

  // 3. Notify client (only this client)
  await sendClientNotificationAction(
    order.clientEmail,
    "✅ Order Confirmed",
    `Your order has been confirmed and is being processed.\n\nOrder ID: ${order.id}\nService: ${order.serviceName}\nAmount: €${order.amount}\n\nWe'll notify you when it's assigned.`,
    "ORDER_CONFIRMED",
    "HIGH",
    orderId
  );
}
```

### **Profile Assignment Notification**

```typescript
export async function notifyProfileAssignment(profileId: string, clientEmail: string) {
  const profile = await getProfileDetails(profileId);

  // Notify admins
  await sendAdminNotificationAction(
    "🔗 Profile Assigned",
    `Profile ${profile.profileName} has been assigned to ${clientEmail}.`,
    "PROFILE_ASSIGNED_ADMIN",
    "MEDIUM",
    profileId
  );

  // Notify specific client only
  await sendClientNotificationAction(
    clientEmail,
    "✅ Browser Profile Ready",
    `Your browser profile is now ready!\n\nProfile: ${profile.profileName}\nLogin: ${profile.accountEmail}\nPassword: ${profile.accountPassword}\n\nExpires: ${profile.expirationDate}`,
    "PROFILE_ASSIGNED_CLIENT",
    "HIGH",
    profileId
  );
}
```

### **Review Completion Notification**

```typescript
export async function notifyReviewCompletion(reviewId: string) {
  const review = await getReviewDetails(reviewId);

  // Notify admins about review completion
  await sendAdminNotificationAction(
    "✅ Review Completed",
    `Review #${review.id} has been completed by employee ${review.employeeName}.\n\nClient: ${review.clientName}\nRating: ${review.rating}/5`,
    "REVIEW_COMPLETED",
    "MEDIUM",
    reviewId
  );

  // Notify client about their review
  await sendClientNotificationAction(
    review.clientEmail,
    "⭐ Review Completed",
    `Your review has been completed!\n\nService: ${review.serviceName}\nRating: ${review.rating}/5\nComments: ${review.comments}\n\nThank you for your feedback!`,
    "REVIEW_COMPLETED_CLIENT",
    "HIGH",
    reviewId
  );
}
```

---

## 🎯 Specific Use Cases

### **Employee Order Assignment**

```typescript
// When admin assigns order to specific employee
export async function notifyEmployeeOrderAssignment(orderId: string, employeeEmail: string) {
  const order = await getOrderDetails(orderId);

  // Notify admins (so they know assignment happened)
  await sendAdminNotificationAction(
    "👷 Order Assigned",
    `Order #${order.id} assigned to ${employeeEmail}`,
    "ORDER_ASSIGNED_ADMIN",
    "MEDIUM",
    orderId
  );

  // Notify employee group (employee will see it in group)
  await sendEmployeeNotificationAction(
    "📋 Order Assigned to You",
    `You have been assigned Order #${order.id}!\n\nService: ${order.serviceName}\nClient: ${order.clientName}\nPrice: €${order.amount}\n\nPlease complete the assignment.`,
    "ORDER_ASSIGNED_EMPLOYEE",
    "HIGH",
    orderId
  );
}
```

### **Payment Confirmation**

```typescript
export async function notifyPaymentConfirmation(orderId: string) {
  const order = await getOrderDetails(orderId);

  // Notify admins about payment
  await sendAdminNotificationAction(
    "💰 Payment Received",
    `Payment confirmed for Order #${order.id}\n\nAmount: €${order.amount}\nClient: ${order.clientName}`,
    "PAYMENT_CONFIRMED",
    "MEDIUM",
    orderId
  );

  // Notify client about payment confirmation
  await sendClientNotificationAction(
    order.clientEmail,
    "✅ Payment Confirmed",
    `Your payment of €${order.amount} has been confirmed!\n\nOrder ID: ${order.id}\nService: ${order.serviceName}\n\nYour order is now being processed.`,
    "PAYMENT_CONFIRMED_CLIENT",
    "HIGH",
    orderId
  );
}
```

### **System Alerts**

```typescript
export async function notifySystemAlert(issue: string, severity: "HIGH" | "MEDIUM" | "LOW") {
  // Only notify admins for system issues
  await sendAdminNotificationAction(
    `⚠️ System Alert: ${severity} Priority`,
    `System issue detected:\n\n${issue}\n\nPlease investigate immediately.`,
    "SYSTEM_ALERT",
    severity === "HIGH" ? "HIGH" : "MEDIUM"
  );
}
```

---

## 🔧 Testing the Routing System

### **Test Admin Notifications**

```typescript
// Test admin routing (should go to all admins)
const result = await sendAdminNotificationAction(
  "🧪 Admin Test",
  "This is a test message to verify all admins receive notifications.",
  "TEST",
  "MEDIUM"
);

console.log(`Admin test: ${result.delivered} delivered, ${result.failed} failed`);
console.log(`Method used: ${result.method}`);
```

### **Test Employee Notifications**

```typescript
// Test employee routing (should go to single group)
const result = await sendEmployeeNotificationAction(
  "🧪 Employee Test",
  "This is a test message to verify employee group receives notifications.",
  "TEST",
  "MEDIUM"
);

console.log(`Employee test: ${result.delivered} delivered, ${result.failed} failed`);
console.log(`Method used: ${result.method}`);
```

### **Test Client Notifications**

```typescript
// Test client routing (should go to specific client only)
const result = await sendClientNotificationAction(
  "test@example.com",
  "🧪 Client Test",
  "This is a test message to verify you receive notifications.",
  "TEST",
  "MEDIUM"
);

console.log(`Client test: ${result.delivered} delivered, ${result.failed} failed`);
console.log(`Method used: ${result.method}`);
```

---

## 📊 Routing Configuration Status

### **Check Current Configuration**

```typescript
import { getTelegramRoutingStatusAction } from '@/app/actions/telegram-routing';

const status = await getTelegramRoutingStatusAction();

console.log('Telegram Routing Status:', status.config);
// Output:
// {
//   botConfigured: true,
//   adminGroups: 2,           // Number of admin groups configured
//   employeeGroupConfigured: true,  // Employee group exists
//   clientsWithChatId: 15     // Number of clients with personal Chat IDs
// }
```

---

## 🎯 Complete Routing Flow Chart

```
┌─────────────────────────────────────────────────────────────┐
│                    Notification Request                       │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
            ┌──────────────────────┐
            │ Detect Recipient Role │
            └──────────────────────┘
                       │
        ┌──────────────┼──────────────┐
        │              │              │
        ▼              ▼              ▼
   ┌─────────┐   ┌──────────┐   ┌──────────┐
   │  ADMIN  │   │ EMPLOYEE │   │  CLIENT  │
   └─────────┘   └──────────┘   └──────────┘
        │              │              │
        ▼              ▼              ▼
┌─────────────────┐ ┌──────────┐ ┌──────────────┐
│ Send to:       │ │ Send to: │ │ Send to:     │
│ • Admin Groups │ │ Employee │ • Specific    │
│ • All Admins   │ │ Group    │ │ Client Only  │
│   (Personal)   │ │ (Single) │ │              │
└─────────────────┘ └──────────┘ └──────────────┘
```

---

## ✅ Implementation Complete

Your Telegram notification routing system is now complete with:

✅ **Admin**: Broadcasts to all admins via groups + personal
✅ **Employee**: Single group notification only
✅ **Client**: Individual personal notification only
✅ **Automatic role detection** from recipient email
✅ **Fallback to web notifications** if Telegram fails
✅ **Database logging** for all notifications
✅ **Real-time support** for HIGH priority messages

**The system follows your exact requirements!** 🎉