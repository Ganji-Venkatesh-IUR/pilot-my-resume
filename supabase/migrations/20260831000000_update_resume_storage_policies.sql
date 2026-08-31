DROP POLICY IF EXISTS "Users read own career uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users upload own career uploads" ON storage.objects;
DROP POLICY IF EXISTS "Users delete own career uploads" ON storage.objects;

CREATE POLICY "Users read own resumes" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users upload own resumes" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users delete own resumes" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'resumes'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
