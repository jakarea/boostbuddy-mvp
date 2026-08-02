-- 🔧 COMPLETE SUPABASE INVOICE TABLE FIX
-- Run this in your Supabase SQL Editor to fix all schema issues

-- First, let's check what columns currently exist
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Add missing columns that exist in Prisma schema but not in Supabase

-- 1. Add orderId column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'orderId'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "orderId" TEXT;
        -- Add foreign key to orders table if it exists
        -- ALTER TABLE invoices ADD CONSTRAINT "invoices_orderId_fkey" FOREIGN KEY ("orderId") REFERENCES "orders"("id") ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Add fileName column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'fileName'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "fileName" TEXT;
    END IF;
END $$;

-- 3. Add fileSize column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'fileSize'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "fileSize" TEXT;
    END IF;
END $$;

-- 4. Add createdAt column if missing
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_name = 'invoices' AND column_name = 'createdAt'
    ) THEN
        ALTER TABLE invoices ADD COLUMN "createdAt" TIMESTAMPTZ DEFAULT NOW();
    END IF;
END $$;

-- Verify the fixes
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'invoices'
ORDER BY ordinal_position;

-- Expected result should have these columns:
-- id, userId, orderId, paymentPeriodStart, paymentPeriodEnd, pdfPath, fileName, fileSize, uploadedAt, createdAt