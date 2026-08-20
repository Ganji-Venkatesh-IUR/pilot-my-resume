-- =========================================================
-- CareerPilot AI — schema completion, constraints & indexes
-- =========================================================

-- ---------- 1. RESUME VERSIONS (snapshot history) ----------
CREATE TABLE public.resume_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resume_id uuid NOT NULL REFERENCES public.resumes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  version_number integer NOT NULL DEFAULT 1,
  label text,
  source text NOT NULL DEFAULT 'manual',
  content jsonb NOT NULL DEFAULT '{}'::jsonb,
  template text,
  ats_score integer,
  job_target_id uuid REFERENCES public.job_targets(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resume_versions_unique_number UNIQUE (resume_id, version_number),
  CONSTRAINT resume_versions_source_check CHECK (source IN ('manual','generate','regenerate','copilot','tailor','import')),
  CONSTRAINT resume_versions_score_check CHECK (ats_score IS NULL OR (ats_score BETWEEN 0 AND 100))
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.resume_versions TO authenticated;
GRANT ALL ON public.resume_versions TO service_role;

ALTER TABLE public.resume_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own resume versions"
ON public.resume_versions FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER resume_versions_updated_at
BEFORE UPDATE ON public.resume_versions
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ---------- 2. RESUME TEMPLATES (catalog metadata) ----------
CREATE TABLE public.resume_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL DEFAULT '',
  category text NOT NULL DEFAULT 'professional',
  is_ats_safe boolean NOT NULL DEFAULT true,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  preview_image_url text,
  style_defaults jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resume_templates_category_check CHECK (category IN ('professional','modern','minimal','student','developer','editorial'))
);

GRANT SELECT ON public.resume_templates TO anon, authenticated;
GRANT ALL ON public.resume_templates TO service_role;

ALTER TABLE public.resume_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Templates are publicly readable"
ON public.resume_templates FOR SELECT TO anon, authenticated
USING (true);

CREATE TRIGGER resume_templates_updated_at
BEFORE UPDATE ON public.resume_templates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

INSERT INTO public.resume_templates (key, name, description, category, sort_order) VALUES
  ('atlas',    'Atlas',    'Classic single-column ATS professional layout.', 'professional', 1),
  ('signal',   'Signal',   'Modern layout with a bold header band.',          'modern',       2),
  ('compact',  'Compact',  'Dense one-page layout for senior profiles.',      'minimal',      3),
  ('scholar',  'Scholar',  'Education-forward layout for students and grads.','student',      4),
  ('devstack', 'Devstack', 'Projects and stack-forward developer layout.',    'developer',    5),
  ('meridian', 'Meridian', 'Balanced layout with clear section rules.',       'professional', 6),
  ('editorial','Editorial','Typographic layout with generous whitespace.',    'editorial',    7);

-- ---------- 3. AI ACTIVITY LOGS ----------
CREATE TABLE public.ai_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task text NOT NULL,
  status text NOT NULL DEFAULT 'success',
  model text,
  prompt_version text,
  trace_id text,
  duration_ms integer,
  input_tokens integer,
  output_tokens integer,
  resume_id uuid REFERENCES public.resumes(id) ON DELETE SET NULL,
  job_target_id uuid REFERENCES public.job_targets(id) ON DELETE SET NULL,
  upload_id uuid REFERENCES public.uploads(id) ON DELETE SET NULL,
  error_message text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ai_activity_logs_status_check CHECK (status IN ('success','error','rejected','timeout')),
  CONSTRAINT ai_activity_logs_task_check CHECK (task IN (
    'resume_generate','resume_regenerate','resume_rewrite','copilot_chat',
    'job_analyze','job_match','job_tailor','upload_process','profile_sync'
  ))
);

GRANT SELECT, INSERT ON public.ai_activity_logs TO authenticated;
GRANT ALL ON public.ai_activity_logs TO service_role;

ALTER TABLE public.ai_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own AI activity"
ON public.ai_activity_logs FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "Users insert own AI activity"
ON public.ai_activity_logs FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

-- ---------- 4. CONSTRAINTS ON EXISTING TABLES ----------
ALTER TABLE public.uploads
  ADD CONSTRAINT uploads_kind_check CHECK (kind IN ('file','link')),
  ADD CONSTRAINT uploads_status_check CHECK (status IN ('pending','processing','ready','error'));

ALTER TABLE public.job_targets
  ADD CONSTRAINT job_targets_status_check CHECK (status IN ('draft','analyzed','matched','tailored','archived')),
  ADD CONSTRAINT job_targets_score_check CHECK (match_score IS NULL OR (match_score BETWEEN 0 AND 100));

ALTER TABLE public.resumes
  ADD CONSTRAINT resumes_score_check CHECK (ats_score IS NULL OR (ats_score BETWEEN 0 AND 100));

-- ---------- 5. INDEXES ----------
CREATE INDEX idx_career_entries_user ON public.career_entries(user_id);
CREATE INDEX idx_career_entries_user_kind ON public.career_entries(user_id, kind, position);
CREATE INDEX idx_resumes_user_created ON public.resumes(user_id, created_at DESC);
CREATE INDEX idx_uploads_user_created ON public.uploads(user_id, created_at DESC);
CREATE INDEX idx_uploads_user_status ON public.uploads(user_id, status);
CREATE INDEX idx_job_targets_user_created ON public.job_targets(user_id, created_at DESC);
CREATE INDEX idx_job_targets_base_resume ON public.job_targets(base_resume_id);
CREATE INDEX idx_job_targets_tailored_resume ON public.job_targets(tailored_resume_id);
CREATE INDEX idx_resume_versions_resume ON public.resume_versions(resume_id, version_number DESC);
CREATE INDEX idx_resume_versions_user_created ON public.resume_versions(user_id, created_at DESC);
CREATE INDEX idx_ai_logs_user_created ON public.ai_activity_logs(user_id, created_at DESC);
CREATE INDEX idx_ai_logs_task ON public.ai_activity_logs(task, status);
CREATE INDEX idx_resume_templates_active ON public.resume_templates(is_active, sort_order);
