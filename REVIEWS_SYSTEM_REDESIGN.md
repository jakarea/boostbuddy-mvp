# BoostBuddy Reviews System - Comprehensive Redesign Documentation

## Implementation Status

### ✅ COMPLETED SECTIONS

- **Database Migration** (COMPLETED 2025-01-06)
  - SQL script created: `/migrations/reviews_system_redesign.sql`
  - Prisma schema updated
  - All new models defined:
    - ✅ ReviewUrl (Multi-URL support)
    - ✅ EmployeeEarnings (Employee wallet)
    - ✅ EmployeeEarningTransaction (Transaction ledger)
    - ✅ EmployeeEarningRule (Payment rules configuration)
    - ✅ EmployeePayoutRequest (Payout management)
  - Existing models updated:
    - ✅ ReviewOrder (added reviewUrls relation, totalUrls field)
    - ✅ EmployeeStats (added acceptingTasks field)
  - Data migration script included (migrates existing orders to ReviewUrl structure)
  - Default payment rules seeded

- **Server Actions** (COMPLETED 2025-01-06)
  - ✅ Multi-URL Support: `/app/actions/reviews-multiurl.ts`
    - createMultiUrlReviewOrderAction
    - getAvailableUrlTasksAction
    - acceptUrlTaskAction
    - getUrlTaskDetailAction
    - submitUrlTaskCompletionAction
  - ✅ Employee Earnings: `/app/actions/employee-earnings.ts`
    - getEmployeeEarningsAction
    - getEmployeeEarningsByTypeAction
    - getEmployeeEarningsHistoryAction
    - requestPayoutAction
    - updatePayoutDetailsAction
    - creditEmployeeEarningsAction (internal)
  - ✅ Admin Earnings: `/app/actions/admin-earnings.ts`
    - getAllEmployeeEarningsAction
    - getEmployeeEarningsDetailAction
    - Payment Rules CRUD (7 actions)
    - Payout Processing (2 actions)
    - Manual Adjustments
  - ✅ Task Distribution: `/app/actions/admin-reviews.ts`
    - toggleEmployeeTaskDistributionAction
    - getEmployeeTaskDistributionAction

- **UI Components** (COMPLETED 2025-01-06)
  - ✅ Copy Review Button: `/components/reviews/CopyReviewButton.tsx`
  - ✅ Employee Earnings Dashboard: `/app/e/earnings/page.tsx`
  - ✅ Admin Earnings Overview: `/app/a/earnings/page.tsx`
  - ✅ Payment Rules Configuration: `/app/a/earnings/rules/page.tsx`
  - ✅ Payout Processing: `/app/a/earnings/payouts/page.tsx`

### 🔄 IN PROGRESS

- Client multi-URL order creation form update
- Employee dashboard URL tasks view
- Existing pages integration with new features

### ⏳ PENDING

- End-to-end testing
- Payment method configuration for employees
- Documentation updates for new workflows

---

## Executive Summary

This document provides a complete analysis of the current Reviews System implementation against the new simplified requirements, including what exists, what needs to be removed, what needs to be added, and implementation guidance for each role (Admin, Employee, Customer).

**Current Status**: The system has a functional review order management platform with client credit purchasing, but lacks employee compensation and multi-URL support.

**Target State**: A simplified, fast employee workflow with multi-URL support, automated earnings tracking, and configurable payment rules.

---

## Part 1: Current Implementation Analysis

### Database Schema (Prisma)

#### ✅ Existing Models

**ReviewOrder** - Core order model
```prisma
- Single URL per order (facebookUrl, businessUrl) ❌ NEEDS MULTI-URL
- Order types: REVIEW, COMMENT, COMMENT_WITH_PHOTO ✅
- Employee assignment: assignedEmployeeId ✅
- Status: PENDING, IN_PROGRESS, COMPLETED, CANCELLED ✅
- Review content: commentText (pipe-separated), photoUrls (JSON) ✅
- Auto-approval: adminVerificationStatus, adminVerifiedAt ✅
```

**EmployeeStats** - Employee performance tracking
```prisma
- isAvailable: Boolean ✅ (but used differently than requirements)
- ordersCompleted: Int ✅
- lastActiveAt: DateTime ✅
- ❌ NO earnings tracking
- ❌ NO wallet/balance
```

**ReviewCreditPricing** - Credit pricing for clients
```prisma
- orderType: String ✅
- creditsPerUnit: Int ✅
- isActive: Boolean ✅
```

**User** - Extended with review fields
```prisma
- creditsBalance: Int ✅ (CLIENT credits)
- acceptingOrders: Boolean ✅ (employee availability)
- telegramChatId: String? ✅
- ❌ NO employee wallet/earnings
```

#### ❌ Missing Models

**EmployeeEarnings** - Employee compensation tracking (NEEDED)
```prisma
id: UUID @default(uuid())
userId: String (FK to User)
balance: Decimal @default(0) // Current wallet balance
totalEarned: Decimal @default(0) // Lifetime earnings
currentPeriodEarned: Decimal @default(0) // This month/period
status: "ACTIVE" | "FROZEN" | "BANNED"
createdAt, updatedAt
```

**EmployeeEarningRule** - Configurable payment rules (NEEDED)
```prisma
id: UUID @default(uuid())
orderType: String // "REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"
reviewType: String? // "FACEBOOK", "GOOGLE", etc.
paymentAmount: Decimal // Payment per completed task
currency: String @default("EUR")
isActive: Boolean @default(true)
priority: Int @default(0) // For rule matching
createdAt, updatedAt
```

**EmployeeEarningTransaction** - Earnings ledger (NEEDED)
```prisma
id: UUID @default(uuid())
employeeEarningId: String (FK to EmployeeEarnings)
type: "EARN" | "PAYOUT" | "ADJUSTMENT" | "BONUS"
amount: Decimal
balanceAfter: Decimal
description: String
referenceOrderId: String? // Link to ReviewOrder
metadata: String? // JSON
createdAt: DateTime
```

**ReviewUrl** - Multi-URL support (NEEDED)
```prisma
id: UUID @default(uuid())
reviewOrderId: String (FK to ReviewOrder)
url: String
quantity: Int // How many reviews for this URL
reviewContent: String? // Specific content for this URL
orderIndex: Int // Order within the parent order
```

---

### Server Actions Analysis

#### ✅ Existing Actions

**app/actions/reviews.ts** (Client operations)
- `getReviewCreditCostAction()` - Get pricing ✅
- `createReviewOrderAction()` - Create order (single URL only) ❌ NEEDS MULTI-URL
- `getClientReviewOrdersAction()` - Get client orders ✅
- `getReviewOrderDetailAction()` - Order details ✅
- `submitClientFeedbackAction()` - Client feedback ✅

**app/actions/employee.ts** (Employee operations)
- `getAvailableOrdersAction()` - Available orders ✅
- `getCurrentAssignmentsAction()` - Current assignments ✅
- `acceptOrderAction()` - Accept order ✅
- `submitCompletedReviewAction()` - Submit proof ✅
- `completeReviewAction()` - Mark complete ✅
- `toggleAvailabilityAction()` - Toggle availability ✅
- `getEmployeeStatsAction()` - Get stats ✅
- `getEmployeeOrderHistoryAction()` - Order history ✅
- `getEmployeeCompletedReviewsAction()` - Completed reviews ✅

**app/actions/admin-reviews.ts** (Admin operations)
- `getAllReviewOrdersAction()` - All orders with pagination ✅
- `assignReviewToEmployeeAction()` - Admin assignment ✅
- `cancelReviewOrderAction()` - Cancel with refund ✅
- `getAvailableEmployeesAction()` - Employee list ✅
- `getEmployeePerformanceAction()` - Employee stats ✅
- `toggleEmployeeAcceptingOrdersAction()` - Toggle accepting ✅
- `setEmployeeActiveStatusAction()` - Activate/deactivate ✅

#### ❌ Missing Actions (NEEDED)

**Employee Earnings Actions**
- `getEmployeeEarningsAction()` - Get employee earnings/balance
- `getEmployeeEarningsHistoryAction()` - Earnings transaction history
- `requestPayoutAction()` - Request payout
- `getEmployeeEarningsByTypeAction()` - Earnings breakdown by review type
- `getEmployeeEarningsByPeriodAction()` - Earnings by date/month

**Admin Earnings Actions**
- `getAllEmployeeEarningsAction()` - All employee earnings with filters
- `getEarningRulesAction()` - Get payment rules
- `createEarningRuleAction()` - Create payment rule
- `updateEarningRuleAction()` - Update payment rule
- `deleteEarningRuleAction()` - Delete payment rule
- `toggleEarningRuleAction()` - Activate/deactivate rule
- `adminAdjustEarningsAction()` - Manual adjustment
- `processPayoutAction()` - Process payout request

