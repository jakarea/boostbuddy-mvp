-- =====================================================
-- COMPREHENSIVE PERMISSION FIX
-- Fix all permission issues for the application
-- =====================================================

-- First, let's see what's happening with the table access
SELECT 'Current RLS status' as check_type;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('review_credit_pricing', 'credit_packages', 'review_orders');

-- Grant explicit permissions on the tables
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT UPDATE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- Specific permissions for pricing tables (public read access)
GRANT SELECT ON review_credit_pricing TO anon, authenticated, service_role;
GRANT SELECT ON credit_packages TO anon, authenticated, service_role;

-- Make sure RLS is disabled for public pricing tables
ALTER TABLE review_credit_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages DISABLE ROW LEVEL SECURITY;

-- Enable RLS only for tables that need user-specific restrictions
ALTER TABLE review_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE skipped_reviews ENABLE ROW LEVEL SECURITY;

-- Recreate user-specific policies for tables that need them
-- review_orders: users can see own orders
DROP POLICY IF EXISTS "Users can read own orders" ON review_orders;
CREATE POLICY "Users can read own orders" ON review_orders
    FOR SELECT USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Employees can read assigned orders" ON review_orders;
CREATE POLICY "Employees can read assigned orders" ON review_orders
    FOR SELECT USING (auth.uid() = assigned_employee_id);

DROP POLICY IF EXISTS "Users can insert own orders" ON review_orders;
CREATE POLICY "Users can insert own orders" ON review_orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- credit_transactions: users can see own transactions
DROP POLICY IF EXISTS "Users can read own transactions" ON credit_transactions;
CREATE POLICY "Users can read own transactions" ON credit_transactions
    FOR SELECT USING (auth.uid() = user_id);

-- notifications: users can see own notifications
DROP POLICY IF EXISTS "Users can read own notifications" ON notifications;
CREATE POLICY "Users can read own notifications" ON notifications
    FOR SELECT USING (auth.uid() = user_id);

-- employee_stats: users can see own stats
DROP POLICY IF EXISTS "Users can read own stats" ON employee_stats;
CREATE POLICY "Users can read own stats" ON employee_stats
    FOR SELECT USING (auth.uid() = user_id);

-- skipped_reviews: employees can see own skips
DROP POLICY IF EXISTS "Employees can read own skips" ON skipped_reviews;
CREATE POLICY "Employees can read own skips" ON skipped_reviews
    FOR SELECT USING (auth.uid() = employee_id);

-- Final verification
SELECT 'Final permission check' as check_type;
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('review_credit_pricing', 'credit_packages', 'review_orders');

SELECT 'Pricing data test' as test_type;
SELECT * FROM review_credit_pricing;
