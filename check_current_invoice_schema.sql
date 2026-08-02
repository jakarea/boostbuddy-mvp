-- 🔍 CHECK CURRENT SUPABASE INVOICE SCHEMA
-- Run this first to see what columns actually exist

SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- This will show us the exact column names in your Supabase database