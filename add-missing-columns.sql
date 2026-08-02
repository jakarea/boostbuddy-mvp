-- =====================================================
-- ADD MISSING COLUMNS TO public.users
-- =====================================================

-- Add is_active column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT false;

-- Add updated_at column
ALTER TABLE public.users
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- Update existing records: set is_active = true where status = 'ACTIVE'
UPDATE public.users
SET is_active = CASE
    WHEN status = 'ACTIVE' THEN true
    ELSE false
END
WHERE is_active IS NULL;

-- Set default for is_active for future records
ALTER TABLE public.users
ALTER COLUMN is_active SET DEFAULT false;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Check updated table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Show all users with new columns
SELECT id, email, role, status, is_active, credits_balance
FROM public.users;
