-- =====================================================
-- SAFE MIGRATION: Create/Update public.users table
-- This script is idempotent - safe to run multiple times
-- =====================================================

-- Step 1: Create table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY,
    email TEXT,
    name TEXT,
    role TEXT DEFAULT 'CLIENT',
    status TEXT DEFAULT 'PENDING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Step 2: Add columns one by one (if they don't exist)
-- Using ALTER TABLE with IF NOT EXISTS requires PostgreSQL 11+
-- For older versions, we need a different approach

DO $$
BEGIN
    -- Add is_active column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'is_active'
    ) THEN
        ALTER TABLE public.users ADD COLUMN is_active BOOLEAN DEFAULT false;
    END IF;

    -- Add credits_balance column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'credits_balance'
    ) THEN
        ALTER TABLE public.users ADD COLUMN credits_balance INTEGER DEFAULT 0;
    END IF;

    -- Add telegram_chat_id column
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'users'
        AND column_name = 'telegram_chat_id'
    ) THEN
        ALTER TABLE public.users ADD COLUMN telegram_chat_id TEXT;
    END IF;

    -- Ensure role column is NOT NULL (if needed)
    -- ALTER TABLE public.users ALTER COLUMN role SET NOT NULL;

END $$;

-- Step 3: Create foreign key constraint to auth.users
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint
        WHERE conname = 'users_id_fkey'
    ) THEN
        ALTER TABLE public.users
        ADD CONSTRAINT users_id_fkey
        FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Step 4: Create indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Step 5: Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Step 6: Create RLS policies (if they don't exist)
DROP POLICY IF EXISTS "Users can view own data" ON public.users;
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins can view all users" ON public.users;
CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'ADMIN'
        )
    );

DROP POLICY IF EXISTS "Users can update own data" ON public.users;
CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own data" ON public.users;
CREATE POLICY "Users can insert own data" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Step 7: Create trigger function for auto-creating user profiles
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, is_active, status)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT'),
        COALESCE((NEW.raw_user_meta_data->>'isActive')::boolean, false),
        'PENDING'
    )
    ON CONFLICT (id) DO NOTHING; -- Don't fail if user already exists
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 8: Create trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- Step 9: Backfill existing users (safe INSERT with ON CONFLICT)
INSERT INTO public.users (id, email, name, role, is_active, status, credits_balance)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', ''),
    COALESCE(au.raw_user_meta_data->>'role', 'CLIENT'),
    COALESCE((au.raw_user_meta_data->>'isActive')::boolean, false),
    'PENDING',
    0
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- =====================================================
-- VERIFICATION
-- =====================================================

-- Show final table structure
SELECT 'Table Structure' as info;
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Show all users
SELECT 'All Users' as info;
SELECT id, email, name, role, is_active, status, credits_balance
FROM public.users;