**Multi-URL Actions**
- `createMultiUrlReviewOrderAction()` - Create order with multiple URLs
- `assignUrlToEmployeeAction()` - Assign specific URL from order
- `getAvailableUrlsAction()` - Get available URLs to work on
- `getUrlTaskDetailAction()` - Get specific URL task details

---

### UI Pages Analysis

#### ✅ Existing Pages

**Client Pages** (`/app/c/services/reviews/`)
- `/page.tsx` - Reviews dashboard ✅
- `/new-order/page.tsx` - Create order (single URL) ❌ NEEDS MULTI-URL
- `/orders/page.tsx` - Client's orders list ✅
- `/orders/[id]/page.tsx` - Order details ✅

**Employee Pages** (`/app/e/`)
- `/dashboard/page.tsx` - Employee dashboard ✅ (simplify needed)
- `/orders/[id]/page.tsx` - Order detail/submission ✅ (add copy button)
- `/reviews/page.tsx` - Reviews portal ❌ MAY REMOVE
- `/reviews/completed/page.tsx` - Completed reviews ❌ TO REMOVE

**Admin Pages** (`/app/a/reviews/`)
- `/page.tsx` - Reviews overview ✅
- `/queue/page.tsx` - Orders queue ❌ TO REMOVE
- `/employees/page.tsx` - Employee performance ✅ (needs earnings tab)
- `/history/page.tsx` - Review order history ❌ TO REMOVE
- `/services/reviews/pricing/page.tsx` - Credit pricing ✅

#### ❌ Missing Pages (NEEDED)

**Employee Pages**
- `/earnings/` - Employee earnings dashboard
  - Total earned, current period, wallet balance
  - Earnings by type breakdown
  - Earnings history
  - Payout request button

**Admin Pages**
- `/earnings/` - Admin earnings center
  - Employee earnings overview table
  - Per-employee detailed breakdown
  - Earnings by period
  - Earnings by review type
  - Calendar/history view
- `/earnings/rules/` - Payment rules management
  - Create/edit/delete payment rules
  - Rule priority matching
  - Active/inactive toggles

---

### Current Workflow

#### ✅ Existing Flow

```
CUSTOMER CREATES ORDER (Single URL)
├─ Select order type (REVIEW/COMMENT/COMMENT_WITH_PHOTO)
├─ Enter ONE Facebook URL
├─ Set quantity (1-50)
├─ Add review content (pipe-separated storage)
├─ Credits validated and deducted
└─ Order created with status PENDING

ORDER ASSIGNMENT (Two methods)
├─ Admin: Admin assigns to specific employee
└─ Employee: Employee accepts from available list
└─ Status → IN_PROGRESS

EMPLOYEE COMPLETES
├─ Views order details
├─ Completes review on Facebook
├─ Submits proof of completion
├─ Status → COMPLETED
├─ Auto-approved (admin_verification_status = "APPROVED")
└─ EmployeeStats.ordersCompleted++

CLIENT FEEDBACK
├─ Views completed order
└─ Submits feedback (HAPPY/UNHAPPY/ANGRY)
```

#### ❌ Missing Flow Components

1. **Multi-URL Creation**
   - Customer should be able to add multiple URLs in one order
   - Distribute quantity across URLs
   - Each URL becomes a separate task

2. **Employee Earnings**
   - No calculation of earnings per completed task
   - No employee wallet
   - No payout mechanism

3. **Copy Review Button**
   - Employee needs one-click copy of review content

4. **Task Distribution Control**
   - Separate ON/OFF for receiving new tasks
   - Different from account activation

---

## Part 2: What to Remove

### Pages to Delete

```
DELETE: /app/a/reviews/queue/page.tsx
  Reason: Standalone queue page - not needed in simplified workflow
  Alternative: Use overview page or employee dashboard

DELETE: /app/a/reviews/history/page.tsx
  Reason: Audit/history section - not needed per requirements
  Alternative: Employee earnings history covers completion data

DELETE: /app/e/reviews/completed/page.tsx
  Reason: Separate completed reviews page - unnecessary navigation
  Alternative: Show in earnings history or main dashboard

DELETE: /app/e/reviews/page.tsx (if exists)
  Reason: Duplicate of dashboard functionality
  Alternative: Consolidate into main dashboard
```

### Database Fields to Remove

```
ReviewOrder.clientFeedback → Remove (not used, no action taken)
ReviewOrder.adminVerificationStatus → Keep (but simplify to verified boolean)
```

### Actions to Remove/Deprecate

```
DEPRECATE: SkippedReview functionality
  Reason: Overcomplicates workflow
  Alternative: Simple accept/decline on dashboard

DEPRECATE: Separate getEmployeeCompletedReviewsAction
  Reason: Unnecessary separate endpoint
  Alternative: Use getEmployeeOrderHistoryAction with status filter
```

---

## Part 3: What to Add

### 1. Multi-URL Support

#### Database Changes

```prisma
// Add to ReviewOrder or create new ReviewUrl model
model ReviewUrl {
  id              String   @id @default(uuid())
  reviewOrderId   String   @map("review_order_id")
  reviewOrder     ReviewOrder @relation(fields: [reviewOrderId], references: [id], onDelete: Cascade)

  url             String
  quantity        Int      @default(1)  // How many reviews for this URL
  reviewContent   String?  @map("review_content")   // Content for this specific URL
  reviewIndex     Int      @map("review_index")     // Index within the order (0, 1, 2...)
  status          String   @default("PENDING")  // "PENDING", "ASSIGNED", "COMPLETED"

  assignedEmployeeId String?  @map("assigned_employee_id")
  assignedEmployee   User?    @relation("ReviewUrlEmployee", fields: [assignedEmployeeId], references: [id])
  assignedAt         DateTime? @map("assigned_at")

  completedAt      DateTime? @map("completed_at")
  proofOfCompletion String?  @map("proof_of_completion")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([assignedEmployeeId])
  @@index([reviewOrderId])
}

// Update ReviewOrder to reference URLs
model ReviewOrder {
  // ... existing fields ...

  reviewUrls     ReviewUrl[]  // New relation
  totalUrls      Int          @map("total_urls")  // Number of unique URLs
  distribution   String       @map("distribution") // JSON: [{urlIndex: 0, quantity: 5}, ...]
}
```

#### New Actions

```typescript
// app/actions/reviews.ts

export async function createMultiUrlReviewOrderAction(data: {
  orderType: "REVIEW" | "COMMENT" | "COMMENT_WITH_PHOTO";
  urls: Array<{
    url: string;
    quantity: number;
    reviewContent?: string;  // For REVIEW type
    photos?: string[];       // For COMMENT_WITH_PHOTO
  }>;
  reactionType?: "LIKE" | "LOVE" | "CARE" | "HAHA" | "WOW" | "SAD" | "ANGRY";
}) {
  // Validate total quantity across all URLs
  // Create ReviewOrder
  // Create ReviewUrl entries for each URL
  // Deduct credits
  // Broadcast to employees
}

export async function getAvailableUrlTasksAction() {
  // Get all PENDING ReviewUrl entries
  // For employees to see available URL-specific tasks
}

export async function assignUrlToEmployeeAction(urlTaskId: string) {
  // Employee accepts a specific URL task
  // Uses conditional UPDATE to prevent race conditions
  // Updates assigned_employee_id, status = "ASSIGNED"
}
```

#### UI Changes

**Client Order Creation** (`/c/services/reviews/new-order/page.tsx`)
```tsx
// Add URL management
const [urls, setUrls] = useState([
  { url: '', quantity: 5, reviewContent: '', photos: [] }
]);

// Add URL button
<button onClick={() => setUrls([...urls, {
  url: '', quantity: 5, reviewContent: '', photos: []
}])}>
  + Add Another URL
</button>

// Dynamic URL inputs
{urls.map((urlObj, index) => (
  <div key={index}>
    <Input
      placeholder="Facebook URL"
      value={urlObj.url}
      onChange={(e) => updateUrl(index, 'url', e.target.value)}
    />
    <Input
      type="number"
      label="Quantity for this URL"
      value={urlObj.quantity}
      onChange={(e) => updateUrl(index, 'quantity', parseInt(e.target.value))}
    />
    {/* Review content or photos based on order type */}
  </div>
))}
```

**Employee Dashboard** (`/e/dashboard/page.tsx`)
```tsx
// Show URL-specific tasks instead of full orders
{availableUrlTasks.map(task => (
  <UrlTaskCard
    url={task.url}
    quantity={task.quantity}
    reviewContent={task.reviewContent}
    reactionType={task.reviewOrder.reactionType}
    credits={task.credits}
    onAccept={() => acceptUrlTask(task.id)}
  />
))}
```

---

### 2. Copy Review Button

#### UI Component

