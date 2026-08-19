CREATE TABLE public.uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'file',
  label text NOT NULL,
  file_name text,
  file_type text,
  file_size integer,
  storage_path text,
  source_url text,
  status text NOT NULL DEFAULT 'pending',
  error_message text,
  extracted_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.uploads TO authenticated;
GRANT ALL ON public.uploads TO service_role;

ALTER TABLE public.uploads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own uploads" ON public.uploads
  FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX uploads_user_created_idx ON public.uploads (user_id, created_at DESC);

CREATE TRIGGER uploads_updated_at BEFORE UPDATE ON public.uploads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE POLICY "Users read own career uploads" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'career-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users upload own career uploads" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'career-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own career uploads" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'career-uploads' AND auth.uid()::text = (storage.foldername(name))[1]);