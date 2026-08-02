-- =====================================================
-- CHECK AND CREATE ORDERS TABLE FOR CREDIT PURCHASES
-- =====================================================

-- Check if orders table exists
SELECT 'Checking if orders table exists' as check;
SELECT COUNT(*) as table_exists
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'orders';

-- If it doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'orders'
    ) THEN
        CREATE TABLE orders (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL,
            credit_package_id UUID,
            amount DECIMAL(10,2) NOT NULL,
            status TEXT NOT NULL DEFAULT 'PENDING',
            type TEXT NOT NULL,
            stripe_session_id TEXT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

            CONSTRAINT fk_orders_user
              FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
            CONSTRAINT fk_orders_credit_package
              FOREIGN KEY (credit_package_id) REFERENCES credit_packages(id) ON DELETE SET NULL
        );

        RAISE NOTICE 'Orders table created for credit purchases';
    ELSE
        RAISE NOTICE 'Orders table already exists';
    END IF;
END $$;

-- Enable RLS and create policies
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Users can see their own orders
DROP POLICY IF EXISTS "Users can see own orders" ON orders;
CREATE POLICY "Users can see own orders" ON orders
    FOR SELECT USING (auth.uid() = user_id);

-- Service role can insert/update
DROP POLICY IF EXISTS "Service role can manage orders" ON orders;
CREATE POLICY "Service role can manage orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE ON orders TO authenticated, service_role;

-- Show final table structure
SELECT 'Orders table structure' as check;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'orders'
ORDER BY ordinal_position;
