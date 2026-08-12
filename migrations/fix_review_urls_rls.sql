-- ============================================================================
-- Fix RLS Policy for Clients to Access review_urls
-- ============================================================================
-- Run this in Supabase SQL Editor if clients get "permission denied" error
-- ============================================================================

-- First, check if the policy exists
SELECT policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'review_urls'
  AND policyname = 'clients_see_own_review_urls';

-- If the policy doesn't exist or is incorrect, recreate it:

-- Drop existing policy if it exists (safe to run if doesn't exist)
DROP POLICY IF EXISTS "clients_see_own_review_urls" ON review_urls;

-- Recreate the policy with correct syntax
CREATE POLICY "clients_see_own_review_urls" ON review_urls
FOR SELECT
USING (
  review_order_id IN (
    SELECT id FROM review_orders WHERE user_id = auth.uid()
  )
);

-- Verify the policy was created
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'review_urls'
ORDER BY policyname;

-- Check all RLS policies on review_urls
SELECT
  policyname,
  permissive,
  roles,
  cmd,
  CASE
    WHEN qual IS NOT NULL THEN 'SELECT: ' || substring(qual, 1, 100)
    WHEN with_check IS NOT NULL THEN 'WITH CHECK: ' || substring(with_check, 1, 100)
    ELSE 'No condition'
  END as condition
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename = 'review_urls'
ORDER BY policyname;
