-- =====================================================
-- FIX RLS POLICIES FOR CLIENT ACCESS
-- Allows authenticated users to read pricing and packages
-- =====================================================

-- =====================================================
-- 1. review_credit_pricing - All authenticated users can read pricing
-- =====================================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Authenticated can read pricing" ON review_credit_pricing;
DROP POLICY IF EXISTS "Everyone can read pricing" ON review_credit_pricing;

-- Create permissive policy for authenticated users
CREATE POLICY "Authenticated can read pricing" ON review_credit_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- Alternative: Allow everyone (including anon) to read pricing
-- Uncomment below if you want public pricing access
-- CREATE POLICY "Public can read pricing" ON review_credit_pricing
--     FOR SELECT USING (true);

-- =====================================================
-- 2. credit_packages - All authenticated users can read packages
-- =====================================================

DROP POLICY IF EXISTS "Authenticated can read packages" ON credit_packages;
DROP POLICY IF EXISTS "Public can read packages" ON credit_packages;

CREATE POLICY "Authenticated can read packages" ON credit_packages
    FOR SELECT USING (auth.role() = 'authenticated');

-- Uncomment for public access
-- CREATE POLICY "Public can read packages" ON credit_packages
--     FOR SELECT USING (true);

-- =====================================================
-- 3. review_orders - Users can read own orders only
-- =====================================================

DROP POLICY IF EXISTS "Users can read own orders" ON review_orders;
DROP POLICY IF EXISTS "Employees can read assigned orders" ON review_orders;

CREATE POLICY "Users can read own orders" ON review_orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Employees can read assigned orders" ON review_orders
    FOR SELECT USING (auth.uid() = assigned_employee_id);

-- =====================================================
-- 4. credit_transactions - Users can read own transactions
-- =====================================================

DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;

CREATE POLICY "Users can read own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 5. notifications - Users can read own notifications
-- =====================================================

DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;

CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 6. employee_stats - Users can read own stats
-- =====================================================

DROP POLICY IF EXISTS "Users can read own stats" ON employee_stats;

CREATE POLICY "Users can read own stats" ON employee_stats
    FOR SELECT USING (auth.uid() = user_id);

-- =====================================================
-- 7. skipped_reviews - Users can read own skips
-- =====================================================

DROP POLICY IF EXISTS "Employees can read own skips" ON skipped_reviews;

CREATE POLICY "Employees can read own skips" ON skipped_reviews
    FOR SELECT USING (auth.uid() = employee_id);

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check existing policies for each table
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename IN (
    'review_credit_pricing',
    'credit_packages',
    'review_orders',
    'credit_transactions',
    'notifications',
    'employee_stats',
    'skipped_reviews'
)
ORDER BY tablename, policyname;