```tsx
// components/reviews/CopyReviewButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { toast } from '@/context/ToastContext';
import { Check, Copy } from 'lucide-react';

export function CopyReviewButton({ content }: { content: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Review copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy review');
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? "success" : "outline"}
      className="gap-2"
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Review'}
    </Button>
  );
}
```

#### Usage in Employee Pages

```tsx
// /e/orders/[id]/page.tsx

import { CopyReviewButton } from '@/components/reviews/CopyReviewButton';

// In the order detail view
<div className="flex items-center justify-between">
  <div>
    <h3>Review Content</h3>
    <p>{order.reviewContent}</p>
  </div>
  <CopyReviewButton content={order.reviewContent} />
</div>
```

---

### 3. Employee Earnings System

#### Database Schema

```prisma
// Employee Earnings Wallet
model EmployeeEarnings {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  balance             Decimal  @default(0)  @db.Decimal(10, 2)
  totalEarned         Decimal  @default(0)  @db.Decimal(10, 2)
  currentPeriodEarned Decimal  @default(0)  @db.Decimal(10, 2)
  lastPayoutAt        DateTime? @map("last_payout_at")

  status              String   @default("ACTIVE")  // "ACTIVE", "FROZEN", "BANNED"

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  transactions        EmployeeEarningTransaction[]

  @@index([status])
}

// Earning Transaction Ledger
model EmployeeEarningTransaction {
  id                  String   @id @default(uuid())
  employeeEarningsId  String   @map("employee_earnings_id")
  employeeEarnings    EmployeeEarnings @relation(fields: [employeeEarningsId], references: [id], onDelete: Cascade)

  type                String   // "EARN", "PAYOUT", "ADJUSTMENT", "BONUS"
  amount              Decimal  @db.Decimal(10, 2)
  balanceAfter        Decimal  @map("balance_after") @db.Decimal(10, 2)

  description         String
  referenceOrderId    String?  @map("reference_order_id")
  referenceType       String?  @map("reference_type")  // "REVIEW", "COMMENT", etc.
  metadata            String?  // JSON for additional context

  createdAt           DateTime @default(now()) @map("created_at")

  @@index([employeeEarningsId])
  @@index([createdAt])
  @@index([type])
}

// Payment Rules Configuration
model EmployeeEarningRule {
  id              String   @id @default(uuid())

  orderType       String   @map("order_type")     // "REVIEW", "COMMENT", "COMMENT_WITH_PHOTO"
  reviewType      String?  @map("review_type")     // "FACEBOOK", "GOOGLE", etc. (null = all)
  reactionType    String?  @map("reaction_type")   // "LIKE", "LOVE", etc. (null = all)

  paymentAmount   Decimal  @map("payment_amount") @db.Decimal(10, 2)
  currency        String   @default("EUR")

  isActive        Boolean  @map("is_active") @default(true)
  priority        Int      @default(0)  // Higher priority checked first

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([isActive])
  @@index([priority])
}

// Payout Requests
model EmployeePayoutRequest {
  id              String   @id @default(uuid())
  employeeEarningsId String  @map("employee_earnings_id")
  employeeEarnings EmployeeEarnings @relation(fields: [employeeEarningsId], references: [id])

  amount          Decimal  @db.Decimal(10, 2)
  status          String   @default("PENDING")  // "PENDING", "PROCESSING", "COMPLETED", "REJECTED"
  rejectionReason String?  @map("rejection_reason")

  requestedAt     DateTime @default(now()) @map("requested_at")
  processedAt     DateTime? @map("processed_at")
  processedBy     String?  @map("processed_by")  // Admin user ID
  metadata        String?  // Payment details, method, etc.

  @@index([status])
  @@index([employeeEarningsId])
}
```

#### Server Actions

```typescript
// app/actions/employee-earnings.ts

"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";

/**
 * Get employee earnings and wallet balance
 */
export async function getEmployeeEarningsAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  if (auth.user.role !== 'EMPLOYEE') {
    return { success: false, error: "Employee only" };
  }

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_earnings")
    .select("*")
    .eq("user_id", auth.user.id)
    .single();

  if (error && error.code !== 'PGRST116') {
    return { success: false, error: error.message };
  }

  // Create if not exists
  if (!data) {
    const { data: newEarnings, error: createError } = await supabase
      .from("employee_earnings")
      .insert({
        user_id: auth.user.id,
        balance: 0,
        total_earned: 0,
        current_period_earned: 0,
        status: "ACTIVE"
      })
      .select()
      .single();

    if (createError) return { success: false, error: createError.message };
    return { success: true, data: newEarnings };
  }

  return { success: true, data };
}

/**
 * Get employee earnings breakdown by review type
 */
export async function getEmployeeEarningsByTypeAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_earning_transactions")
    .select("reference_type, amount, created_at")
    .eq("employee_earnings.user_id", auth.user.id)
    .eq("type", "EARN")
    .order("created_at", { ascending: false });

  if (error) return { success: false, error: error.message };

  // Group by type
  const byType = data?.reduce((acc, tx) => {
    const type = tx.reference_type || "OTHER";
    acc[type] = (acc[type] || 0) + parseFloat(tx.amount);
    return acc;
  }, {} as Record<string, number>) || {};

  return { success: true, data: byType };
}

/**
 * Get employee earnings history/ledger
 */
export async function getEmployeeEarningsHistoryAction(limit: number = 50) {
  const auth = await requireAuth();
  if (!auth.success) return auth;

  const supabase = await createClient();

  const { data, error } = await supabase
    .from("employee_earning_transactions")
    .select("*")
    .eq("employee_earnings.user_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) return { success: false, error: error.message };

  return { success: true, data };
}

/**
 * Request payout
 */
export async function requestPayoutAction(amount: number) {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  if (auth.user.role !== 'EMPLOYEE') {
    return { success: false, error: "Employee only" };
  }

  const supabaseAdmin = await createAdminClient();

  // Get current earnings
  const { data: earnings } = await supabaseAdmin
    .from("employee_earnings")
    .select("balance")
    .eq("user_id", auth.user.id)
    .single();

  if (!earnings) return { success: false, error: "Earnings account not found" };
  if (parseFloat(earnings.balance) < amount) {
    return { success: false, error: "Insufficient balance" };
  }

  // Create payout request
  const { error } = await supabaseAdmin
    .from("employee_payout_requests")
    .insert({
      employee_earnings_id: earnings.id,
      amount: amount,
      status: "PENDING"
    });

  if (error) return { success: false, error: error.message };

  return { success: true };
}

/**
 * Credit earnings to employee (called when order is completed)
 */
export async function creditEmployeeEarningsAction(
  employeeId: string,
  orderType: string,
  reviewType: string,
  orderId: string
) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  // Find applicable payment rule
  const { data: rule } = await supabaseAdmin
    .from("employee_earning_rules")
    .select("*")
    .eq("order_type", orderType)
    .eq("is_active", true)
    .or(`review_type.is.null,review_type.eq.${reviewType}`)
    .order("priority", { ascending: false })
    .limit(1)
    .single();

  if (!rule) {
    console.error("No payment rule found for:", { orderType, reviewType });
    return { success: false, error: "No payment rule configured" };
  }

  const paymentAmount = parseFloat(rule.payment_amount);

  // Get or create employee earnings
  const { data: earnings } = await supabaseAdmin
    .from("employee_earnings")
    .select("*")
    .eq("user_id", employeeId)
    .single();

  if (!earnings) {
    // Create new
    const { data: newEarnings, error: createError } = await supabaseAdmin
      .from("employee_earnings")
      .insert({
        user_id: employeeId,
        balance: paymentAmount,
        total_earned: paymentAmount,
        current_period_earned: paymentAmount,
        status: "ACTIVE"
      })
      .select()
      .single();

    if (createError) return { success: false, error: createError.message };

    // Create transaction
    await supabaseAdmin
      .from("employee_earning_transactions")
      .insert({
        employee_earnings_id: newEarnings.id,
        type: "EARN",
        amount: paymentAmount,
        balance_after: paymentAmount,
        description: `Earning for ${orderType} - ${reviewType}`,
        reference_order_id: orderId,
        reference_type: orderType
      });

    return { success: true, amount: paymentAmount };
  }

  // Update existing
  const newBalance = parseFloat(earnings.balance) + paymentAmount;
  const newTotal = parseFloat(earnings.total_earned) + paymentAmount;
  const newPeriod = parseFloat(earnings.current_period_earned) + paymentAmount;

  const { error: updateError } = await supabaseAdmin
    .from("employee_earnings")
    .update({
      balance: newBalance,
      total_earned: newTotal,
      current_period_earned: newPeriod
    })
    .eq("user_id", employeeId);

  if (updateError) return { success: false, error: updateError.message };

  // Create transaction
  await supabaseAdmin
    .from("employee_earning_transactions")
    .insert({
      employee_earnings_id: earnings.id,
      type: "EARN",
      amount: paymentAmount,
      balance_after: newBalance,
      description: `Earning for ${orderType} - ${reviewType}`,
      reference_order_id: orderId,
      reference_type: orderType
    });

  return { success: true, amount: paymentAmount };
}
```

