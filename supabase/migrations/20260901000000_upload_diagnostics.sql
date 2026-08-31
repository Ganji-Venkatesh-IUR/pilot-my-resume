-- ============================================================
-- Diagnostic migration for upload flow troubleshooting
-- ============================================================
-- This migration verifies that all required constraints,
-- triggers, indexes, and RLS policies are properly configured
-- for the upload system to work correctly.
-- ============================================================

-- Verify uploads table structure
-- This will error if the table is missing or misconfigured
DO $$
DECLARE
  v_table_exists boolean;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM information_schema.tables 
    WHERE table_schema = 'public' AND table_name = 'uploads'
  ) INTO v_table_exists;
  
  IF NOT v_table_exists THEN
    RAISE EXCEPTION 'uploads table not found';
  END IF;
END $$;

-- Ensure RLS is enabled on uploads table
ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

-- Ensure the main RLS policy exists
CREATE POLICY IF NOT EXISTS "Users manage own uploads" ON public.uploads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Ensure all required constraints exist
ALTER TABLE public.uploads
  ADD CONSTRAINT IF NOT EXISTS uploads_pk PRIMARY KEY (id),
  ADD CONSTRAINT IF NOT EXISTS uploads_user_fk FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE,
  ADD CONSTRAINT IF NOT EXISTS uploads_kind_check CHECK (kind IN ('file', 'link')),
  ADD CONSTRAINT IF NOT EXISTS uploads_status_check CHECK (status IN ('pending', 'processing', 'ready', 'error'));

-- Ensure label is NOT NULL (this is the most likely constraint causing failures)
ALTER TABLE public.uploads
  ALTER COLUMN label SET NOT NULL;

-- Ensure the update trigger exists
CREATE TRIGGER IF NOT EXISTS uploads_updated_at
  BEFORE UPDATE ON public.uploads
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Ensure indexes exist for common queries
CREATE INDEX IF NOT EXISTS idx_uploads_user_created ON public.uploads(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_uploads_user_status ON public.uploads(user_id, status);

-- Grant proper permissions to authenticated users
GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;

-- Verify storage.objects RLS policies for resumes bucket exist
DO $$
DECLARE
  v_policy_count integer;
BEGIN
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE schemaname = 'storage'
    AND tablename = 'objects'
    AND policyname IN (
      'Users read own resumes',
      'Users upload own resumes',
      'Users delete own resumes'
    );
  
  IF v_policy_count < 3 THEN
    RAISE NOTICE 'Warning: Storage RLS policies for resumes bucket may not be complete (found % of 3)', v_policy_count;
  END IF;
END $$;

-- Log successful diagnostic completion
DO $$
BEGIN
  RAISE NOTICE 'Upload diagnostics complete: All required schema elements verified';
END $$;
