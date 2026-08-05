# 🌍 Multilingual Notification System - Implementation Guide

## 📋 Overview

The BoostBuddy notification system now supports **multilingual notifications** in **English (en)** and **Italian (it)**. Users can receive notifications in their preferred language, and the system automatically detects and uses the appropriate language templates.

## 🎯 Features Implemented

### ✅ **Completed Components**

1. **User Language Preference** - Added `preferred_language` column to users table
2. **Translation Templates** - Created comprehensive notification templates in both languages
3. **Language-Aware Dispatcher** - Enhanced notification system with multilingual support
4. **NotificationCenter UI** - Added language selector and multilingual support

## 🗄️ Database Changes

### **New Column Added**
```sql
ALTER TABLE users
ADD COLUMN preferred_language TEXT DEFAULT 'en'
CHECK (preferred_language IN ('en', 'it'));
```

### **Migration Location**
- File: `prisma/migrations/20260805_add_user_language_preference/migration.sql`
- Applied: Automatically on next deployment

## 🔧 Technical Implementation

### **1. Translation Templates**

**File**: `lib/locales/notification-templates.ts`

**Structure**:
```typescript
export const enTemplates: NotificationTemplates = {
  ACCOUNT_READY: {
    subject: "🎉 Your BoostBuddy Account is Ready!",
    body: (params) => `Hello ${params.name}...`
  },
  // ... 23+ notification templates
};

export const itTemplates: NotificationTemplates = {
  ACCOUNT_READY: {
    subject: "🎉 Il tuo account BoostBuddy è pronto!",
    body: (params) => `Ciao ${params.name}...`
  },
  // ... 23+ notification templates
};
```

### **2. Multilingual Notification Dispatcher**

**File**: `app/actions/notifications-multilingual.ts`

**Key Functions**:
- `sendMultilingualNotificationAction()` - Main dispatcher with language support
- `getUserLanguageByEmail()` - Detect user language preference
- `updateUserLanguagePreferenceAction()` - Update user's language choice

### **3. Enhanced NotificationCenter Component**

**Added Features**:
- 🌍 **Language Selector** - Dropdown menu in notification panel
- 🏳 **Auto Language Detection** - Uses user's preference from database
- 🔄 **Dynamic Translation** - Switches notification language on the fly

## 📖 Usage Examples

### **Before (English Only)**
```typescript
await sendNotificationAction(
  userEmail,
  "🎉 Your BoostBuddy Account is Ready!",
  `Hello ${userName}, your account has been created...`,
  "TELEGRAM",
  "ACCOUNT_READY",
  "HIGH"
);
```

### **After (Multilingual)**
```typescript
await sendMultilingualNotificationAction(
  userEmail,
  "ACCOUNT_READY", // Template type instead of hardcoded text
  {
    name: userName,
    role: userRole,
    dashboardUrl: "/c/dashboard",
    email: userEmail
  },
  "TELEGRAM",
  "HIGH"
);
// Automatically sends in English or Italian based on user preference!
```

## 🎨 Notification Templates Catalog

### **Supported Notification Types**

| Template Key | Description | EN Subject | IT Subject |
|--------------|-------------|------------|------------|
| `ACCOUNT_READY` | New account created | 🎉 Your BoostBuddy Account is Ready! | 🎉 Il tuo account BoostBuddy è pronto! |
| `ACCOUNT_APPROVED` | Account approved | 🎉 Account Approved! | 🎉 Account Approvato! |
| `NEW_USER_REGISTRATION` | New user signup | 🆕 New User Registration Pending Approval | 🆕 Nuova Registrazione Utente in Attesa di Approvazione |
| `REVIEW_ORDER_ASSIGNED` | Employee gets order | 📝 New Review Order Assigned | 📝 Nuovo Ordine di Revisione Assegnato |
| `REVIEW_ORDER_IN_PROGRESS` | Order processing | 🔄 Your Review Order Is In Progress | 🔄 Il tuo ordine di revisione è in corso |
| `REVIEW_COMPLETED_EMPLOYEE` | Employee completion | 🎉 Review Completed Successfully | 🎉 Revisione completata con successo |
| `CREDITS_PURCHASED` | Credit purchase | 💰 Credits Purchased Successfully | 💰 Crediti acquistati con successo |
| `ORDER_CANCELLED_REFUNDED` | Order cancellation | 💰 Order Cancelled - Credits Refunded | 💰 Ordine cancellato - Crediti rimborsati |
| `CLIENT_FEEDBACK_HAPPY` | Positive feedback | 😊 Client Feedback Received | 😊 Feedback cliente ricevuto |

