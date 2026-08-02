-- =====================================================
-- CREATE PUBLIC USERS TABLE
-- This creates the missing 'users' table that the app expects
-- Run this in Supabase SQL Editor
-- =====================================================

-- Create the users table in public schema
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'CLIENT',
    is_active BOOLEAN DEFAULT false,
    status TEXT DEFAULT 'PENDING',
    credits_balance INTEGER DEFAULT 0,
    telegram_chat_id TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON public.users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON public.users(status);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- RLS Policies: Users can read their own data, admins can read all
CREATE POLICY "Users can view own data" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Admins can view all users" ON public.users
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.users WHERE role = 'ADMIN'
        )
    );

CREATE POLICY "Users can update own data" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Trigger to automatically create user profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, name, role, status, email_verified, created_at, updated_at)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'name', ''),
        COALESCE(NEW.raw_user_meta_data->>'role', 'CLIENT'),
        CASE
            -- Admin-created accounts with isActive=true should be ACTIVE
            WHEN COALESCE((NEW.raw_user_meta_data->>'isActive')::boolean, false) = true THEN 'ACTIVE'
            -- Regular signups start as PENDING
            ELSE 'PENDING'
        END,
        CASE
            -- Admin-created accounts with emailConfirm=true should be verified
            WHEN COALESCE((NEW.raw_user_meta_data->>'isActive')::boolean, false) = true THEN true
            -- Or if email was confirmed during signup
            WHEN NEW.email_confirmed_at IS NOT NULL THEN true
            -- Otherwise unverified
            ELSE false
        END,
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();

-- =====================================================
-- VERIFY EXISTING USERS AND CREATE PROFILES IF MISSING
-- =====================================================

-- This ensures all existing auth users have corresponding public.users records
INSERT INTO public.users (id, email, name, role, is_active, status)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', ''),
    COALESCE(au.raw_user_meta_data->>'role', 'CLIENT'),
    COALESCE((au.raw_user_meta_data->>'isActive')::boolean, false),
    'PENDING'
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;

-- =====================================================
-- VERIFICATION QUERY
-- =====================================================

-- Check if all users now have profiles
SELECT
    au.id,
    au.email,
    u.name,
    u.role,
    u.is_active,
    u.status
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id;
