-- =====================================================
-- COMPREHENSIVE DATABASE AUDIT & FIX
-- Identifies and fixes ALL schema mismatches
-- =====================================================

-- 1. CHECK ORDERS TABLE CONSTRAINTS
SELECT '=== ORDERS TABLE CONSTRAINTS ===' as audit_section;
SELECT
    conname as constraint_name,
    contype as constraint_type,
    pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'orders'::regclass
ORDER BY conname;

-- 2. CHECK ALL TABLE STRUCTURES VS CODE EXPECTATIONS
SELECT '=== ALL TABLES STRUCTURE ===' as audit_section;
SELECT
    t.table_name,
    c.column_name,
    c.data_type,
    c.is_nullable,
    c.column_default
FROM information_schema.tables t
JOIN information_schema.columns c ON t.table_name = c.table_name
WHERE t.table_schema = 'public'
    AND t.table_name IN ('orders', 'credit_packages', 'review_orders', 'credit_transactions', 'users', 'notifications', 'employee_stats', 'skipped_reviews', 'review_credit_pricing')
ORDER BY t.table_name, c.ordinal_position;

-- 3. IDENTIFY CHECK CONSTRAINTS ACROSS ALL TABLES
SELECT '=== ALL CHECK CONSTRAINTS ===' as audit_section;
SELECT
    t.table_name,
    con.conname as constraint_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM information_schema.tables t
JOIN pg_constraint con ON con.conrelid = t.table_name::regclass
WHERE t.table_schema = 'public'
    AND con.contype = 'c' -- check constraints
ORDER BY t.table_name, con.conname;

-- 4. SHOW RLS POLICIES STATUS
SELECT '=== RLS POLICIES STATUS ===' as audit_section;
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 5. IDENTIFY FOREIGN KEY ISSUES
SELECT '=== FOREIGN KEY CONSTRAINTS ===' as audit_section;
SELECT
    con.conname as constraint_name,
    cl.relname as table_name,
    pg_get_constraintdef(con.oid) as constraint_definition
FROM pg_constraint con
JOIN pg_class cl ON con.conrelid = cl.oid
WHERE con.contype = 'f' -- foreign keys
    AND cl.relname IN ('orders', 'credit_packages', 'review_orders', 'credit_transactions')
ORDER BY cl.relname, con.conname;