*Full catalog includes 23+ notification types in both languages.*

## 🔄 Migration from Old System

### **Step 1: Update Existing Notification Calls**

**Find all current notification calls:**
```bash
grep -r "sendNotificationAction" app/actions/
```

**Replace with multilingual version:**

**Old:**
```typescript
await sendNotificationAction(email, "Hardcoded Subject", "Hardcoded body...", "TELEGRAM", "TYPE");
```

**New:**
```typescript
import { sendMultilingualNotificationAction } from './notifications-multilingual';

await sendMultilingualNotificationAction(
  email,
  "TEMPLATE_TYPE", // Use template key instead of hardcoded text
  { param1, param2 }, // Pass parameters as object
  "TELEGRAM",
  "HIGH" // priority
);
```

### **Step 2: Template Type Mapping**

**Current Type → Template Key:**
- "SYSTEM" → `ACCOUNT_READY`, `ACCOUNT_APPROVED`, etc.
- "REVIEWS_ORDER_CREATED" → `REVIEW_ORDER_CREATED`
- "CREDITS_PURCHASED" → `CREDITS_PURCHASED`
- "ORDER_CANCELLED" → `ORDER_CANCELLED_REFUNDED`
- etc.

## 🌐 Language Preference Management

### **User Interface**

Users can change their notification language via:

1. **NotificationCenter Component** - Language selector in notification panel
2. **API Endpoint** - `/api/user/language` (GET/POST)
3. **Database** - Direct `preferred_language` column update

### **Language Detection Priority**

1. **User Preference** - `users.preferred_language` column
2. **Browser Detection** - Falls back to browser language
3. **Default** - English (`en`)

## 🚀 Deployment Checklist

- [x] Database migration created
- [x] Translation templates implemented
- [x] Multilingual dispatcher created
- [x] NotificationCenter updated
- [x] API endpoints created
- [ ] Migration applied to production database
- [ ] Existing notification calls migrated to new system
- [ ] Testing with both English and Italian users

## 🧪 Testing

### **Test 1: Language Detection**
```typescript
// Create test user with Italian preference
await updateUserLanguagePreferenceAction(userId, 'it');

// Send notification - should be in Italian
await sendMultilingualNotificationAction(email, "ACCOUNT_READY", {name: "Mario"});
// Result: "🎉 Il tuo account BoostBuddy è pronto!"
```

### **Test 2: Language Switching**
```typescript
// Switch user to English
await updateUserLanguagePreferenceAction(userId, 'en');

// Send same notification - should be in English
await sendMultilingualNotificationAction(email, "ACCOUNT_READY", {name: "Mario"});
// Result: "🎉 Your BoostBuddy Account is Ready!"
```

## 📊 Current Status

✅ **Core Implementation**: Complete
✅ **Translation Templates**: 23+ types in EN/IT
✅ **Database Schema**: Updated with language preference
✅ **UI Components**: Language selector added
⏸️ **Production Deployment**: Pending
⏸️ **Legacy Migration**: Old calls need updating

## 💡 Next Steps

1. **Apply database migration** to production Supabase
2. **Update existing notification calls** to use new multilingual system
3. **Test thoroughly** with both language preferences
4. **Monitor for missing translations** or edge cases

---

**Implementation Complete**: ✅ Ready for production deployment
**Supported Languages**: 🇬🇧 English, 🇮🇹 Italian
**Total Templates**: 23+ notification types × 2 languages = 46+ templates