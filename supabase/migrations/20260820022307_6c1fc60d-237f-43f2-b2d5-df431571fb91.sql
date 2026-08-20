CREATE TABLE public.career_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  subtitle TEXT,
  organization TEXT,
  location TEXT,
  start_date TEXT,
  end_date TEXT,
  is_current BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  bullets JSONB NOT NULL DEFAULT '[]'::jsonb,
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  level TEXT,
  url TEXT,
  position INTEGER NOT NULL DEFAULT 0,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT career_entries_kind_check CHECK (kind IN ('education','skill','project','experience','certification','achievement','link'))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.career_entries TO authenticated;
GRANT ALL ON public.career_entries TO service_role;

ALTER TABLE public.career_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own career entries"
  ON public.career_entries FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX career_entries_user_kind_idx ON public.career_entries (user_id, kind, position);

CREATE TRIGGER career_entries_updated_at
  BEFORE UPDATE ON public.career_entries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS phone TEXT,
  ADD COLUMN IF NOT EXISTS job_title TEXT,
  ADD COLUMN IF NOT EXISTS summary TEXT;