#### Admin Actions

```typescript
// app/actions/admin-earnings.ts

"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { requireAuth } from "@/lib/auth/server-auth";
import { revalidatePath } from "next/cache";

/**
 * Get all employee earnings with filters
 */
export async function getAllEmployeeEarningsAction(filters?: {
  status?: string;
  page?: number;
  pageSize?: number;
  searchTerm?: string;
}) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabase = await createAdminClient();

  // Implementation similar to getEmployeePerformanceAction
  // Return earnings, user info, pagination
}

/**
 * Get earning rules
 */
export async function getEarningRulesAction() {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabase = await createAdminClient();

  const { data, error } = await supabase
    .from("employee_earning_rules")
    .select("*")
    .order("priority", { ascending: false })
    .order("order_type", { ascending: true });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * Create earning rule
 */
export async function createEarningRuleAction(data: {
  orderType: string;
  reviewType?: string;
  paymentAmount: number;
  currency?: string;
  priority?: number;
}) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  const { error } = await supabaseAdmin
    .from("employee_earning_rules")
    .insert({
      order_type: data.orderType,
      review_type: data.reviewType || null,
      payment_amount: data.paymentAmount,
      currency: data.currency || "EUR",
      priority: data.priority || 0,
      is_active: true
    });

  if (error) return { success: false, error: error.message };

  revalidatePath("/a/earnings/rules");
  return { success: true };
}

/**
 * Toggle earning rule active status
 */
export async function toggleEarningRuleAction(ruleId: string) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  // Get current status
  const { data: rule } = await supabaseAdmin
    .from("employee_earning_rules")
    .select("is_active")
    .eq("id", ruleId)
    .single();

  if (!rule) return { success: false, error: "Rule not found" };

  const newStatus = !rule.is_active;

  const { error } = await supabaseAdmin
    .from("employee_earning_rules")
    .update({ is_active: newStatus })
    .eq("id", ruleId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/a/earnings/rules");
  return { success: true, data: { isActive: newStatus } };
}

/**
 * Get payout requests
 */
export async function getPayoutRequestsAction(filters?: {
  status?: string;
  page?: number;
  pageSize?: number;
}) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabase = await createAdminClient();

  // Get payout requests with employee info
  const { data, error } = await supabaseAdmin
    .from("employee_payout_requests")
    .select("*, employee_earnings(*, user:user_id(name, email))")
    .order("requested_at", { ascending: false });

  if (error) return { success: false, error: error.message };
  return { success: true, data };
}

/**
 * Process payout request
 */
export async function processPayoutAction(requestId: string, action: "APPROVE" | "REJECT", metadata?: any) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  const { data: request } = await supabaseAdmin
    .from("employee_payout_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (!request) return { success: false, error: "Request not found" };
  if (request.status !== "PENDING") {
    return { success: false, error: "Request already processed" };
  }

  if (action === "APPROVE") {
    // Deduct from balance and create transaction
    const { data: earnings } = await supabaseAdmin
      .from("employee_earnings")
      .select("balance")
      .eq("id", request.employee_earnings_id)
      .single();

    const newBalance = parseFloat(earnings.balance) - parseFloat(request.amount);

    await supabaseAdmin
      .from("employee_earnings")
      .update({ balance: newBalance })
      .eq("id", request.employee_earnings_id);

    await supabaseAdmin
      .from("employee_earning_transactions")
      .insert({
        employee_earnings_id: request.employee_earnings_id,
        type: "PAYOUT",
        amount: -parseFloat(request.amount),
        balance_after: newBalance,
        description: "Payout - " + (metadata?.method || "Bank Transfer"),
        metadata: JSON.stringify(metadata)
      });

    await supabaseAdmin
      .from("employee_payout_requests")
      .update({
        status: "COMPLETED",
        processed_at: new Date().toISOString(),
        processed_by: auth.user.id,
        metadata: JSON.stringify(metadata)
      })
      .eq("id", requestId);

  } else {
    // Reject
    await supabaseAdmin
      .from("employee_payout_requests")
      .update({
        status: "REJECTED",
        rejection_reason: metadata?.reason || "Rejected by admin"
      })
      .eq("id", requestId);
  }

  revalidatePath("/a/earnings/payouts");
  return { success: true };
}
```

---

### 4. Employee Earnings UI

#### Employee Earnings Dashboard

```tsx
// app/e/earnings/page.tsx

'use client';

import { useEffect, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { getEmployeeEarningsAction, getEmployeeEarningsByTypeAction, requestPayoutAction } from '@/app/actions/employee-earnings';

export default function EmployeeEarningsPage() {
  const [earnings, setEarnings] = useState(null);
  const [byType, setByType] = useState({});
  const [payoutAmount, setPayoutAmount] = useState(0);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [earningsRes, byTypeRes] = await Promise.all([
      getEmployeeEarningsAction(),
      getEmployeeEarningsByTypeAction()
    ]);

    if (earningsRes.success) setEarnings(earningsRes.data);
    if (byTypeRes.success) setByType(byTypeRes.data);
  };

  const handleRequestPayout = async () => {
    if (payoutAmount <= 0 || payoutAmount > earnings.balance) return;

    const result = await requestPayoutAction(payoutAmount);
    if (result.success) {
      toast.success('Payout request submitted!');
      loadData();
      setPayoutAmount(0);
    }
  };

  if (!earnings) return <div>Loading...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">My Earnings</h1>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <h3>Total Earned</h3>
          <p className="text-2xl font-bold">€{earnings.total_earned}</p>
        </Card>
        <Card>
          <h3>Current Period</h3>
          <p className="text-2xl font-bold">€{earnings.current_period_earned}</p>
          <p className="text-sm text-gray-500">This month</p>
        </Card>
        <Card>
          <h3>Wallet Balance</h3>
          <p className="text-2xl font-bold">€{earnings.balance}</p>
        </Card>
      </div>

      {/* Earnings by Type */}
      <Card>
        <h3>Earnings by Review Type</h3>
        <div className="space-y-2">
          {Object.entries(byType).map(([type, amount]) => (
            <div key={type} className="flex justify-between">
              <span>{type}</span>
              <span>€{amount}</span>
            </div>
          ))}
        </div>
      </Card>

      {/* Payout Request */}
      <Card>
        <h3>Request Payout</h3>
        <div className="flex gap-4">
          <input
            type="number"
            value={payoutAmount}
            onChange={(e) => setPayoutAmount(parseFloat(e.target.value))}
            max={earnings.balance}
            placeholder="Amount"
          />
          <Button onClick={handleRequestPayout}>
            Request Payout
          </Button>
        </div>
        <p className="text-sm text-gray-500">
          Available: €{earnings.balance}
        </p>
      </Card>

      {/* History */}
      <Card>
        <h3>Transaction History</h3>
        <EarningsHistoryList />
      </Card>
    </div>
  );
}
```

#### Admin Earnings Dashboard

```tsx
// app/a/earnings/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { getAllEmployeeEarningsAction } from '@/app/actions/admin-earnings';

export default function AdminEarningsPage() {
  const [earnings, setEarnings] = useState([]);
  const [selectedEmployee, setSelectedEmployee] = useState(null);

  useEffect(() => {
    loadEarnings();
  }, []);

  const loadEarnings = async () => {
    const result = await getAllEmployeeEarningsAction();
    if (result.success) setEarnings(result.data);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Employee Earnings</h1>

      {/* Overview Table */}
      <Card>
        <table className="w-full">
          <thead>
            <tr>
              <th>Employee</th>
              <th>Status</th>
              <th>Total Earned</th>
              <th>Current Period</th>
              <th>Balance</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {earnings.map((e) => (
              <tr key={e.id}>
                <td>{e.user?.name || e.user?.email}</td>
                <td>{e.status}</td>
                <td>€{e.total_earned}</td>
                <td>€{e.current_period_earned}</td>
                <td>€{e.balance}</td>
                <td>
                  <Button onClick={() => setSelectedEmployee(e)}>
                    View Details
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {/* Employee Detail Modal */}
      {selectedEmployee && (
        <EmployeeDetailModal
          employee={selectedEmployee}
          onClose={() => setSelectedEmployee(null)}
        />
      )}
    </div>
  );
}
```

---

### 5. Admin Payment Rules Configuration

