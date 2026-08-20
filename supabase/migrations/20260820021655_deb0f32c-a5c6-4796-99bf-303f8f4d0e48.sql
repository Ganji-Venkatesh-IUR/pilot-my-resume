CREATE TABLE public.job_targets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'Untitled role',
  company TEXT,
  jd_text TEXT NOT NULL,
  analysis JSONB,
  match JSONB,
  match_score INTEGER,
  base_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  tailored_resume_id UUID REFERENCES public.resumes(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'analyzed',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.job_targets TO authenticated;
GRANT ALL ON public.job_targets TO service_role;

ALTER TABLE public.job_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage their own job targets"
ON public.job_targets FOR ALL TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE INDEX job_targets_user_created_idx ON public.job_targets (user_id, created_at DESC);

CREATE TRIGGER update_job_targets_updated_at
BEFORE UPDATE ON public.job_targets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();