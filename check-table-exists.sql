-- =====================================================
-- DIAGNOSTIC: Verify review_credit_pricing table exists
-- =====================================================

-- Check if table exists in public schema
SELECT
    tablename,
    tableowner,
    hasindexes,
    hasrules,
    hastriggers
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename = 'review_credit_pricing';

-- Check table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'review_credit_pricing'
ORDER BY ordinal_position;

-- Check if there's any data in the table
SELECT COUNT(*) as row_count FROM review_credit_pricing;

-- If table doesn't exist, create it
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename = 'review_credit_pricing'
    ) THEN
        -- Table doesn't exist, create it
        CREATE TABLE review_credit_pricing (
            id INTEGER PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            order_type TEXT NOT NULL UNIQUE,
            credits_per_unit INTEGER NOT NULL,
            is_active BOOLEAN DEFAULT true,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
            updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );

        -- Insert default pricing data
        INSERT INTO review_credit_pricing (order_type, credits_per_unit)
        VALUES
            ('REVIEW', 15),
            ('COMMENT', 10),
            ('COMMENT_WITH_PHOTO', 20);

        RAISE NOTICE 'Table review_credit_pricing created with default data';
    ELSE
        RAISE NOTICE 'Table review_credit_pricing already exists';
    END IF;
END $$;

-- Enable RLS
ALTER TABLE review_credit_pricing ENABLE ROW LEVEL SECURITY;

-- Create policy
DROP POLICY IF EXISTS "Authenticated can read pricing" ON review_credit_pricing;
CREATE POLICY "Authenticated can read pricing" ON review_credit_pricing
    FOR SELECT USING (auth.role() = 'authenticated');

-- Final verification
SELECT 'Table structure after fix' as info;
SELECT
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'review_credit_pricing'
ORDER BY ordinal_position;

SELECT 'Data in table' as info;
SELECT * FROM review_credit_pricing;
