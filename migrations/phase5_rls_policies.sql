-- ============================================================================
-- Phase 5: RLS Policies for Reviews System Redesign
-- ============================================================================
-- Run this in Supabase SQL Editor to secure the new tables
-- ============================================================================

-- Enable RLS on all new tables
ALTER TABLE review_urls ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earnings ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earning_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_payout_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_earning_rules ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- REVIEW_URLS Policies
-- ============================================================================

-- Policy 1: Employees can see PENDING tasks (available to accept)
CREATE POLICY "employees_see_pending_tasks" ON review_urls
FOR SELECT
USING (status = 'PENDING');

-- Policy 2: Employees can see their own assigned tasks
CREATE POLICY "employees_see_own_tasks" ON review_urls
FOR SELECT
USING (assigned_employee_id = auth.uid());

-- Policy 3: Employees can update their own assigned tasks
CREATE POLICY "employees_update_own_tasks" ON review_urls
FOR UPDATE
USING (assigned_employee_id = auth.uid());

-- Policy 4: Employees can insert task completion (submit proof)
CREATE POLICY "employees_insert_completion" ON review_urls
FOR INSERT
WITH CHECK (assigned_employee_id = auth.uid());

-- Policy 5: Admins can see all review_urls
CREATE POLICY "admins_see_all_review_urls" ON review_urls
FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- Policy 6: Clients can see their own review_urls (through their orders)
CREATE POLICY "clients_see_own_review_urls" ON review_urls
FOR SELECT
USING (
  review_order_id IN (
    SELECT id FROM review_orders WHERE user_id = auth.uid()
  )
);

-- ============================================================================
-- EMPLOYEE_EARNINGS Policies
-- ============================================================================

-- Policy 1: Users can see their own earnings
CREATE POLICY "users_see_own_earnings" ON employee_earnings
FOR SELECT
USING (user_id = auth.uid());

-- Policy 2: Users can update their own earnings (payout details, etc.)
CREATE POLICY "users_update_own_earnings" ON employee_earnings
FOR UPDATE
USING (user_id = auth.uid());

-- Policy 3: Admins can see all employee earnings
CREATE POLICY "admins_see_all_earnings" ON employee_earnings
FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- EMPLOYEE_EARNING_TRANSACTIONS Policies
-- ============================================================================

-- Policy 1: Users can see their own transactions
CREATE POLICY "users_see_own_transactions" ON employee_earning_transactions
FOR SELECT
USING (
  employee_earnings_id IN (
    SELECT id FROM employee_earnings WHERE user_id = auth.uid()
  )
);

-- Policy 2: Admins can see all transactions
CREATE POLICY "admins_see_all_transactions" ON employee_earning_transactions
FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- EMPLOYEE_PAYOUT_REQUESTS Policies
-- ============================================================================

-- Policy 1: Users can see their own payout requests
CREATE POLICY "users_see_own_payouts" ON employee_payout_requests
FOR SELECT
USING (
  employee_earnings_id IN (
    SELECT id FROM employee_earnings WHERE user_id = auth.uid()
  )
);

-- Policy 2: Users can create payout requests
CREATE POLICY "users_create_payouts" ON employee_payout_requests
FOR INSERT
WITH CHECK (
  employee_earnings_id IN (
    SELECT id FROM employee_earnings WHERE user_id = auth.uid()
  )
);

-- Policy 3: Admins can see all payout requests
CREATE POLICY "admins_manage_payouts" ON employee_payout_requests
FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- EMPLOYEE_EARNING_RULES Policies
-- ============================================================================

-- Policy 1: Everyone can see active earning rules (read-only)
CREATE POLICY "everyone_see_active_rules" ON employee_earning_rules
FOR SELECT
USING (is_active = true);

-- Policy 2: Admins can manage earning rules
CREATE POLICY "admins_manage_rules" ON employee_earning_rules
FOR ALL
USING (
  (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
);

-- ============================================================================
-- VERIFICATION QUERIES (Run these to verify policies are working)
-- ============================================================================

-- Check RLS is enabled on all tables
SELECT
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('review_urls', 'employee_earnings', 'employee_earning_transactions', 'employee_payout_requests', 'employee_earning_rules')
ORDER BY tablename;

-- Check all policies created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('review_urls', 'employee_earnings', 'employee_earning_transactions', 'employee_payout_requests', 'employee_earning_rules')
ORDER BY tablename, policyname;

-- ============================================================================
-- ROLLBACK SCRIPT (If needed, use this to remove all policies)
-- ============================================================================
-- COMMENT OUT THE BELOW TO DISABLE RLS:

-- DROP POLICY IF EXISTS "employees_see_pending_tasks" ON review_urls;
-- DROP POLICY IF EXISTS "employees_see_own_tasks" ON review_urls;
-- DROP POLICY IF EXISTS "employees_update_own_tasks" ON review_urls;
-- DROP POLICY IF EXISTS "employees_insert_completion" ON review_urls;
-- DROP POLICY IF EXISTS "admins_see_all_review_urls" ON review_urls;
-- DROP POLICY IF EXISTS "clients_see_own_review_urls" ON review_urls;

-- DROP POLICY IF EXISTS "users_see_own_earnings" ON employee_earnings;
-- DROP POLICY IF EXISTS "users_update_own_earnings" ON employee_earnings;
-- DROP POLICY IF EXISTS "admins_see_all_earnings" ON employee_earnings;

-- DROP POLICY IF EXISTS "users_see_own_transactions" ON employee_earning_transactions;
-- DROP POLICY IF EXISTS "admins_see_all_transactions" ON employee_earning_transactions;

-- DROP POLICY IF EXISTS "users_see_own_payouts" ON employee_payout_requests;
-- DROP POLICY IF EXISTS "users_create_payouts" ON employee_payout_requests;
-- DROP POLICY IF EXISTS "admins_manage_payouts" ON employee_payout_requests;

-- DROP POLICY IF EXISTS "everyone_see_active_rules" ON employee_earning_rules;
-- DROP POLICY IF EXISTS "admins_manage_rules" ON employee_earning_rules;

-- ALTER TABLE review_urls DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_earnings DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_earning_transactions DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_payout_requests DISABLE ROW LEVEL SECURITY;
-- ALTER TABLE employee_earning_rules DISABLE ROW LEVEL SECURITY;
