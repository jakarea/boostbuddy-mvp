-- =====================================================
-- COMPREHENSIVE DATABASE FIX (CORRECTED SYNTAX)
-- Fixes ALL schema mismatches in one execution
-- =====================================================

-- =====================================================
-- PART 1: FIX ORDERS TABLE CONSTRAINTS
-- =====================================================

-- Drop problematic check constraints
DO $$
BEGIN
    -- Drop the orders_type_check constraint if it exists
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'orders_type_check'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT orders_type_check;
        RAISE NOTICE 'Dropped orders_type_check constraint';
    END IF;

    -- Drop any other check constraints on orders table
    IF EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
        AND contype = 'c'
        AND conname LIKE '%status%'
    ) THEN
        ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
        RAISE NOTICE 'Dropped orders_status_check constraint';
    END IF;
END $$;

-- Add proper check constraints using DO block
DO $$
BEGIN
    -- Add type constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
        AND conname = 'orders_type_check'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_type_check
            CHECK (type IN ('SERVICE_PURCHASE', 'CREDITS_PURCHASE', 'REVIEW_ORDER', 'RENEWAL', 'REFUND'));
        RAISE NOTICE 'Added orders_type_check constraint';
    END IF;

    -- Add status constraint
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'orders'::regclass
        AND conname = 'orders_status_check'
    ) THEN
        ALTER TABLE orders ADD CONSTRAINT orders_status_check
            CHECK (status IN ('PENDING', 'PAID', 'FAILED', 'CANCELLED', 'REFUNDED'));
        RAISE NOTICE 'Added orders_status_check constraint';
    END IF;
END $$;

-- =====================================================
-- PART 2: FIX CREDIT TRANSACTIONS TABLE
-- =====================================================

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conrelid = 'credit_transactions'::regclass
        AND conname = 'credit_transactions_type_check'
    ) THEN
        ALTER TABLE credit_transactions ADD CONSTRAINT credit_transactions_type_check
            CHECK (type IN ('PURCHASE', 'RENEWAL', 'ADJUSTMENT', 'REFUND', 'GRANT'));
        RAISE NOTICE 'Added credit_transactions_type_check constraint';
    END IF;
END $$;

-- =====================================================
-- PART 3: FIX USERS TABLE - ENSURE COLUMNS EXIST
-- =====================================================

DO $$
BEGIN
    -- Add credits_balance if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'credits_balance'
    ) THEN
        ALTER TABLE users ADD COLUMN credits_balance INTEGER DEFAULT 0;
        RAISE NOTICE 'Added credits_balance to users';
    END IF;

    -- Add telegram_chat_id if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'telegram_chat_id'
    ) THEN
        ALTER TABLE users ADD COLUMN telegram_chat_id TEXT;
        RAISE NOTICE 'Added telegram_chat_id to users';
    END IF;

    -- Add is_active if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'users' AND column_name = 'is_active'
    ) THEN
        ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT false;
        RAISE NOTICE 'Added is_active to users';
    END IF;
END $$;

-- =====================================================
-- PART 4: FIX REVIEW ORDERS TABLE
-- =====================================================

DO $$
BEGIN
    -- Add rejection_reason if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'review_orders' AND column_name = 'rejection_reason'
    ) THEN
        ALTER TABLE review_orders ADD COLUMN rejection_reason TEXT;
        RAISE NOTICE 'Added rejection_reason to review_orders';
    END IF;

    -- Add admin_verification_status if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'review_orders' AND column_name = 'admin_verification_status'
    ) THEN
        ALTER TABLE review_orders ADD COLUMN admin_verification_status TEXT;
        RAISE NOTICE 'Added admin_verification_status to review_orders';
    END IF;

    -- Add admin_verified_at if missing
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'review_orders' AND column_name = 'admin_verified_at'
    ) THEN
        ALTER TABLE review_orders ADD COLUMN admin_verified_at TIMESTAMP WITH TIME ZONE;
        RAISE NOTICE 'Added admin_verified_at to review_orders';
    END IF;
END $$;

-- =====================================================
-- PART 5: FIX RLS POLICIES FOR ALL TABLES
-- =====================================================

-- Disable RLS for public pricing tables
ALTER TABLE review_credit_pricing DISABLE ROW LEVEL SECURITY;
ALTER TABLE credit_packages DISABLE ROW LEVEL SECURITY;

-- Enable proper RLS for user data tables
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE review_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE employee_stats ENABLE ROW LEVEL SECURITY;
ALTER TABLE skipped_reviews ENABLE ROW LEVEL SECURITY;

-- Drop and recreate policies for orders
DROP POLICY IF EXISTS "Users can see own orders" ON orders;
DROP POLICY IF EXISTS "Service role can manage orders" ON orders;
DROP POLICY IF EXISTS "Authenticated can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can insert their own orders" ON orders;
DROP POLICY IF EXISTS "orders_admin_all" ON orders;
DROP POLICY IF EXISTS "orders_view_own" ON orders;

CREATE POLICY "Users can see own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- =====================================================
-- PART 6: GRANT PROPER PERMISSIONS
-- =====================================================

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO authenticated, service_role;
GRANT DELETE ON ALL TABLES IN SCHEMA public TO service_role;

-- =====================================================
-- VERIFICATION
-- =====================================================

SELECT '=== FINAL VERIFICATION ===' as verification_section;

-- Show orders table structure
SELECT 'ORDERS TABLE STRUCTURE' as check;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'orders'
ORDER BY ordinal_position;

-- Show orders constraints
SELECT 'ORDERS TABLE CONSTRAINTS' as check;
SELECT
    conname as constraint_name,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
ORDER BY conname;

-- Test insert for orders
DO $$
BEGIN
    -- Test that we can now insert CREDITS_PURCHASE
    INSERT INTO orders (user_id, amount, status, type, credit_package_id, stripe_session_id)
    VALUES (
        auth.uid(),
        99.00,
        'PAID',
        'CREDITS_PURCHASE',
        '49a9aa5a-9f33-474f-b34f-4b16ddd7b6e6'::uuid,
        'test_constraint_fix'
    )
    ON CONFLICT DO NOTHING;
    RAISE NOTICE '✅ Test insert successful - constraints fixed!';
EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '❌ Test insert failed: %', SQLERRM;
END $$;

-- Clean up test data
DELETE FROM orders WHERE stripe_session_id = 'test_constraint_fix';

SELECT '=== COMPREHENSIVE FIX COMPLETE ===' as status;
