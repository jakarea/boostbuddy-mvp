-- SQL Script to create Supabase Storage bucket for invoices
-- Run this in your Supabase SQL Editor

-- Check if bucket exists and create if it doesn't
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoices', 'invoices', false)
ON CONFLICT (id) DO NOTHING;

-- Set up permissions for the invoices bucket
-- Allow admins to upload, read, and delete
CREATE POLICY "Admins can upload invoices"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoices' AND
  (
    -- Service role key can always upload
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR
    -- Admin users can upload
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  )
);

CREATE POLICY "Admins can read invoices"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'invoices' AND
  (
    -- Service role can always read
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR
    -- Admins can read all invoices
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
    OR
    -- Users can read their own invoices
    owner = auth.uid()
  )
);

CREATE POLICY "Admins can delete invoices"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoices' AND
  (
    -- Service role can always delete
    (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
    OR
    -- Admins can delete any invoice
    (SELECT role FROM users WHERE id = auth.uid()) = 'ADMIN'
  )
);

-- Verify bucket creation
SELECT id, name, public FROM storage.buckets WHERE id = 'invoices';