```tsx
// app/a/earnings/rules/page.tsx

'use client';

import { useState, useEffect } from 'react';
import { Card, Button, Input, Select } from '@/components/ui';
import { getEarningRulesAction, createEarningRuleAction, toggleEarningRuleAction } from '@/app/actions/admin-earnings';

export default function PaymentRulesPage() {
  const [rules, setRules] = useState([]);
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    loadRules();
  }, []);

  const loadRules = async () => {
    const result = await getEarningRulesAction();
    if (result.success) setRules(result.data);
  };

  const handleCreate = async (formData) => {
    const result = await createEarningRuleAction(formData);
    if (result.success) {
      setShowForm(false);
      loadRules();
    }
  };

  const handleToggle = async (ruleId) => {
    await toggleEarningRuleAction(ruleId);
    loadRules();
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold">Payment Rules</h1>
        <Button onClick={() => setShowForm(true)}>+ Add Rule</Button>
      </div>

      <Card>
        <table className="w-full">
          <thead>
            <tr>
              <th>Order Type</th>
              <th>Review Type</th>
              <th>Payment Amount</th>
              <th>Priority</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {rules.map((rule) => (
              <tr key={rule.id}>
                <td>{rule.order_type}</td>
                <td>{rule.review_type || 'All'}</td>
                <td>€{rule.payment_amount}</td>
                <td>{rule.priority}</td>
                <td>{rule.is_active ? 'Active' : 'Inactive'}</td>
                <td>
                  <Button onClick={() => handleToggle(rule.id)}>
                    {rule.is_active ? 'Deactivate' : 'Activate'}
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      {showForm && (
        <CreateRuleForm
          onSubmit={handleCreate}
          onCancel={() => setShowForm(false)}
        />
      )}
    </div>
  );
}
```

---

### 6. Task Distribution Control (Separate from Account Access)

Currently, there's `acceptingOrders` in User model. We need a separate control for "receiving new tasks" vs "account access".

#### Database Update

```prisma
// Add to EmployeeStats or create separate field
model EmployeeStats {
  // ... existing fields ...

  // Task distribution control (separate from account activation)
  acceptingTasks    Boolean  @default(true) @map("accepting_tasks")  // NEW
}
```

Or add to User model:

```prisma
model User {
  // ... existing fields ...

  // Task distribution control
  acceptingTasks    Boolean  @default(true) @map("accepting_tasks")  // NEW
}
```

#### Server Action

```typescript
// app/actions/admin-employees.ts

export async function toggleEmployeeTaskDistributionAction(userId: string) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  const { data: current } = await supabaseAdmin
    .from("employee_stats")
    .select("accepting_tasks")
    .eq("user_id", userId)
    .single();

  if (!current) return { success: false, error: "Employee not found" };

  const newStatus = !current.accepting_tasks;

  const { error } = await supabaseAdmin
    .from("employee_stats")
    .update({ accepting_tasks: newStatus })
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/a/employees");
  return { success: true, data: { acceptingTasks: newStatus } };
}
```

#### UI Component

```tsx
// In admin employee list

<td>
  <Switch
    checked={employee.acceptingTasks}
    onChange={() => toggleTaskDistribution(employee.id)}
  />
  <span className="ml-2">
    {employee.acceptingTasks ? 'Receiving Tasks' : 'Not Receiving'}
  </span>
</td>
```

---

## Part 4: Simplified Workflow

### Target Workflow

```
CUSTOMER CREATES ORDER
├─ Add multiple URLs (1-10 URLs)
├─ Distribute quantity across URLs
├─ Set review content per URL
├─ Credits validated and deducted
└─ Order created with PENDING ReviewUrl tasks

AUTOMATIC TASK DISTRIBUTION
├─ All PENDING ReviewUrl tasks visible to employees
├─ Only employees with acceptingTasks = true see tasks
├─ No admin assignment needed (auto-distribution)
└─ Employees self-assign from available pool

EMPLOYEE WORKFLOW (Simplified)
1. Log in → Dashboard
2. See available URL tasks
3. Click "Accept" on desired task
4. View task details with:
   - URL
   - Review content (with Copy button)
   - Reaction type
   - Task value (credits/payment)
5. Complete task on external platform
6. Submit proof
7. Task marked COMPLETED
8. Earnings automatically credited
9. Task added to history

EMPLOYEE EARNINGS
├─ Real-time earnings counter
├─ Wallet balance
├─ Earnings by type
├─ Earnings by period
├─ Payout request button
└─ Transaction history

ADMIN CONTROLS
├─ Payment rules configuration
├─ Employee task distribution ON/OFF
├─ Earnings overview table
├─ Per-employee detailed breakdown
└─ Payout processing
```

### What's Removed from Workflow

```
❌ Admin manual assignment (keep as optional override)
❌ Separate "completed reviews" page
❌ Audit & History section
❌ Queue management page
❌ Review rejection workflow
❌ Complex navigation
```

---

## Part 5: Implementation Plan (All Phases in Parallel)

**Status**: All phases (1-4) to be implemented together as a cohesive update.

---

### Phase 1: Multi-URL Support

**Database Changes**
```prisma
// NEW MODEL
model ReviewUrl {
  id              String   @id @default(uuid())
  reviewOrderId   String   @map("review_order_id")
  reviewOrder     ReviewOrder @relation(fields: [reviewOrderId], references: [id], onDelete: Cascade)

  url             String
  quantity        Int      @default(1)
  reviewContent   String?  @map("review_content")   // Explicitly mapped content
  reviewIndex     Int      @map("review_index")     // Order within parent order

  status          String   @default("PENDING")  // "PENDING", "ASSIGNED", "COMPLETED"

  assignedEmployeeId String?  @map("assigned_employee_id")
  assignedEmployee   User?    @relation("ReviewUrlEmployee", fields: [assignedEmployeeId], references: [id])
  assignedAt         DateTime? @map("assigned_at")

  completedAt      DateTime? @map("completed_at")
  proofOfCompletion String?  @map("proof_of_completion")

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([status])
  @@index([assignedEmployeeId])
  @@index([reviewOrderId])
}

// UPDATE ReviewOrder
model ReviewOrder {
  // ... existing fields ...
  reviewUrls     ReviewUrl[]  // New relation
  totalUrls      Int          @map("total_urls")
  // Note: No payment calculation at URL level - only at order level
}
```

**New Server Actions**
- `createMultiUrlReviewOrderAction()` - Accept multiple URLs with explicit content mapping
- `getAvailableUrlTasksAction()` - Get PENDING URL tasks for employees
- `assignUrlToEmployeeAction()` - Employee accepts specific URL task
- `checkOrderCompletionAction()` - Check if all URLs done, credit earnings if so
- `getUrlTaskDetailAction()` - Get details of specific URL task

**Updated Actions**
- `createReviewOrderAction()` - Now supports multi-URL
- `acceptOrderAction()` - Update to work with URL tasks
- `submitCompletedReviewAction()` - Update for URL-level completion
- `getClientReviewOrdersAction()` - Include reviewUrls in response

**UI Changes**
- `/c/services/reviews/new-order` - Multi-URL form with explicit content mapping
- `/e/dashboard` - Show URL tasks instead of full orders
- `/e/orders/[id]` - Show URL-level details
- `/c/services/reviews/orders/[id]` - Show all URLs for the order

---

### Phase 2: Employee Earnings System

**Database Changes**
```prisma
// Employee Wallet
model EmployeeEarnings {
  id                  String   @id @default(uuid())
  userId              String   @unique @map("user_id")
  user                User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  balance             Decimal  @default(0)  @db.Decimal(10, 2)
  totalEarned         Decimal  @default(0)  @db.Decimal(10, 2)
  currentPeriodEarned Decimal  @default(0)  @db.Decimal(10, 2)  // Never auto-resets

  status              String   @default("ACTIVE")  // "ACTIVE", "FROZEN", "BANNED"

  payoutMethod        String?  @map("payout_method")  // "BANK", "PAYPAL", "CRYPTO", etc.
  payoutDetails       String?  @map("payout_details") // JSON with IBAN, email, etc.

  createdAt           DateTime @default(now()) @map("created_at")
  updatedAt           DateTime @updatedAt @map("updated_at")

  transactions        EmployeeEarningTransaction[]
  payoutRequests      EmployeePayoutRequest[]

  @@index([status])
}

// Transaction Ledger
model EmployeeEarningTransaction {
  id                  String   @id @default(uuid())
  employeeEarningsId  String   @map("employee_earnings_id")
  employeeEarnings    EmployeeEarnings @relation(fields: [employeeEarningsId], references: [id], onDelete: Cascade)

  type                String   // "EARN", "PAYOUT", "ADJUSTMENT", "BONUS"
  amount              Decimal  @db.Decimal(10, 2)
  balanceAfter        Decimal  @map("balance_after") @db.Decimal(10, 2)

  description         String
  referenceOrderId    String?  @map("reference_order_id")
  referenceType       String?  @map("reference_type")
  metadata            String?

  createdAt           DateTime @default(now()) @map("created_at")

  @@index([employeeEarningsId])
  @@index([createdAt])
  @@index([type])
}

// Payment Rules
model EmployeeEarningRule {
  id              String   @id @default(uuid())

  orderType       String   @map("order_type")
  reviewType      String?  @map("review_type")     // null = all platforms
  reactionType    String?  @map("reaction_type")   // null = all reactions

  paymentAmount   Decimal  @map("payment_amount") @db.Decimal(10, 2)
  currency        String   @default("EUR")

  isActive        Boolean  @map("is_active") @default(true)
  priority        Int      @default(0)  // Higher priority checked first

  createdAt       DateTime @default(now()) @map("created_at")
  updatedAt       DateTime @updatedAt @map("updated_at")

  @@index([isActive])
  @@index([priority])
}

// Payout Requests
model EmployeePayoutRequest {
  id              String   @id @default(uuid())
  employeeEarningsId String  @map("employee_earnings_id")
  employeeEarnings EmployeeEarnings @relation(fields: [employeeEarningsId], references: [id])

  amount          Decimal  @db.Decimal(10, 2)
  status          String   @default("PENDING")  // "PENDING", "PROCESSING", "COMPLETED", "REJECTED"
  rejectionReason String?  @map("rejection_reason")

  requestedAt     DateTime @default(now()) @map("requested_at")
  processedAt     DateTime? @map("processed_at")
  processedBy     String?  @map("processed_by")
  metadata        String?  // Payment method, reference, etc.

  @@index([status])
  @@index([employeeEarningsId])
}
```

