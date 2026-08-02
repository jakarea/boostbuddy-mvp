-- =====================================================
-- FIX is_active VALUES
-- Update all users based on their status
-- =====================================================

-- Update all records: set is_active based on status
UPDATE public.users
SET is_active = CASE
    WHEN status = 'ACTIVE' THEN true
    ELSE false
END;

-- Verify the fix
SELECT id, email, role, status, is_active
FROM public.users;
