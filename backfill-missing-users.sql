-- =====================================================
-- BACKFILL MISSING USERS FROM auth.users TO public.users
-- Creates profiles for users who exist in auth but not in public.users
-- =====================================================

-- Insert missing users with their metadata
INSERT INTO public.users (id, email, name, role, status, is_active, credits_balance, accepting_orders)
SELECT
    au.id,
    au.email,
    COALESCE(au.raw_user_meta_data->>'name', split_part(au.email, '@', 1)),
    COALESCE(au.raw_user_meta_data->>'role', 'CLIENT'),
    'ACTIVE',
    true,
    0,
    true
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify all auth users now have profiles
SELECT
    au.id,
    au.email,
    au.raw_user_meta_data->>'name' as metadata_name,
    au.raw_user_meta_data->>'role' as metadata_role,
    u.name,
    u.role,
    u.status,
    u.is_active
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
WHERE u.id IS NULL;
-- This should return 0 rows if all users are backfilled
