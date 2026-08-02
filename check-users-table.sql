-- =====================================================
-- DIAGNOSTIC: Check current users table structure
-- Run this first to see what exists
-- =====================================================

-- Check if public.users table exists and its columns
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
    AND table_name = 'users'
ORDER BY ordinal_position;

-- Check if there's any data in the table
SELECT COUNT(*) as total_users FROM public.users;

-- Sample data to see current structure
SELECT * FROM public.users LIMIT 5;
