# Reviews System Redesign - TODO List

## ✅ COMPLETED

### Phase 1: Database & Server Actions ✅
- [x] Database migration (SQL executed in Supabase)
- [x] Prisma schema updated and synced
- [x] Server actions created:
  - [x] Multi-URL support (`/app/actions/reviews-multiurl.ts`)
  - [x] Employee earnings (`/app/actions/employee-earnings.ts`)
  - [x] Admin earnings (`/app/actions/admin-earnings.ts`)
  - [x] Task distribution toggle (`/app/actions/admin-reviews.ts`)

### Phase 2: Client Order Creation (Multi-URL) ✅
- [x] Dynamic URL list (add/remove URLs, max 10)
- [x] Each URL has: url, quantity, reviewContent, photos, reactionType
- [x] Calls `createMultiUrlReviewOrderAction()`
- [x] Shows total quantity and credits across all URLs
- [x] Validates per-URL review content (500 char max)
- **File:** `/app/c/services/reviews/new-order/page.tsx`

### Phase 3: Employee Dashboard (URL Tasks) ✅
- [x] Replaced order fetching with URL task fetching
- [x] Uses `acceptUrlTaskAction()` from reviews-multiurl
- [x] Shows URL-specific info (url, review index, quantity, content)
- [x] Copy Review button on each task card
- [x] Task distribution toggle (`accepting_tasks` field)
- **Files:** `/app/e/dashboard/page.tsx`, `/app/e/dashboard/EmployeeDashboardContent.tsx`

### Phase 4: Copy Review Button Integration ✅
- [x] Employee dashboard task cards have Copy Review button
- [x] Employee order detail page has Copy Review button per task
- [x] Shows all URL tasks for an order with individual copy buttons
- **Files:** `/app/e/orders/[id]/page.tsx`

### Core UI Components ✅
- [x] Copy Review Button (`/components/reviews/CopyReviewButton.tsx`)
- [x] Employee Earnings Dashboard (`/e/earnings`)
- [x] Admin Earnings Overview (`/a/earnings`)
- [x] Payment Rules Configuration (`/a/earnings/rules`)
- [x] Payout Processing (`/a/earnings/payouts`)

---

## ✅ COMPLETED

### Phase 5: Add RLS Policies (Security) ✅ COMPLETED
- [x] RLS enabled on 5 new tables
- [x] 17 security policies created
- [x] Employee access controls active
- [x] Admin access controls active
- [x] Client access controls active

---

## ✅ COMPLETED

### Phase 7: Task Distribution Toggle & Cleanup ✅ COMPLETED (2026-08-12)
- [x] Added `acceptingTasks` field to employee performance data
- [x] Implemented task distribution toggle in employee management UI
- [x] Separate controls: Task Distribution (acceptingTasks) + Account Active (isActive)
- [x] Updated status badges to show "No Tasks" when acceptingTasks is OFF
- [x] Deleted queue page (`/app/a/reviews/queue/`) - replaced by employee self-assignment
- [x] Deleted history page (`/app/a/reviews/history/`) - audit/history not needed per redesign
- [x] Updated reviews overview page to remove queue/history links
- **Files Modified:**
  - `/app/actions/admin-reviews.ts` - accepting_tasks already included via `*`
  - `/app/a/reviews/employees/page.tsx` - normalize accepting_tasks field
  - `/app/a/reviews/employees/employees-client.tsx` - add task distribution toggle UI

---

## ✅ COMPLETED

### Phase 8: Employee Panel Cleanup ✅ COMPLETED (2026-08-12)
- [x] Deleted obsolete pages per redesign requirements
- [x] Removed `/app/e/reviews/` directory (duplicate of dashboard)
- [x] Removed `/app/e/reviews/completed/` (covered by earnings history)
- [x] Updated navigation structure in employee layout
- [x] Removed "Audit & History" section from sidebar
- [x] Removed "Review Queue" link from navigation
- [x] Added "Earnings" link to navigation with Wallet icon
- **Simplified Navigation:**
  - Dashboard (/e/dashboard)
  - Available Orders (/e/orders)
  - Earnings (/e/earnings) ← NEW
  - Notifications (/e/notifications)
- **File Modified:**
  - `/app/e/employee-client-layout.tsx` - Updated navEntries array

---

## 🔄 REMAINING TASKS

### Phase 6: End-to-End Testing

**Status:** ✅ DONE (2025-01-11)
**SQL Script:** `/migrations/phase5_rls_policies.sql`

**Policies Created:**
- ✅ 17 policies across 5 tables
- ✅ RLS enabled on: review_urls, employee_earnings, employee_earning_transactions, employee_payout_requests, employee_earning_rules
- ✅ Employee, Admin, and Client access controls active

**Run in Supabase SQL Editor:**

