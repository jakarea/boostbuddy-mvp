-- 🔧 SETUP SUPABASE STORAGE FOR COMMENTS/PHOTOS UPLOAD
-- Run this in your Supabase SQL Editor to configure the 'comments' bucket

-- Check if bucket exists and create if it doesn't
INSERT INTO storage.buckets (id, name, public)
VALUES ('comments', 'comments', true)  -- public bucket allows direct URL access
ON CONFLICT (id) DO NOTHING;

-- Set up permissions for the comments bucket
-- Allow authenticated users to upload photos
CREATE POLICY "Authenticated users can upload photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'comments' AND
  auth.uid() IS NOT NULL
);

-- Allow authenticated users to read photos (public bucket)
CREATE POLICY "Anyone can read photos"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'comments');

-- Allow users to delete their own photos
CREATE POLICY "Users can delete own photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comments' AND
  auth.uid()::text = (storage.foldername(name))[1]
);

-- Alternative: Allow service role to delete any photo (for admin operations)
CREATE POLICY "Service role can delete any photo"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'comments' AND
  (current_setting('request.jwt.claims', true)::jsonb->>'role') = 'service_role'
);

-- Verify bucket creation
SELECT id, name, public FROM storage.buckets WHERE id = 'comments';

-- Expected result should show:
-- id: comments, name: comments, public: true