**New Employee Actions**
- `getEmployeeEarningsAction()` - Get wallet balance and stats
- `getEmployeeEarningsHistoryAction()` - Get transaction ledger
- `getEmployeeEarningsByTypeAction()` - Earnings breakdown by type
- `requestPayoutAction()` - Create payout request
- `updatePayoutDetailsAction()` - Update payment method/details

**New Admin Actions**
- `getAllEmployeeEarningsAction()` - All earnings with pagination
- `getEmployeeEarningsDetailAction()` - Per-employee breakdown
- `getEarningRulesAction()` - Get payment rules
- `createEarningRuleAction()` - Create payment rule
- `updateEarningRuleAction()` - Update payment rule
- `deleteEarningRuleAction()` - Delete payment rule
- `toggleEarningRuleAction()` - Activate/deactivate
- `getPayoutRequestsAction()` - Get payout requests
- `processPayoutAction()` - Approve/reject payout
- `adminAdjustEarningsAction()` - Manual adjustment

**Earnings Credit Logic**
```typescript
// Called when ALL URLs in an order are completed
export async function creditEmployeeEarningsAction(
  employeeId: string,
  orderId: string
) {
  // 1. Get order details
  const order = await getOrder(orderId);

  // 2. Find applicable payment rule (highest priority)
  const rule = await findPaymentRule(order.orderType, order.reviewType);

  // 3. Get or create employee earnings
  const earnings = await getOrCreateEmployeeEarnings(employeeId);

  // 4. Calculate new balances
  const payment = parseFloat(rule.paymentAmount);
  const newBalance = parseFloat(earnings.balance) + payment;
  const newTotal = parseFloat(earnings.totalEarned) + payment;
  const newPeriod = parseFloat(earnings.currentPeriodEarned) + payment;

  // 5. Update earnings
  await updateEmployeeEarnings(employeeId, {
    balance: newBalance,
    totalEarned: newTotal,
    currentPeriodEarned: newPeriod  // Never auto-resets
  });

  // 6. Create transaction record
  await createEarningTransaction({
    employeeEarningsId: earnings.id,
    type: "EARN",
    amount: payment,
    balanceAfter: newBalance,
    description: `Completed ${order.orderType} order`,
    referenceOrderId: orderId,
    referenceType: order.orderType
  });

  return { success: true, amount: payment };
}
```

**UI Changes**
- `/e/earnings` - Employee earnings dashboard (NEW)
- `/e/earnings/history` - Transaction history
- `/e/settings/payment` - Payment method configuration
- `/a/earnings` - Admin earnings overview (NEW)
- `/a/earnings/employees/[id]` - Per-employee detail
- `/a/earnings/rules` - Payment rules configuration (NEW)
- `/a/earnings/payouts` - Payout processing (NEW)

---

### Phase 3: Copy Review Button

**Component**
```tsx
// components/reviews/CopyReviewButton.tsx

'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, Copy } from 'lucide-react';
import { useToast } from '@/context/ToastContext';

interface CopyReviewButtonProps {
  content: string;
  className?: string;
}

export function CopyReviewButton({ content, className = '' }: CopyReviewButtonProps) {
  const [copied, setCopied] = useState(false);
  const { toast } = useToast();

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      toast.success('Review copied to clipboard!');
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      toast.error('Failed to copy. Please select and copy manually.');
    }
  };

  return (
    <Button
      onClick={handleCopy}
      variant={copied ? "success" : "outline"}
      size="sm"
      className={`gap-2 ${className}`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy Review'}
    </Button>
  );
}
```

**Usage in Employee Pages**
```tsx
// /e/orders/[id]/page.tsx

import { CopyReviewButton } from '@/components/reviews/CopyReviewButton';

// In URL task detail view
{urlTasks.map(task => (
  <div key={task.id} className="border rounded p-4">
    <div className="flex justify-between items-start mb-2">
      <h3 className="font-semibold">{task.url}</h3>
      <span className="text-sm text-gray-500">Qty: {task.quantity}</span>
    </div>
    {task.reviewContent && (
      <div className="bg-gray-50 p-3 rounded mb-2">
        <div className="flex justify-between items-center gap-2">
          <span className="text-sm font-medium">Review Content:</span>
          <CopyReviewButton content={task.reviewContent} />
        </div>
        <p className="mt-2 text-sm">{task.reviewContent}</p>
      </div>
    )}
    {task.reactionType && (
      <p className="text-sm">Reaction: {task.reactionType}</p>
    )}
  </div>
))}
```

---

### Phase 4: Task Distribution Control

**Database Change**
```prisma
// Add to EmployeeStats
model EmployeeStats {
  // ... existing fields ...

  // Task distribution control (separate from account activation)
  acceptingTasks    Boolean  @default(true) @map("accepting_tasks")
}
```

**Server Action**
```typescript
// Admin action to toggle task distribution
export async function toggleEmployeeTaskDistributionAction(userId: string) {
  const auth = await requireAuth({ role: 'ADMIN' });
  if (!auth.success) return auth;

  const supabaseAdmin = await createAdminClient();

  const { data: current } = await supabaseAdmin
    .from("employee_stats")
    .select("accepting_tasks")
    .eq("user_id", userId)
    .single();

  if (!current) return { success: false, error: "Employee stats not found" };

  const newStatus = !current.accepting_tasks;

  const { error } = await supabaseAdmin
    .from("employee_stats")
    .update({ accepting_tasks: newStatus })
    .eq("user_id", userId);

  if (error) return { success: false, error: error.message };

  revalidatePath("/a/employees");
  return { success: true, data: { acceptingTasks: newStatus } };
}
```

**Filter in getAvailableUrlTasksAction**
```typescript
export async function getAvailableUrlTasksAction() {
  const auth = await requireAuth();
  if (!auth.success) return auth;
  if (auth.user.role !== 'EMPLOYEE') return { success: false, error: "Unauthorized" };

  const supabase = await createClient();

  // Only return tasks if employee is accepting tasks
  const { data: stats } = await supabase
    .from("employee_stats")
    .select("accepting_tasks")
    .eq("user_id", auth.user.id)
    .single();

  if (!stats?.accepting_tasks) {
    return { success: true, data: [] };  // No tasks if not accepting
  }

  // Get available URL tasks
  const { data: tasks } = await supabase
    .from("review_urls")
    .select("*, review_orders(*)")
    .eq("status", "PENDING")
    .limit(20);

  return { success: true, data: tasks };
}
```

**UI Changes**
- `/a/employees` - Add task distribution toggle switch
- `/e/dashboard` - Show indicator when not accepting tasks

---

### Phase 5: Cleanup & Simplification

**Pages to Delete**
```
DELETE: /app/a/reviews/queue/page.tsx
  Reason: Replaced by employee self-assignment workflow

DELETE: /app/a/reviews/history/page.tsx
  Reason: Audit/history not needed per requirements

DELETE: /app/e/reviews/completed/page.tsx
  Reason: Duplicated in earnings history
```

**Actions to Deprecate**
```typescript
// DEPRECATE (but keep for backward compatibility)
- SkippedReview functionality
- getEmployeeCompletedReviewsAction (use getEmployeeOrderHistoryAction with filter)
```

**Navigation Updates**
```
Employee:
  - Remove "Completed Reviews" link
  - Add "Earnings" link

Admin:
  - Remove "Queue" and "History" links
  - Add "Earnings" section
```

---

### Migration Script

**STATUS**: ✅ COMPLETED - SQL file created at `/migrations/reviews_system_redesign.sql`

