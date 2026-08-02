-- =====================================================
-- ALTERNATIVE POLICY APPROACH
-- Try different ways to allow access to pricing data
-- =====================================================

-- Try 1: Use a more permissive policy for pricing data
DROP POLICY IF EXISTS "Authenticated can read pricing" ON review_credit_pricing;

-- Allow anyone who can authenticate (including anon users to see pricing)
CREATE POLICY "Allow read access to pricing" ON review_credit_pricing
    FOR SELECT USING (true);

-- Verify the policy
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE tablename = 'review_credit_pricing';

-- Test the policy by trying to select (this will show if it works)
SELECT 'Testing policy access' as test;
SELECT COUNT(*) as total_pricing FROM review_credit_pricing;

-- If still having issues, try disabling RLS entirely for this public pricing table
-- (Pricing is public information, no need to restrict)
ALTER TABLE review_credit_pricing DISABLE ROW LEVEL SECURITY;

-- Verify RLS is disabled
SELECT tablename, rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

-- Test access again
SELECT 'After disabling RLS' as test;
SELECT * FROM review_credit_pricing;
