-- Run this in Supabase SQL Editor to add missing columns to the invoices table
-- This will make the database schema match the application expectations

-- Add fileName column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'fileName'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "fileName" TEXT;
    END IF;
END $$;

-- Add fileSize column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "fileSize" TEXT;
    END IF;
END $$;

-- Add createdAt column if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "createdAt" TIMESTAMP WITH TIME ZONE DEFAULT NOW();
    END IF;
END $$;

-- Verify the changes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;