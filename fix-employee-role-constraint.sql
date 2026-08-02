-- Fix users_role_check constraint to allow EMPLOYEE role
-- Drop the old constraint that only allowed ADMIN and CLIENT
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_role_check;

-- Add new constraint that allows ADMIN, CLIENT, and EMPLOYEE
ALTER TABLE users ADD CONSTRAINT users_role_check 
  CHECK (role IN ('ADMIN', 'CLIENT', 'EMPLOYEE'));

-- Verify the fix
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