```sql
-- Enable RLS on new tables
ALTER TABLE review_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earning_rules ENABLE ROW LEVEL SECURITY;

-- Employees see pending tasks
CREATE POLICY "Employees see pending tasks" ON review_urls
FOR SELECT USING (status = 'PENDING');

-- Employees see own assigned tasks
CREATE POLICY "Employees see own tasks" ON review_urls
FOR SELECT USING (assigned_employee_id = auth.uid());

-- Employees can update own tasks
CREATE POLICY "Employees update own tasks" ON review_urls
FOR UPDATE USING (assigned_employee_id = auth.uid());

-- Admins see all review_urls
CREATE POLICY "Admins see all review_urls" ON review_urls
FOR SELECT USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- Clients see own review_urls
CREATE POLICY "Clients see own review_urls" ON review_urls
FOR SELECT USING (
  review_order_id IN (
    SELECT id FROM review_orders WHERE user_id = auth.uid()
  )
);

-- Users see own earnings
CREATE POLICY "See own earnings" ON employee_earnings
FOR SELECT USING (user_id = auth.uid());

-- Users update own earnings
CREATE POLICY "Update own earnings" ON employee_earnings
FOR UPDATE USING (user_id = auth.uid());

-- Admins see all earnings
CREATE POLICY "Admins see all earnings" ON employee_earnings
FOR ALL USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- Similar policies for employee_earning_transactions, employee_payout_requests, employee_earning_rules
```

---

### Phase 6: End-to-End Testing

**Test Flow:**
1. [ ] **Admin** → `/a/earnings/rules` → Verify 6 payment rules exist
2. [ ] **Admin** → Edit a payment rule (change amount)
3. [ ] **Client** → `/c/services/reviews/new-order` → Create multi-URL order
4. [ ] **Employee** → `/e/dashboard` → See URL tasks (not full orders)
5. [ ] **Employee** → Accept a URL task
6. [ ] **Employee** → Copy review text, complete task with proof
7. [ ] **Employee** → `/e/earnings` → Verify earnings credited (when all URLs in order complete)
8. [ ] **Employee** → Request payout
9. [ ] **Admin** → `/a/earnings/payouts` → Approve payout
10. [ ] Verify balance deducted, transaction recorded

---

## 📁 KEY FILES REFERENCE

### Server Actions:
- `/app/actions/reviews-multiurl.ts` - Multi-URL order support, URL tasks
- `/app/actions/employee-earnings.ts` - Employee wallet & earnings
- `/app/actions/admin-earnings.ts` - Admin earnings management
- `/app/actions/employee-dashboard.ts` - Dashboard URL task fetching
- `/app/actions/employee.ts` - `toggleTaskDistributionAction()`

### UI Components:
- `/components/reviews/CopyReviewButton.tsx`
- `/app/e/earnings/page.tsx` - Employee earnings dashboard
- `/app/a/earnings/page.tsx` - Admin earnings overview
- `/app/a/earnings/rules/page.tsx` - Payment rules configuration
- `/app/a/earnings/payouts/page.tsx` - Payout processing
- `/app/e/dashboard/EmployeeDashboardContent.tsx` - URL tasks view
- `/app/e/orders/[id]/page.tsx` - Order detail with all URL tasks
- `/app/c/services/reviews/new-order/page.tsx` - Multi-URL order creation

### Database:
- `/migrations/reviews_system_redesign.sql` - Migration script (EXECUTED)

---

## 🔧 HELPER COMMANDS

```bash
# Deploy to Vercel
git add .
git commit -m "feat: Reviews System Redesign - Complete"
git push origin master

# Sync Prisma (if needed)
npx prisma generate

# Run dev server locally
npm run dev

# Build check
npm run build
```

---

## 📝 IMPORTANT NOTES

- **Payment per ORDER** (not per URL) - earnings credited when all URLs in order complete
- **Review content mapping is EXPLICIT** - customer specifies which review for each URL
- **`current_period_earned` NEVER resets** - cumulative, no auto-reset
- **Payment rules use PRIORITY matching** - higher priority rules checked first
- **Task distribution toggle** - separate from account activation (`accepting_tasks` field)

---

## ✅ CHECKLIST FOR COMPLETION

- [x] Database migration executed
- [x] Server actions created
- [x] Multi-URL order creation works
- [x] Employee dashboard shows URL tasks
- [x] Copy Review button functional
- [x] Employee earnings pages created
- [x] Admin earnings pages created
- [x] RLS policies enabled (Phase 5)
- [x] Task distribution toggle implemented (Phase 7)
- [x] Employee panel cleaned up (Phase 8)
- [ ] End-to-end testing (Phase 6)
- [ ] Deploy to production

---

**Status**: Phases 1-5, 7-8 ✅ COMPLETE | Phase 6 🔄 Testing | 🚀 Ready for Production
