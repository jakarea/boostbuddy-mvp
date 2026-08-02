-- =====================================================
-- CHECK CREDIT PACKAGES DATA
-- =====================================================

-- Check if credit_packages table exists and has data
SELECT 'Credit packages table exists' as check;
SELECT COUNT(*) as table_exists
FROM pg_tables
WHERE schemaname = 'public' AND tablename = 'credit_packages';

-- Check if table has data
SELECT 'Credit packages data' as check;
SELECT COUNT(*) as row_count FROM credit_packages;

-- Show current credit packages
SELECT 'Current credit packages' as check;
SELECT * FROM credit_packages;

-- If table doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'credit_packages'
    ) THEN
        CREATE TABLE credit_packages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            name TEXT NOT NULL,
            description TEXT,
            credits_amount INTEGER NOT NULL,
            price DECIMAL(10,2) NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insert default packages
        INSERT INTO credit_packages (name, description, credits_amount, price)
        VALUES
            ('Starter Pack', '100 credits for small businesses', 100, 29.00),
            ('Professional Pack', '500 credits for growing businesses', 500, 99.00),
            ('Enterprise Pack', '2000 credits for large operations', 2000, 299.00);

        RAISE NOTICE 'Credit packages table created with default data';
    END IF;
END $$;

-- Ensure RLS is disabled (public pricing)
ALTER TABLE credit_packages DISABLE ROW LEVEL SECURITY;

-- Grant permissions
GRANT SELECT ON credit_packages TO anon, authenticated, service_role;

-- Show final data
SELECT 'Final credit packages' as check;
SELECT * FROM credit_packages;
