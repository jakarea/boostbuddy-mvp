-- =====================================================
-- DIAGNOSTIC: Check RLS status for review_credit_pricing
-- =====================================================

-- Check if RLS is enabled on the table
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

-- Check current policies
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

-- Enable RLS on the table if not already enabled
ALTER TABLE review_credit_pricing ENABLE ROW LEVEL SECURITY;

-- Verify RLS is now enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

-- Re-create the policy to ensure it's properly applied
DROP POLICY IF EXISTS "Authenticated can read pricing" ON review_credit_pricing;

CREATE POLICY "Authenticated can read pricing" ON review_credit_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- Final verification
SELECT 'RLS Status after fix' as check_type;
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

SELECT 'Policies after fix' as check_type;
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';
