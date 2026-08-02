-- =====================================================
-- FIX ORDERS TABLE PERMISSIONS AND RLS POLICIES
-- =====================================================

-- Check current RLS policies
SELECT 'Current RLS policies for orders' as check;
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'orders';

-- Enable RLS
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies and recreate with proper permissions
DROP POLICY IF EXISTS "Users can see own orders" ON orders;
DROP POLICY IF EXISTS "Service role can manage orders" ON orders;
DROP POLICY IF EXISTS "Authenticated can insert orders" ON orders;

-- Policy for users to read their own orders
CREATE POLICY "Users can see own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Policy for service role to do everything
CREATE POLICY "Service role can manage orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- Policy for authenticated users to insert their own orders
CREATE POLICY "Authenticated can insert orders" ON orders
    FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Grant explicit permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;

-- Test if we can insert into the orders table
SELECT 'Testing insert permissions' as test;
DO $$
BEGIN
    -- This will test if service_role can insert
    INSERT INTO orders (user_id, amount, status, type, credit_package_id, stripe_session_id)
    VALUES (
        auth.uid(),
        99.00,
        'PENDING',
        'CREDITS_PURCHASE',
        '46341dee-fef0-4e76-8cb6-1f121fa0b3d2'::uuid,
        'test_session'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE 'Insert test successful';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'Insert test failed: %', SQLERRM;
END $$;

-- Clean up test data
DELETE FROM orders WHERE stripe_session_id = 'test_session';

-- Show final policies
SELECT 'Final RLS policies' as check;
SELECT
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE schemaname = 'public'
    AND tablename = 'orders';