The following SQL script has been created and is ready to run in Supabase SQL Editor:

```sql
-- See: /migrations/reviews_system_redesign.sql
-- Complete migration script with:
-- - 5 new tables (ReviewUrl, EmployeeEarnings, EmployeeEarningTransaction, EmployeeEarningRule, EmployeePayoutRequest)
-- - 2 updated tables (ReviewOrder, EmployeeStats)
-- - Data migration for existing orders
-- - Default payment rules seeded
-- - Verification queries
-- - Rollback script included
```

-- 1. Create ReviewUrl model
CREATE TABLE review_urls (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  review_order_id UUID NOT NULL REFERENCES review_orders(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  quantity INTEGER DEFAULT 1,
  review_content TEXT,
  review_index INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  assigned_employee_id UUID REFERENCES users(id),
  assigned_at TIMESTAMP,
  completed_at TIMESTAMP,
  proof_of_completion TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX review_urls_status ON review_urls(status);
CREATE INDEX review_urls_employee ON review_urls(assigned_employee_id);
CREATE INDEX review_urls_order ON review_urls(review_order_id);

-- 2. Create EmployeeEarnings model
CREATE TABLE employee_earnings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
  balance DECIMAL(10,2) DEFAULT 0,
  total_earned DECIMAL(10,2) DEFAULT 0,
  current_period_earned DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'ACTIVE',
  payout_method VARCHAR(50),
  payout_details TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX employee_earnings_status ON employee_earnings(status);

-- 3. Create EmployeeEarningTransaction model
CREATE TABLE employee_earning_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_earnings_id UUID NOT NULL REFERENCES employee_earnings(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  balance_after DECIMAL(10,2) NOT NULL,
  description TEXT NOT NULL,
  reference_order_id UUID,
  reference_type VARCHAR(50),
  metadata TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX earning_transactions_earnings ON employee_earning_transactions(employee_earnings_id);
CREATE INDEX earning_transactions_created ON employee_earning_transactions(created_at);
CREATE INDEX earning_transactions_type ON employee_earning_transactions(type);

-- 4. Create EmployeeEarningRule model
CREATE TABLE employee_earning_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_type VARCHAR(50) NOT NULL,
  review_type VARCHAR(50),
  reaction_type VARCHAR(20),
  payment_amount DECIMAL(10,2) NOT NULL,
  currency VARCHAR(10) DEFAULT 'EUR',
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX earning_rules_active ON employee_earning_rules(is_active);
CREATE INDEX earning_rules_priority ON employee_earning_rules(priority);

-- 5. Create EmployeePayoutRequest model
CREATE TABLE employee_payout_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  employee_earnings_id UUID NOT NULL REFERENCES employee_earnings(id),
  amount DECIMAL(10,2) NOT NULL,
  status VARCHAR(20) DEFAULT 'PENDING',
  rejection_reason TEXT,
  requested_at TIMESTAMP DEFAULT NOW(),
  processed_at TIMESTAMP,
  processed_by UUID,
  metadata TEXT
);

CREATE INDEX payout_requests_status ON employee_payout_requests(status);
CREATE INDEX payout_requests_earnings ON employee_payout_requests(employee_earnings_id);

-- 6. Update ReviewOrder
ALTER TABLE review_orders ADD COLUMN total_urls INTEGER DEFAULT 0;

-- 7. Update EmployeeStats
ALTER TABLE employee_stats ADD COLUMN accepting_tasks BOOLEAN DEFAULT true;

-- 8. Migrate existing orders to ReviewUrl structure
INSERT INTO review_urls (
  id, review_order_id, url, quantity, review_content, review_index,
  status, assigned_employee_id, assigned_at, completed_at, proof_of_completion,
  created_at, updated_at
)
SELECT
  gen_random_uuid(),
  id,
  facebook_url,
  quantity,
  comment_text,
  0,
  status,
  assigned_employee_id,
  assigned_at,
  completed_at,
  proof_of_completion,
  created_at,
  updated_at
FROM review_orders
WHERE facebook_url IS NOT NULL;

UPDATE review_orders SET total_urls = 1 WHERE facebook_url IS NOT NULL;
```

---

### Implementation Order

**Week 1: Database & Core Actions**
1. Run migration script
2. Create ReviewUrl actions
3. Update order creation flow
4. Test multi-URL order creation

**Week 2: Earnings System**
1. Create earnings models and actions
2. Implement payment rule matching
3. Integrate earnings credit on order completion
4. Test earning calculations

**Week 3: UI & Integration**
1. Build employee earnings dashboard
2. Build admin earnings center
3. Implement copy review button
4. Add task distribution toggle
5. Update existing pages for URL support

**Week 4: Testing & Cleanup**
1. End-to-end testing
2. Remove deprecated pages
3. Clean up unused code
4. Documentation updates

---

## Part 6: Role-Specific Guides

### For ADMIN

**What You Can Do:**
- Create employee accounts
- Configure payment rules per review type
- Toggle employee task distribution ON/OFF
- View all employee earnings
- Process payout requests
- Adjust employee earnings manually
- View earnings reports by period/type

**Payment Rules Configuration:**
- Navigate to `/a/earnings/rules`
- Click "Add Rule"
- Select order type (REVIEW/COMMENT/COMMENT_WITH_PHOTO)
- Optionally select review type (FACEBOOK/GOOGLE/etc.)
- Set payment amount in EUR
- Set priority (higher checked first)
- Activate/Deactivate rules

**Employee Controls:**
- **Task Distribution Toggle**: Controls whether employee receives new tasks
  - ON: Employee sees and can accept new tasks
  - OFF: Employee keeps account access but receives no new tasks
  - Use for holidays, unavailability, etc.
- **Account Activation**: Controls entire account access
  - Active: Employee can log in
  - Deactivated: Employee cannot access system

**Earnings Overview:**
- Navigate to `/a/earnings`
- See all employees with:
  - Total earned (lifetime)
  - Current period earnings
  - Wallet balance
- Click employee for detailed breakdown:
  - Earnings by review type
  - Earnings by date
  - Transaction history
  - Calendar view

**Payout Processing:**
- Navigate to `/a/earnings/payouts`
- See pending payout requests
- Review employee details and amount
- Approve or reject with reason
- Automated balance deduction on approval

### For EMPLOYEE

**Your Workflow:**
1. **Log in** → Go to dashboard (`/e/dashboard`)
2. **View available tasks** → See all URL tasks you can accept
3. **Accept task** → Click "Accept" on desired task
   - First-come, first-served
   - Task assigned to you immediately
4. **View task details** → See:
   - URL to review
   - Review content (with Copy button)
   - Reaction type (for COMMENT)
   - Task value/payment
5. **Complete review** → Go to external platform (Facebook, etc.)
6. **Submit proof** → Paste screenshot/link in submission box
7. **Earnings credited** → Your balance updated automatically

**Your Earnings:**
- Navigate to `/e/earnings`
- See:
  - **Total Earned**: All-time earnings
  - **Current Period**: This month's earnings
  - **Wallet Balance**: Available for payout
- **Earnings by Type**: Breakdown by review type
- **Request Payout**:
  - Enter amount (up to balance)
  - Submit request
  - Admin processes and sends payment

**Copy Review Button:**
- Click "Copy Review" next to review content
- Text automatically copied to clipboard
- Paste directly into Facebook/Google/etc.

**Task Availability:**
- If toggle is ON: You see and can accept new tasks
- If toggle is OFF: You keep account access but see no new tasks
- Admin controls this toggle (for holidays, etc.)

### For CUSTOMER

**Create Review Order:**
1. Navigate to `/c/services/reviews/new-order`
2. Select order type:
   - **COMMENT**: Facebook reactions only
   - **REVIEW**: Text reviews (1-50)
   - **COMMENT_WITH_PHOTO**: Reviews with photos
3. **Add URLs**:
   - Click "Add URL" for each unique URL
   - Enter Facebook URL
   - Set quantity for this URL
   - Add review content (if applicable)
4. **Set reaction type** (for COMMENT type):
   - LIKE, LOVE, CARE, HAHA, WOW, SAD, ANGRY
5. **Review total**:
   - Total quantity across all URLs
   - Total credits required
   - Current credit balance
6. **Submit order**:
   - Credits deducted
   - Order created
   - Tasks distributed to employees

**View Your Orders:**
- Navigate to `/c/services/reviews/orders`
- See all your orders with status
- Filter by status (PENDING, IN_PROGRESS, COMPLETED)
- View order details for each URL
- Submit feedback on completed orders

**Order Status:**
- **PENDING**: Waiting for employee to accept
- **IN_PROGRESS**: Employee working on it
- **COMPLETED**: Review done, view proof
- **CANCELLED**: Cancelled by admin (credits refunded)

---

## Part 7: Migration Strategy

### Existing Data Migration

```sql
-- Migrate existing ReviewOrder to multi-URL structure
-- This creates ReviewUrl entries for existing orders

INSERT INTO review_urls (
  id,
  review_order_id,
  url,
  quantity,
  review_content,
  status,
  assigned_employee_id,
  assigned_at,
  completed_at,
  proof_of_completion,
  created_at,
  updated_at
)
SELECT
  gen_random_uuid(),
  id as review_order_id,
  facebook_url as url,
  quantity,
  comment_text as review_content,
  status,
  assigned_employee_id,
  assigned_at,
  completed_at,
  proof_of_completion,
  created_at,
  updated_at
FROM review_orders
WHERE facebook_url IS NOT NULL;

-- Update ReviewOrder with new fields
UPDATE review_orders
SET total_urls = 1,
    distribution = '[{"urlIndex": 0, "quantity": quantity}]'
WHERE facebook_url IS NOT NULL;
```

### Credits to Earnings Migration (Optional)

If you want to credit employees for past completed reviews:

```sql
-- This is a manual process - you'd need to:
-- 1. Create EmployeeEarnings records for all employees
-- 2. Calculate earnings based on completed orders
-- 3. Create EmployeeEarningTransaction records
-- 4. Run as a one-time migration script

-- Example (pseudo-code):
-- For each employee:
--   Calculate total completed orders
--   For each order, apply payment rule
--   Credit earnings accordingly
```

---

## Part 8: Testing Checklist

### Multi-URL Testing

- [ ] Create order with single URL
- [ ] Create order with multiple URLs
- [ ] Distribute quantity across URLs
- [ ] Employee sees individual URL tasks
- [ ] Employee accepts specific URL task
- [ ] Task assignment race condition (first wins)
- [ ] Complete individual URL task
- [ ] Order completion when all URLs done

### Earnings Testing

- [ ] Employee earns on first completion
- [ ] Balance updates correctly
- [ ] Transaction history recorded
- [ ] Different payment per review type
- [ ] Rule priority matching
- [ ] Earnings by type breakdown
- [ ] Earnings by period (monthly reset)
- [ ] Payout request creation
- [ ] Payout approval (balance deduction)
- [ ] Payout rejection (no deduction)
- [ ] Admin manual adjustment

### Task Distribution Testing

- [ ] Employee with acceptingTasks=true sees tasks
- [ ] Employee with acceptingTasks=false sees no tasks
- [ ] Admin toggle switches immediately
- [ ] Account activation separate from task distribution
- [ ] Existing tasks not affected by toggle

### Copy Review Testing

- [ ] Copy button copies full text
- [ ] Success feedback shown
- [ ] Works for long reviews (500 chars)
- [ ] Works for special characters

---

## Part 9: Clarified Requirements

### Payment Calculation: Per Order
**Decision**: Employee earnings are calculated **per entire order**, not per individual URL task.

**Implications**:
- One order = One bundled payment, regardless of number of URLs
- Employee receives full payment when ALL URLs in the order are completed
- Simplifies transaction ledger (fewer entries)
- Customer pays per order, employee earns per order

**Example**:
- Order: 10 URLs, 5 reviews each (50 total reviews)
- Customer pays: 50 × credit cost
- Employee earns: 1 × payment amount (for completing the entire order)
- Payment credited when all 50 reviews are done

### Review Content Mapping: Explicit Mapping
**Decision**: Customer explicitly specifies which review text goes with which URL.

**UI Implementation**:
```tsx
// Customer sees for each URL:
{urls.map((urlObj, index) => (
  <div key={index}>
    <Input label={`URL ${index + 1}`} value={urlObj.url} />
    <Input label="Quantity" value={urlObj.quantity} />
    <Textarea
      label="Review Content for this URL"
      value={urlObj.reviewContent}
      onChange={(e) => updateUrl(index, 'reviewContent', e.target.value)}
      placeholder="Enter the review text that should be posted to this specific URL..."
    />
  </div>
))}
```

**Data Structure**:
```json
{
  "orderType": "REVIEW",
  "urls": [
    { "url": "facebook.com/page1", "quantity": 5, "reviewContent": "Great product!" },
    { "url": "facebook.com/page2", "quantity": 5, "reviewContent": "Love it!" },
    { "url": "facebook.com/page3", "quantity": 5, "reviewContent": "Amazing!" }
  ],
  "totalQuantity": 15
}
```

### Employee Earnings Reset: Never
**Decision**: "Current period earnings" is **cumulative** and never auto-resets.

**Implications**:
- `currentPeriodEarned` continues to grow indefinitely
- Only manual admin adjustment can reset it
- No scheduled cron jobs or reset logic
- Simpler implementation, less maintenance

**Alternative** (if reset needed later):
- Admin can manually adjust via "admin adjustment" action
- Could add "reset period" button in future

### Payment Rule Matching: Priority-Based
**Decision**: Use **highest priority** rule that matches. If multiple rules have same priority, first one wins.

**Matching Logic**:
```typescript
// Find applicable rule (highest priority first)
const { data: rule } = await supabaseAdmin
  .from("employee_earning_rules")
  .select("*")
  .eq("order_type", orderType)
  .eq("is_active", true)
  .or(`review_type.is.null,review_type.eq.${reviewType}`)
  .order("priority", { ascending: false })  // Highest priority first
  .limit(1)
  .single();
```

**Rule Priority Examples**:
```
Priority 10: Facebook REVIEW → €5.00
Priority 5:  Facebook COMMENT → €2.00
Priority 1:  All REVIEW → €3.00
Priority 0:  All types → €1.00
```

For a Facebook REVIEW: Priority 10 rule wins (€5.00)
For a Google REVIEW: Priority 1 rule wins (€3.00)
For a Facebook COMMENT: Priority 5 rule wins (€2.00)

### Payout Method: To Be Defined
**Question**: How do employees receive payouts?

**Options**:
- Bank transfer (need IBAN/BIC)
- PayPal
- Crypto
- Custom payment method

**Recommendation**:
- Add payment method to employee profile
- Admin processes manually outside system
- System tracks payout status and amount
- Add field to `employee_earnings`: `payout_method`, `payout_details`

### Multi-URL Order Completion: All URLs Must Be Done
**Decision**: An order is "complete" only when **ALL URLs** in the order are completed.

**Completion Logic**:
```typescript
// Check if all ReviewUrls for this order are COMPLETED
const { data: urls } = await supabase
  .from("review_urls")
  .select("status")
  .eq("review_order_id", orderId);

const allCompleted = urls.every(u => u.status === "COMPLETED");

if (allCompleted) {
  // Credit employee earnings
  await creditEmployeeEarningsAction(employeeId, order);
  // Mark order as COMPLETED
  await updateOrderStatus(orderId, "COMPLETED");
}
```

**Employee Experience**:
- Employee accepts URL tasks individually
- Completes each URL task with separate proof
- Final payment credited when entire order done
- Employee sees progress: "3 of 5 URLs completed"

---

## Summary of Changes

### Database Changes
| Model | Change | Priority |
|-------|--------|----------|
| ReviewUrl | NEW model for multi-URL support | HIGH |
| EmployeeEarnings | NEW model for employee wallet | HIGH |
| EmployeeEarningTransaction | NEW model for earnings ledger | HIGH |
| EmployeeEarningRule | NEW model for payment rules | HIGH |
| EmployeePayoutRequest | NEW model for payout requests | HIGH |
| ReviewOrder | ADD: reviewUrls relation, totalUrls, distribution | HIGH |
| EmployeeStats | ADD: acceptingTasks field | MEDIUM |

### Action Changes
| Category | Add/Modify | Priority |
|----------|-----------|----------|
| Multi-URL actions | ADD: 3 new actions | HIGH |
| Employee earnings | ADD: 5 new actions | HIGH |
| Admin earnings | ADD: 7 new actions | HIGH |
| Payment rules | ADD: 4 new actions | HIGH |
| Existing actions | MODIFY: Update for URL support | HIGH |
| Skip functionality | REMOVE: Simplify workflow | LOW |

### UI Changes
| Page | Change | Priority |
|------|--------|----------|
| /c/services/reviews/new-order | ADD: Multi-URL creation | HIGH |
| /e/dashboard | MODIFY: Show URL tasks | HIGH |
| /e/orders/[id] | ADD: Copy review button | LOW |
| /e/earnings | NEW: Employee earnings dashboard | HIGH |
| /a/earnings | NEW: Admin earnings center | HIGH |
| /a/earnings/rules | NEW: Payment rules config | HIGH |
| /a/earnings/payouts | NEW: Payout processing | HIGH |
| /a/reviews/queue | DELETE: Remove page | LOW |
| /a/reviews/history | DELETE: Remove page | LOW |
| /e/reviews/completed | DELETE: Remove page | LOW |

---

**Document Version**: 1.0
**Last Updated**: 2025-01-06
**Status**: Ready for Implementation Planning
