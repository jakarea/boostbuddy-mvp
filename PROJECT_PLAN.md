# BoostBuddy Reviews System - Complete Implementation Plan

## Project Overview

Implementation of a complete Reviews service with Credits-based payment system, Employee workflow, and Admin management interface. The system maintains minimal, clean UI/UX while providing full functionality for clients, employees, and administrators.

---

## Table of Contents

1. [Requirements Summary](#requirements-summary)
2. [Database Schema](#database-schema)
3. [Phase 1: Credits System Foundation](#phase-1-credits-system-foundation)
4. [Phase 2: Reviews Client Interface](#phase-2-reviews-client-interface)
5. [Phase 3: Employee Workspace](#phase-3-employee-workspace)
6. [Phase 4: Admin Reviews Management](#phase-4-admin-reviews-management)
7. [Phase 5: Telegram Integration](#phase-5-telegram-integration)
8. [Phase 6: Testing & Polish](#phase-6-testing--polish)
9. [UI/UX Guidelines](#uiux-guidelines)
10. [File Structure](#file-structure)
11. [Data Flow Diagrams](#data-flow-diagrams)
12. [Implementation Timeline](#implementation-timeline)

---

## Requirements Summary

### Credits System Requirements
- **Variable Pricing**: Different review platforms have different credit costs
- **Package Management**: Admins create credit packages (size and price determined by admin)
- **Admin Adjustments**: Admins can add/remove credits with mandatory logging
- **Credit History**: Complete transaction ledger for audit trail

### Employee Workflow Requirements
- **Auto-Distribution**: New orders distributed to all active employees
- **Notification Channels**: Both Telegram and in-app notifications
- **Employee Actions**: Claim order, Skip order, Submit completion proof
- **No Time Limits**: Orders stay in pool indefinitely, no completion deadlines
- **Access Control**: Employees only access Reviews workspace

### Review Order Requirements
- **Proof Submission**: URL OR screenshot OR description (at least one required)
- **Admin Approval**: All completed orders require admin approval
- **Client Feedback**: Optional emoji feedback (happy/unhappy/angry)
- **No Client Controls**: No editing/canceling for now (future feature)
- **Manual Assignment**: Admins can manually assign employees

### Admin Management Requirements
- **Credit Packages**: Full CRUD operations
- **Orders Management**: Overview, approval workflow, manual assignment
- **Employee Management**: Create accounts, toggle availability, performance tracking
- **Credits Oversight**: Transaction history, user adjustments
- **Notifications**: New orders, completed orders, failed credit purchases

### Telegram Integration Requirements
- **Single Channel**: All notifications to one admin channel
- **Short Messages**: Concise, precise notifications
- **Failed Alerts**: Credit purchase failures trigger admin alerts
- **Event Types**: Order created, order available, order completed

---

## Database Schema

### Schema Updates Required

```prisma
// Add to ReviewOrder model:
proofType        String   // "URL", "SCREENSHOT", "TEXT"
adminApproval    String?  // "APPROVED", "REJECTED", null (pending)
clientFeedback   String?  // "HAPPY", "UNHAPPY", "ANGRY", null
adminNotes       String?  // Internal admin notes

// Add to CreditTransaction model:
adminId          String?  // Track which admin made adjustments
```

### Complete Schema Overview

**Credits System Tables:**
- `CreditPackage` - Admin-created credit packages
- `CreditTransaction` - Financial ledger with running balance
- `User.creditsBalance` - Cached balance field

**Reviews System Tables:**
- `ReviewOrder` - Review orders with enhanced proof tracking
- `SkippedReview` - Employee skip tracking
- `EmployeeStats` - Performance metrics

**User Enhancements:**
- `User.role` - Now accepts "EMPLOYEE"
- `User.acceptingOrders` - Employee availability toggle
- `User.telegramChatId` - Telegram notification ID

---

## Phase 1: Credits System Foundation

### 1.1 Server Actions (`app/actions/credits.ts`)

```typescript
// Package Management
export async function createCreditPackageAction(data: {
  name: string;
  description?: string;
  creditsAmount: number;
  price: number;
  isActive?: boolean;
})

export async function updateCreditPackageAction(
  id: string,
  data: /* package fields */
)

export async function deleteCreditPackageAction(id: string)
export async function getCreditPackagesAction(includeInactive?: boolean)

// Purchase Flow
export async function purchaseCreditsAction(packageId: string)
export async function fulfillCreditsPurchase(sessionId: string) // Webhook

// Balance & History
export async function getUserCreditsBalanceAction(userId?: string)
export async function getCreditsHistoryAction(userId?: string, limit?: number)

// Admin Functions
export async function adminAdjustCreditsAction(data: {
  userId: string;
  amount: number; // positive or negative
  reason: string;  // required for audit log
})

export async function getAllCreditPackagesAction()
export async function getCreditsTransactionsAction(filters?: {
  userId?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
})
```

### 1.2 Core Components

**Client Components:**
- `CreditPackagesList.tsx` - Display available packages for purchase
- `CreditPackageCard.tsx` - Individual package display with pricing
- `PurchaseCreditsButton.tsx` - Stripe checkout trigger
- `CreditsBalanceCard.tsx` - Show current balance with refresh
- `CreditsHistory.tsx` - Transaction history with filters

**Admin Components:**
- `PackagesManagement.tsx` - Admin package CRUD interface
- `PackageForm.tsx` - Create/edit package form
- `CreditsOverview.tsx` - Platform-wide credits statistics
- `TransactionsTable.tsx` - All transactions with filtering
- `CreditAdjustmentForm.tsx` - Admin adjustment interface

### 1.3 Credit Purchase Flow

```
Client Dashboard → Wallet → Top Up Credits
↓
View Available Packages → Select Package
↓
Stripe Checkout → Payment Processing
↓
Webhook Handler → Credit Transaction Created
↓
Balance Updated → Telegram Notification → Redirect to Wallet
```

### 1.4 Credits Cost Configuration

**Review Type Credit Costs (Admin Configurable):**
```typescript
const REVIEW_CREDIT_COSTS = {
  GOOGLE: 5,
  TRUSTPILOT: 8,
  YELP: 6,
  FACEBOOK: 4,
  AMAZON: 10,
  // ... more platforms
};
```

---

## Phase 2: Reviews Client Interface

### 2.1 Server Actions (`app/actions/reviews.ts`)

```typescript
// Order Management
export async function createReviewOrderAction(data: {
  businessName: string;
  businessUrl?: string;
  reviewType: string;
  targetRating: string;
  reviewContent: string;
  reviewInstructions?: string;
})

export async function getClientReviewOrdersAction(filters?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
})

export async function getReviewOrderDetailAction(orderId: string)

// Feedback
export async function submitClientFeedbackAction(data: {
  orderId: string;
  feedback: "HAPPY" | "UNHAPPY" | "ANGRY";
})

// Credit Validation
export async function validateCreditsForOrderAction(orderData: ReviewOrderData)
export async function getReviewCreditCostAction(reviewType: string)
```

### 2.2 Client Pages Structure

```
/dashboard/services/reviews/
├── page.tsx                    // Reviews dashboard
├── new-order/
│   └── page.tsx               // Create new review order
├── orders/
│   ├── page.tsx               // Order history list
│   └── [id]/
│       └── page.tsx          // Order details
└── packages/
    └── page.tsx               // View credit packages
```

### 2.3 Review Order Form

**`ReviewOrderForm.tsx` Components:**
```typescript
// Form Fields:
- Business Name (required, text input)
- Business URL (optional, URL input)
- Review Type (dropdown: Google, Trustpilot, etc.)
- Target Rating (dropdown: 5★, 4★, 3★, 2★, 1★)
- Review Content (required, textarea with character count)
- Review Instructions (optional, textarea)

// Dynamic Elements:
- Credits Cost Display (updates based on review type)
- Current Balance Display
- Insufficient Credits Warning
- Submit Button (disabled if validation fails)
```

### 2.4 Order History Components

**`OrdersList.tsx` Features:**
```typescript
// Table Columns:
- Order ID (clickable for details)
- Business Name
- Review Type & Rating (badge)
- Status (color-coded)
- Credits Consumed
- Created Date
- Client Feedback (emoji if provided)

// Status Colors:
PENDING → Yellow
IN_PROGRESS → Blue
COMPLETED → Green
REJECTED → Red
```

**`OrderDetailCard.tsx` Display:**
```typescript
// Order Information:
- Business details
- Review content
- Instructions
- Credits consumed

// Progress Tracking:
- Current status
- Assigned employee (if any)
- Proof of completion (if available)
- Admin approval status
- Client feedback (optional)
```

### 2.5 Credits Validation Logic

```typescript
// Before order creation:
1. Check user's current balance
2. Calculate required credits based on review type
3. Validate sufficient credits available
4. Show warning if insufficient
5. Block submission if balance < required
```

---

## Phase 3: Employee Workspace

### 3.1 Server Actions (`app/actions/employee.ts`)

```typescript
// Order Pool
export async function getAvailableOrdersAction()

// Order Actions
export async function claimOrderAction(orderId: string)
export async function skipOrderAction(orderId: string)
export async function submitOrderProofAction(data: {
  orderId: string;
  proofType: "URL" | "SCREENSHOT" | "TEXT";
  proofUrl?: string;
  proofFile?: File;
  proofText?: string;
})

// Order History
export async function getEmployeeOrdersAction(filters?: {
  status?: string;
  dateFrom?: Date;
  dateTo?: Date;
})

// Employee Status
export async function getEmployeeStatsAction()
export async function updateEmployeeStatusAction(isAvailable: boolean)
```

### 3.2 Employee Pages Structure

```
/employee/
├── layout.tsx                   // Employee-specific sidebar
├── dashboard/
│   └── page.tsx                // Available orders pool
├── my-orders/
│   ├── page.tsx               // Active & completed orders
│   ├── active/
│   │   └── page.tsx          // Orders in progress
│   └── completed/
│       └── page.tsx          // Completed orders history
└── stats/
    └── page.tsx              // Performance metrics
```

### 3.3 Employee Dashboard

**`OrdersPool.tsx` - Available Orders:**
```typescript
// Order Card Display:
- Business Name (prominent)
- Review Type & Rating (badges)
- Review Content (truncated with "read more")
- Credits Value
- Instructions (if any)

// Action Buttons:
- Claim Order (large, prominent CTA)
- Skip Order (secondary action)

// Empty State:
- "No orders available" message
- Check back soon notification
```

### 3.4 Proof Submission

**`OrderProofForm.tsx` Components:**
```typescript
// Proof Type Selection:
- Radio buttons: URL / Screenshot / Text
- Only one type required

// URL Input:
- Text input with URL validation
- Preview link

// Screenshot Upload:
- File upload (image only)
- Preview thumbnail
- Remove option

// Text Description:
- Textarea
- Character count

// Submit:
- Submit button
- Cancel option
```

### 3.5 Employee Statistics

**`PerformanceCard.tsx` Display:**
```typescript
// Metrics:
- Total Orders Completed
- Total Orders Skipped
- Success Rate (completed / total)
- Last Active timestamp

// Visual Elements:
- Simple number displays
- Progress bars for rates
- Relative time formatting
```

### 3.6 Availability Toggle

**`AvailabilityToggle.tsx`:**
```typescript
// Simple Switch Component:
- "Available to receive orders" label
- On/Off toggle switch
- Instant status update
- Visual confirmation when toggled
```

---

## Phase 4: Admin Reviews Management

### 4.1 Server Actions (`app/actions/admin/reviews.ts`)

```typescript
// Credit Packages
export async function getCreditPackagesAdminAction()
export async function createCreditPackageAdminAction(data: PackageData)
export async function updateCreditPackageAdminAction(id: string, data: PackageData)
export async function deleteCreditPackageAdminAction(id: string)
export async function togglePackageStatusAction(id: string)

// Orders Management
export async function getAllReviewOrdersAction(filters?: {
  status?: string;
  employeeId?: string;
  clientId?: string;
  dateFrom?: Date;
  dateTo?: Date;
})

export async function getPendingApprovalOrdersAction()
export async function assignEmployeeAction(data: {
  orderId: string;
  employeeId: string;
})

export async function approveOrderAction(orderId: string, adminNotes?: string)
export async function rejectOrderAction(orderId: string, reason: string)
export async function addOrderAdminNotesAction(orderId: string, notes: string)

// Employee Management
export async function getAllEmployeesAction()
export async function createEmployeeAction(data: {
  name: string;
  email: string;
  password: string;
})

export async function toggleEmployeeAvailabilityAction(employeeId: string)
export async function getEmployeePerformanceAction(employeeId: string)
export async function getEmployeeDetailAction(employeeId: string)

// Credits Management
export async function getCreditsOverviewAction()
export async function getCreditsTransactionsAdminAction(filters?: {
  userId?: string;
  type?: string;
  dateFrom?: Date;
  dateTo?: Date;
})

export async function adminCreditAdjustmentAction(data: {
  userId: string;
  amount: number;
  reason: string;
})

export async function getUserCreditHistoryAction(userId: string)
```

### 4.2 Admin Pages Structure

```
/admin/services/reviews/
├── page.tsx                      // Reviews overview dashboard
├── packages/
│   ├── page.tsx                // Credit packages list
│   ├── create/
│   │   └── page.tsx          // Create new package
│   └── [id]/
│       └── edit/
│           └── page.tsx      // Edit package
├── orders/
│   ├── page.tsx                // All orders overview
│   ├── pending/
│   │   └── page.tsx          // Orders awaiting approval
│   └── [id]/
│       └── page.tsx          // Order details
├── employees/
│   ├── page.tsx                // Employee management
│   ├── create/
│   │   └── page.tsx          // Create employee
│   └── [id]/
│       ├── page.tsx          // Employee details
│       └── performance/
│           └── page.tsx      // Performance stats
└── credits/
    ├── page.tsx                // Credits overview
    ├── transactions/
    │   └── page.tsx          // Transaction history
    └── adjust/
        └── page.tsx          // Adjust user credits
```

### 4.3 Admin Dashboard Components

**`ReviewsOverview.tsx` Dashboard Stats:**
```typescript
// Key Metrics:
- Total Orders (all time)
- Active Orders (in pool + in progress)
- Pending Approval (awaiting admin)
- Completed Orders
- Total Credits Sold
- Active Employees

// Quick Actions:
- View Pending Approvals
- View Active Orders
- Manage Employees
- Manage Credit Packages
```

**`OrdersTable.tsx` Features:**
```typescript
// Table Columns:
- Order ID
- Client Name & Email
- Business Name & URL
- Review Type & Rating
- Status (color-coded badge)
- Assigned Employee
- Admin Approval Status
- Client Feedback (emoji)
- Created Date
- Actions dropdown

// Filters:
- Status filter
- Employee filter
- Date range filter
- Search by client/business
```

**`OrderApprovalCard.tsx` Proof Review:**
```typescript
// Order Details Section:
- Client information
- Business details
- Review content
- Instructions

// Proof Section:
- Proof type indicator
- URL (with link) OR
- Screenshot (with preview) OR
- Text description

// Client Feedback:
- Emoji display
- Feedback type

// Admin Actions:
- Approve button (prominent, green)
- Reject button (secondary, red)
- Admin notes textarea
- Submit decision
```

### 4.4 Employee Management

**`EmployeesList.tsx` Features:**
```typescript
// Table Columns:
- Employee Name & Email
- Availability Status (toggle)
- Orders Completed
- Orders Skipped
- Success Rate
- Last Active
- Actions (view details)

// Quick Actions:
- Create Employee button
- Toggle Availability (inline)
- View Performance
- Edit Account
```

**`CreateEmployeeForm.tsx` Fields:**
```typescript
// Account Creation:
- Full Name (required)
- Email Address (required)
- Temporary Password (required)
- Confirm Password

// Default Settings:
- Available: Yes (toggle)
- Role: EMPLOYEE (auto-set)

// Submit:
- Create Account button
- Send credentials via email option
```

### 4.5 Credits Management

**`CreditsOverview.tsx` Dashboard:**
```typescript
// Platform Stats:
- Total Credits Sold
- Total Credits Consumed
- Active Credit Packages
- Total Credit Transactions
- Revenue from Credits (EUR)

// Charts:
- Credits Sold Over Time
- Credits Consumed Over Time
- Popular Packages
```

**`CreditAdjustmentForm.tsx` Admin Adjustments:**
```typescript
// Form Fields:
- User Selection (searchable dropdown)
- Adjustment Type (Add/Remove)
- Amount (number input)
- Reason (required textarea)
- Reference Order ID (optional)

// Validation:
- User must exist
- Reason is required
- Amount cannot be zero
- Balance cannot go negative (for removals)

// Submit:
- Preview Adjustment button
- Confirm Adjustment button
- Creates CreditTransaction record
- Sends notification to user
```

---

## Phase 5: Telegram Integration

### 5.1 Notification Events

```typescript
const REVIEW_NOTIFICATION_EVENTS = {
  // Client Events
  REVIEWS_CREDITS_PURCHASED: 'REVIEWS_CREDITS_PURCHASED',
  REVIEWS_CREDITS_FAILED: 'REVIEWS_CREDITS_FAILED',
  REVIEWS_ORDER_COMPLETED: 'REVIEWS_ORDER_COMPLETED',
  REVIEWS_CREDITS_ADJUSTED: 'REVIEWS_CREDITS_ADJUSTED',

  // Employee Events
  REVIEWS_ORDER_AVAILABLE: 'REVIEWS_ORDER_AVAILABLE',
  REVIEWS_ORDER_CLAIMED: 'REVIEWS_ORDER_CLAIMED',

  // Admin Events
  REVIEWS_ORDER_CREATED: 'REVIEWS_ORDER_CREATED',
  REVIEWS_ORDER_COMPLETED_ADMIN: 'REVIEWS_ORDER_COMPLETED_ADMIN',
  REVIEWS_CREDITS_FAILED_ADMIN: 'REVIEWS_CREDITS_FAILED_ADMIN',
};
```

### 5.2 Notification Templates

**Short & Precise Message Formats:**

```typescript
// New Order (Admin)
🔔 New Review Order: #{orderId}
Client: {clientName}
Business: {businessName}
Type: {reviewType} {rating}
Credits: {credits}

// Order Available (Employees)
🆕 New Review Available: #{orderId}
Business: {businessName}
Type: {reviewType} {rating}
Credits: {credits}
[View in Dashboard]

// Order Completed (Admin)
✅ Review Completed: #{orderId}
Employee: {employeeName}
Business: {businessName}
Type: {reviewType}
[Review for Approval]

// Credits Purchased (Client)
💰 Credits Purchased: +{amount} credits
Package: {packageName}
New Balance: {balance}

// Credits Failed (Admin)
⚠️ Credits Purchase Failed
User: {userName}
Package: {packageName}
Error: {error}

// Order Completed (Client)
✅ Review Completed: {businessName}
Employee: {employeeName}
Rating: {targetRating}
[View Details]

// Credits Adjusted (Client)
🔄 Credits Adjusted: {amount} credits
Reason: {reason}
New Balance: {balance}
```

### 5.3 Notification Delivery Logic

```typescript
// Channel Mapping:
const NOTIFICATION_CHANNELS = {
  // Admin Channel (Single)
  ADMIN: ['telegram'],

  // Client Channels (Both)
  CLIENT: ['telegram', 'in_app'],

  // Employee Channels (Both)
  EMPLOYEE: ['telegram', 'in_app'],
};

// Delivery Function:
async function sendReviewNotification(data: {
  event: string;
  recipients: string[]; // user IDs
  channels: string[];
  templateData: object;
}) {
  // Create notification record
  // Send to Telegram if applicable
  // Create in-app notification if applicable
  // Log delivery status
}
```

### 5.4 Notification Triggers

**When to Send:**
```typescript
// Credits System
- After successful Stripe checkout → CLIENT
- After failed Stripe payment → ADMIN
- After admin adjustment → CLIENT
- After package creation/deletion → ADMIN

// Orders System
- After order creation → ADMIN
- When order enters pool → ALL_AVAILABLE_EMPLOYEES
- When employee claims order → OTHER_EMPLOYEES
- After proof submission → ADMIN
- After admin approval → CLIENT
- After admin rejection → EMPLOYEE
```

---

## Phase 6: Testing & Polish

### 6.1 Testing Checklist

**Credits System:**
- [ ] Package creation with all fields
- [ ] Package editing and deletion
- [ ] Package active/inactive toggle
- [ ] Credit purchase flow (Stripe integration)
- [ ] Balance calculation accuracy
- [ ] Admin credit adjustments
- [ ] Transaction history accuracy
- [ ] Insufficient credits handling
- [ ] Concurrent purchase handling

**Reviews Workflow (Client):**
- [ ] Order creation form validation
- [ ] Credits deduction on order creation
- [ ] Order history display
- [ ] Order detail view
- [ ] Client feedback submission
- [ ] Status updates in real-time
- [ ] Insufficient credits warning

**Reviews Workflow (Employee):**
- [ ] Employee account creation
- [ ] Orders pool display
- [ ] Order claiming functionality
- [ ] Skip order tracking
- [ ] Proof submission (all types)
- [ ] Active orders management
- [ ] Completed orders history
- [ ] Availability toggling
- [ ] Performance tracking accuracy

**Reviews Workflow (Admin):**
- [ ] Orders overview dashboard
- [ ] Pending approvals queue
- [ ] Proof review interface
- [ ] Approval/rejection workflow
- [ ] Manual employee assignment
- [ ] Admin notes functionality
- [ ] Employee management
- [ ] Credit adjustments with logging
- [ ] Platform statistics accuracy

**Telegram Notifications:**
- [ ] All events trigger notifications
- [ ] Message formatting is correct
- [ ] Delivery to correct channels
- [ ] Failed payment alerts to admin
- [ ] Notification rate limiting
- [ ] Error handling for failed Telegram API calls

**Mobile Responsiveness:**
- [ ] All forms work on mobile
- [ ] Tables are scrollable/responsive
- [ ] Buttons are thumb-friendly
- [ ] Text is readable
- [ ] File uploads work
- [ ] Navigation works

### 6.2 Performance Optimization

**Database Optimizations:**
```sql
-- Add indexes for common queries:
CREATE INDEX idx_review_orders_status ON review_orders(status);
CREATE INDEX idx_review_orders_employee ON review_orders(assigned_employee_id);
CREATE INDEX idx_review_orders_created ON review_orders(created_at);
CREATE INDEX idx_credit_transactions_user ON credit_transactions(user_id);
CREATE INDEX idx_credit_transactions_created ON credit_transactions(created_at);
CREATE INDEX idx_employee_stats_available ON employee_stats(is_available);
CREATE INDEX idx_notifications_user_read ON notifications(user_id, is_read);
```

**Caching Strategy:**
- Cache user credit balance (5 minutes)
- Cache available packages (10 minutes)
- Cache employee availability (2 minutes)
- Cache review credit costs (static)

**Query Optimization:**
- Use pagination for order lists (20 items per page)
- Implement cursor-based pagination for infinite scroll
- Use selective field loading for list views
- Batch queries where possible

### 6.3 Security Considerations

**Input Validation:**
- Sanitize all user inputs
- Validate file uploads (size, type)
- URL validation for proof submissions
- SQL injection prevention (Prisma handles this)

**Authorization Checks:**
- Verify user role for all actions
- Check employee assignment permissions
- Validate admin actions with audit trail
- Prevent cross-user data access

**Rate Limiting:**
- Limit order creation frequency
- Limit credit purchase attempts
- Limit proof submissions per employee
- Implement Telegram notification rate limits

### 6.4 Error Handling

**User-Facing Errors:**
```typescript
const USER_ERRORS = {
  INSUFFICIENT_CREDITS: 'You need {required} credits. Current balance: {balance}',
  INVALID_PROOF_TYPE: 'Please provide at least one proof type',
  ORDER_NOT_AVAILABLE: 'This order is no longer available',
  ALREADY_CLAIMED: 'You have already claimed this order',
  FILE_TOO_LARGE: 'Screenshot must be less than 5MB',
  INVALID_URL: 'Please provide a valid URL',
};
```

**Admin-Facing Errors:**
```typescript
const ADMIN_ERRORS = {
  PACKAGE_HAS_PURCHASES: 'Cannot delete package with purchase history',
  EMPLOYEE_HAS_ACTIVE_ORDERS: 'Employee has active orders',
  INVALID_ADJUSTMENT: 'Cannot remove more credits than available',
  APPROVAL_FAILED: 'Failed to approve order. Please try again.',
};
```

---

## UI/UX Guidelines

### Design Principles

**Minimal & Clean:**
- One primary action per screen
- Clear visual hierarchy
- Generous white space
- Consistent spacing (8px grid)
- Limited color palette

**Typography:**
```css
/* Font Sizes */
Text: 14px base
Small Text: 12px
Large Text: 16px
Headings: 18px, 24px, 32px

/* Weights */
Regular: 400
Medium: 500
Semibold: 600
Bold: 700
```

**Color System:**
```css
/* Primary Actions */
Primary: #168BB0 (Brand Blue)
Hover: #0F7493

/* Status Colors */
Success: #10b981 (Green)
Warning: #f59e0b (Yellow)
Error: #ef4444 (Red)
Info: #3b82f6 (Blue)

/* Neutral */
Background: #ffffff, #f9fafb
Text: #111827, #6b7280
Border: #e5e7eb
```

**Component Guidelines:**
- Buttons: Minimum 44px height for touch
- Inputs: Clear labels, helpful error messages
- Cards: Subtle shadows, clear borders
- Tables: Zebra striping, clear headers
- Modals: Centered, backdrop blur

### Responsive Breakpoints

```css
/* Mobile First */
@media (min-width: 640px)   /* Tablet */
@media (min-width: 1024px)  /* Desktop */
@media (min-width: 1280px)  /* Large Desktop */
```

**Mobile Considerations:**
- Single column layouts
- Stack tables on mobile
- Large touch targets
- Simplified navigation
- Bottom sheets for modals

---

## File Structure

### Complete Directory Structure

```
app/
├── actions/
│   ├── credits.ts              ← NEW (Credits system)
│   ├── reviews.ts              ← NEW (Reviews workflow)
│   ├── employee.ts             ← NEW (Employee workspace)
│   ├── notifications.ts        ← UPDATE (Add review events)
│   └── admin/
│       └── reviews.ts          ← NEW (Admin management)
│
├── admin/services/reviews/    ← NEW (Admin reviews section)
│   ├── page.tsx               // Reviews overview
│   ├── packages/
│   │   ├── page.tsx          // Packages list
│   │   ├── create/
│   │   │   └── page.tsx     // Create package
│   │   └── [id]/
│   │       └── edit/
│   │           └── page.tsx // Edit package
│   ├── orders/
│   │   ├── page.tsx          // All orders
│   │   ├── pending/
│   │   │   └── page.tsx     // Pending approvals
│   │   └── [id]/
│   │       └── page.tsx     // Order details
│   ├── employees/
│   │   ├── page.tsx          // Employee list
│   │   ├── create/
│   │   │   └── page.tsx     // Create employee
│   │   └── [id]/
│   │       ├── page.tsx     // Employee details
│   │       └── performance/
│   │           └── page.tsx // Performance stats
│   └── credits/
│       ├── page.tsx          // Credits overview
│       ├── transactions/
│       │   └── page.tsx     // Transaction history
│       └── adjust/
│           └── page.tsx     // Adjust credits
│
├── employee/                   ← NEW (Employee workspace)
│   ├── layout.tsx            // Employee sidebar
│   ├── dashboard/
│   │   └── page.tsx         // Available orders
│   ├── my-orders/
│   │   ├── page.tsx         // My orders list
│   │   ├── active/
│   │   │   └── page.tsx    // Active orders
│   │   └── completed/
│   │       └── page.tsx    // Completed history
│   └── stats/
│       └── page.tsx         // Performance metrics
│
├── dashboard/services/reviews/ ← NEW (Client reviews)
│   ├── page.tsx             // Reviews dashboard
│   ├── new-order/
│   │   └── page.tsx        // Create order form
│   ├── orders/
│   │   ├── page.tsx        // Order history
│   │   └── [id]/
│   │       └── page.tsx   // Order details
│   ├── feedback/
│   │   └── [id]/
│   │       └── page.tsx   // Submit feedback
│   └── packages/
│       └── page.tsx        // View packages
│
├── wallet/                    ← NEW (Wallet section)
│   ├── page.tsx             // Wallet overview
│   ├── top-up/
│   │   └── page.tsx        // Purchase credits
│   └── transactions/
│       └── page.tsx        // Transaction history
│
└── components/
    ├── reviews/              ← NEW (Reviews components)
    │   ├── client/
    │   │   ├── ReviewOrderForm.tsx
    │   │   ├── OrdersList.tsx
    │   │   ├── OrderDetailCard.tsx
    │   │   └── FeedbackPicker.tsx
    │   ├── employee/
    │   │   ├── OrdersPool.tsx
    │   │   ├── MyOrdersList.tsx
    │   │   ├── OrderProofForm.tsx
    │   │   ├── AvailabilityToggle.tsx
    │   │   └── PerformanceCard.tsx
    │   └── admin/
    │       ├── PackagesManagement.tsx
    │       ├── PackageForm.tsx
    │       ├── OrdersOverview.tsx
    │       ├── OrdersTable.tsx
    │       ├── OrderApprovalCard.tsx
    │       ├── EmployeesList.tsx
    │       ├── CreateEmployeeForm.tsx
    │       ├── CreditsOverview.tsx
    │       ├── TransactionsTable.tsx
    │       └── CreditAdjustmentForm.tsx
    │
    └── credits/              ← NEW (Credits components)
        ├── CreditPackagesList.tsx
        ├── CreditPackageCard.tsx
        ├── PurchaseCreditsButton.tsx
        ├── CreditsBalanceCard.tsx
        └── CreditsHistory.tsx
```

---

## Data Flow Diagrams

### Credits Purchase Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Browse Packages
       ↓
┌───────────────────┐
│ Wallet/Packages  │
└──────┬────────────┘
       │ 2. Select Package
       ↓
┌──────────────────┐
│ Stripe Checkout  │
└──────┬────────────┘
       │ 3. Payment Success
       ↓
┌──────────────────────┐
│ Webhook Handler      │
│ (fulfillCreditsPurchase)
└──────┬───────────────┘
       │ 4. Create CreditTransaction
       │ 5. Update User Balance
       ↓
┌───────────────────┐
│ Send Notification │
│ (Client + Admin)  │
└──────┬────────────┘
       │ 6. Redirect to Wallet
       ↓
┌─────────────────┐
│ Success Display │
└─────────────────┘
```

### Review Order Creation Flow

```
┌─────────────┐
│   Client    │
└──────┬──────┘
       │ 1. Create Review Order
       ↓
┌─────────────────────┐
│ Validate Credits    │
│ (Check Balance)     │
└──────┬──────────────┘
       │ 2. Sufficient Credits?
       │    ├─ No → Show Error
       │    └─ Yes → Continue
       ↓
┌───────────────────────┐
│ Create ReviewOrder    │
│ (Status: PENDING)     │
└──────┬───────────────┘
       │ 3. Deduct Credits
       ↓
┌──────────────────────┐
│ Create CreditTransaction │
│ (Type: SPEND)       │
└──────┬───────────────┘
       │ 4. Add to Pool
       ↓
┌─────────────────────┐
│ Notify All Employees │
│ (Telegram + In-App)  │
└──────┬──────────────┘
       │ 5. Redirect to Orders
       ↓
┌───────────────────┐
│ Order in History  │
└───────────────────┘
```

### Employee Order Processing Flow

```
┌──────────┐
│ Employee │
└────┬─────┘
     │ 1. View Available Orders
     ↓
┌──────────────┐
│ Orders Pool  │
└────┬─────────┘
     │ 2. Claim Order
     ↓
┌───────────────────────┐
│ Assign Employee       │
│ (Status: IN_PROGRESS) │
└──────┬────────────────┘
       │ 3. Notify Others
       ↓
┌──────────────────┐
│ Process Review  │
└────┬─────────────┘
     │ 4. Submit Proof
     ↓
┌────────────────────┐
│ Update Order Proof │
└────┬───────────────┘
     │ 5. Notify Admin
     ↓
┌────────────────────┐
│ Awaiting Approval  │
└────────────────────┘
```

### Admin Approval Flow

```
┌────────┐
│ Admin  │
└────┬───┘
     │ 1. View Pending Approvals
     ↓
┌──────────────────┐
│ Review Proof     │
│ (URL/Screenshot/Text)
└────┬─────────────┘
     │ 2. Make Decision
     ├─ Approve ┐
     └─ Reject  ┘
              ↓
┌──────────────────────┐
│ Update Order Status  │
│ (COMPLETED/REJECTED)  │
└──────┬───────────────┘
       │ 3. Add Admin Notes (if any)
       ↓
┌─────────────────────┐
│ Send Notifications │
│ (Client + Employee) │
└──────┬──────────────┘
       │ 4. Update Stats
       ↓
┌──────────────────┐
│ Process Complete │
└──────────────────┘
```

---

## Implementation Timeline

### Week 1: Credits Foundation
**Days 1-2: Database & Core Actions**
- Update database schema with new fields
- Create `credits.ts` server actions
- Set up basic credit packages management
- Implement credit transaction ledger

**Days 3-4: Components & UI**
- Build credit packages list component
- Create package management forms
- Implement wallet overview page
- Build credit purchase flow

**Days 5-7: Integration & Testing**
- Integrate Stripe checkout
- Test credit purchase flow
- Implement transaction history
- Add Telegram notifications for credits

### Week 2: Client Reviews Interface
**Days 8-9: Order Creation**
- Create review order form
- Implement credits validation
- Build order submission flow
- Add order creation notifications

**Days 10-11: Order Management**
- Build order history list
- Create order detail view
- Implement client feedback
- Add status tracking

**Days 12-14: Polish & Testing**
- Test complete client flow
- Mobile responsiveness
- Error handling
- User experience refinement

### Week 3: Employee Workspace
**Days 15-16: Employee Setup**
- Create employee account creation
- Build employee dashboard
- Implement availability toggles
- Set up employee authentication

**Days 17-18: Order Pool**
- Build available orders pool
- Implement order claiming
- Add skip functionality
- Create proof submission

**Days 19-21: Employee Features**
- Build my orders list
- Implement performance tracking
- Add order history
- Test complete employee flow

### Week 4: Admin Management
**Days 22-23: Orders Management**
- Build orders overview dashboard
- Create pending approvals queue
- Implement approval workflow
- Add manual assignment

**Days 24-25: Employee Management**
- Build employee management interface
- Implement performance tracking views
- Add employee statistics
- Create employee details page

**Days 26-28: Credits & Testing**
- Build credits management dashboard
- Implement credit adjustment interface
- Test complete admin flow
- Integration testing

### Week 5: Polish & Launch
**Days 29-30: Telegram Integration**
- Implement all review notifications
- Test Telegram delivery
- Add notification templates
- Handle failed notifications

**Days 31-32: Mobile & Performance**
- Mobile responsiveness testing
- Performance optimization
- Database indexing
- Caching implementation

**Days 33-35: Final Testing**
- End-to-end testing
- Security testing
- User acceptance testing
- Bug fixes and polish
- **Launch Ready** 🚀

---

## Success Criteria

### Functional Requirements
- ✅ Clients can purchase credits via Stripe
- ✅ Clients can create review orders with credits
- ✅ Employees can view and claim available orders
- ✅ Employees can submit completion proof
- ✅ Admins can approve/reject completed orders
- ✅ All notifications work via Telegram and in-app
- ✅ Credits balance is accurate and transaction history complete

### Non-Functional Requirements
- ✅ Mobile-responsive design
- ✅ Clean, minimal UI following existing patterns
- ✅ Page load time < 2 seconds
- ✅ Secure credit transactions
- ✅ Proper error handling throughout
- ✅ Scalable architecture for future services

### User Experience Goals
- ✅ Intuitive navigation following new sidebar structure
- ✅ Clear feedback for all user actions
- ✅ Consistent styling with existing application
- ✅ Accessible on all device sizes
- ✅ Fast, responsive interactions

---

## Future Scalability

### Planned Services (Clocker, Prompt)
The architecture is designed for easy expansion:
- Credit system can be universal across services
- Employee system can manage multiple service types
- Notification system is service-agnostic
- Sidebar structure supports additional services

### Extensibility Points
- Service-specific credit costs configuration
- Employee specialization by service type
- Service-specific approval workflows
- Flexible notification templates
- Modular component structure

---

**Document Version:** 1.0
**Last Updated:** 2026-07-25
**Status:** Ready for Implementation
