-- Comprehensive fix for employee creation
-- Run this in Supabase Dashboard → SQL Editor

-- Step 1: Fix the users_role_check constraint to allow EMPLOYEE role
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;
ALTER TABLE users ADD CONSTRAINT users_role_check
  CHECK (role IN ('ADMIN', 'CLIENT', 'EMPLOYEE'));

-- Step 2: Update the trigger to respect isActive metadata and set ACTIVE status
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
            WHEN COALESCE((NEW.raw_user_meta_data->>'isActive')::boolean, false) = true THEN 'ACTIVE'
            ELSE 'PENDING'
        END,
        COALESCE((NEW.email_confirmed_at IS NOT NULL), false),
        NOW(),
        NOW()
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 3: Verify the fix
SELECT
    constraint_name,
    check_clause
FROM
    information_schema.table_constraints
JOIN
    information_schema.check_constraints
ON
    table_constraints.constraint_name = check_constraints.constraint_name
WHERE
    table_name = 'users'
    AND constraint_schema = 'public';

-- Step 4: Test that the function is working correctly
SELECT
    routine_name,
    routine_definition
FROM
    information_schema.routines
WHERE
    routine_schema = 'public'
    AND routine_name = 'handle_new_user';