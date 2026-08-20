# CareerPilot AI — Database Schema

PostgreSQL 15 (Lovable Cloud). Every table uses `uuid` primary keys (`gen_random_uuid()`),
`timestamptz` audit columns, foreign keys with explicit delete behaviour, row-level security
scoped to `auth.uid()`, and explicit `GRANT`s for the Data API roles.

## 1. Entity map

```text
auth.users (managed)
   │ 1:1
   ├── profiles                  identity + contact + links (career profile header)
   │ 1:N
   ├── career_entries            single source of truth for career facts
   │                             kind = education | skill | project | experience
   │                                  | certification | achievement | link
   ├── uploads                   files (Storage) + pasted profile links
   ├── resumes ──────────────┐   generated resume documents (content jsonb)
   │      │ 1:N              │
   │      └── resume_versions │  immutable snapshots per save/generate/tailor
   ├── job_targets ──────────┘   pasted JD + analysis + match + tailored resume ref
   └── ai_activity_logs          one row per AI task execution

resume_templates                 global catalog (no owner, publicly readable)
```

## 2. Tables

### profiles
1:1 with `auth.users` (`profiles.id` is both PK and FK). Populated by the
`handle_new_user()` trigger on `auth.users` insert. Holds `full_name`, `email`,
`headline`, `job_title`, `summary`, `location`, `phone`, `github_url`,
`linkedin_url`, `website_url`.

### career_entries
Normalised, polymorphic career facts keyed by `kind` (CHECK-constrained). Shared columns
(`title`, `subtitle`, `organization`, `location`, `start_date`, `end_date`, `is_current`,
`description`, `bullets jsonb`, `tags jsonb`, `level`, `url`, `position`) cover all kinds;
kind-specific extras live in `metadata jsonb`.

*Why one table instead of six?* The kinds share ~90% of their attributes and are always read
together to build a resume. A single indexed table avoids a six-way union on every generation
and keeps ordering (`position`) consistent across sections. `metadata jsonb` absorbs the tail
attributes without schema churn.

### uploads
`kind` = `file | link`, `status` = `pending | processing | ready | error`. Files store
`storage_path` into the private `career-uploads` bucket; links store `source_url`.
`extracted_text` holds parsed content fed to the AI pipeline.

### resumes
The live document: `title`, `template`, `target_role`, `content jsonb` (structured sections),
`ats_score` (0–100 CHECK). Content is jsonb because sections are ordered, heterogeneous and
rendered wholesale — relational shredding would buy nothing and cost a join per section.

### resume_versions
Append-only history. `UNIQUE (resume_id, version_number)`; `source` records what produced the
snapshot (`manual | generate | regenerate | copilot | tailor | import`); `job_target_id`
links tailored snapshots back to the JD. Enables undo, diffing and side-by-side comparison.

### job_targets
Pasted job description (`jd_text`) plus AI output: `analysis jsonb`, `match jsonb`,
`match_score` (0–100), `status` (`draft | analyzed | matched | tailored | archived`), and FKs
to the `base_resume_id` / `tailored_resume_id` (both `ON DELETE SET NULL` so deleting a resume
never destroys the analysis).

### resume_templates
Global catalog: `key` (unique slug used by the renderer), `name`, `description`, `category`,
`is_ats_safe`, `is_active`, `sort_order`, `preview_image_url`, `style_defaults jsonb`.
Publicly readable, writable only by `service_role` — templates are product data, not user data.

### ai_activity_logs
Observability: `task`, `status`, `model`, `prompt_version`, `trace_id`, `duration_ms`,
`input_tokens`, `output_tokens`, nullable FKs to the resume / job target / upload involved, and
`error_message`. Insert + select only for the owner; no updates or deletes (audit integrity).

## 3. Relationships & delete behaviour

| Child | Parent | On delete |
| --- | --- | --- |
| profiles.id | auth.users.id | CASCADE |
| career_entries.user_id | auth.users.id | CASCADE |
| uploads.user_id | auth.users.id | CASCADE |
| resumes.user_id | auth.users.id | CASCADE |
| resume_versions.resume_id | resumes.id | CASCADE |
| resume_versions.job_target_id | job_targets.id | SET NULL |
| job_targets.base/tailored_resume_id | resumes.id | SET NULL |
| ai_activity_logs.resume/job_target/upload_id | respective | SET NULL |

Rule of thumb: ownership edges cascade, reference edges null out.

## 4. Indexes

Every index backs a real query path (owner-scoped list, ordered by recency):

- `idx_career_entries_user`, `idx_career_entries_user_kind (user_id, kind, position)`
- `idx_resumes_user_created (user_id, created_at DESC)`
- `idx_uploads_user_created`, `idx_uploads_user_status`
- `idx_job_targets_user_created`, `idx_job_targets_base_resume`, `idx_job_targets_tailored_resume`
- `idx_resume_versions_resume (resume_id, version_number DESC)`, `idx_resume_versions_user_created`
- `idx_ai_logs_user_created`, `idx_ai_logs_task (task, status)`
- `idx_resume_templates_active (is_active, sort_order)`

## 5. Security model

RLS is enabled on every table.

- User-owned tables: single `FOR ALL` policy `auth.uid() = user_id` (`= id` for profiles),
  granted to `authenticated` only — no `anon` grant.
- `ai_activity_logs`: separate SELECT and INSERT policies; no UPDATE/DELETE grant.
- `resume_templates`: `SELECT` granted to `anon` and `authenticated`; writes only `service_role`.
- `service_role` retains `ALL` on every table for server-side orchestration.

## 6. Triggers

- `handle_new_user()` on `auth.users` INSERT → creates the profile row.
- `update_updated_at_column()` BEFORE UPDATE on every table with `updated_at`.

## 7. Migrations

Migrations are plain, ordered SQL files in `supabase/migrations/` (timestamp-prefixed),
applied forward-only against the managed Postgres instance — the same model Alembic's
`upgrade()` implements, without an ORM in the loop. Each file is a single transaction: it
either applies fully or not at all.

Equivalent Alembic mapping if the schema is ported to a FastAPI/SQLAlchemy service:

| Concept | Here | Alembic |
| --- | --- | --- |
| Forward step | `supabase/migrations/<ts>_<name>.sql` | `def upgrade()` |
| Reverse step | reverse SQL below | `def downgrade()` |
| Version ledger | `supabase_migrations.schema_migrations` | `alembic_version` |

### Downgrade path for the latest migration

```sql
DROP TABLE IF EXISTS public.ai_activity_logs;
DROP TABLE IF EXISTS public.resume_versions;
DROP TABLE IF EXISTS public.resume_templates;

ALTER TABLE public.uploads
  DROP CONSTRAINT IF EXISTS uploads_kind_check,
  DROP CONSTRAINT IF EXISTS uploads_status_check;
ALTER TABLE public.job_targets
  DROP CONSTRAINT IF EXISTS job_targets_status_check,
  DROP CONSTRAINT IF EXISTS job_targets_score_check;
ALTER TABLE public.resumes
  DROP CONSTRAINT IF EXISTS resumes_score_check;

DROP INDEX IF EXISTS public.idx_career_entries_user;
DROP INDEX IF EXISTS public.idx_career_entries_user_kind;
DROP INDEX IF EXISTS public.idx_resumes_user_created;
DROP INDEX IF EXISTS public.idx_uploads_user_created;
DROP INDEX IF EXISTS public.idx_uploads_user_status;
DROP INDEX IF EXISTS public.idx_job_targets_user_created;
DROP INDEX IF EXISTS public.idx_job_targets_base_resume;
DROP INDEX IF EXISTS public.idx_job_targets_tailored_resume;
```

## 8. Interview talking points

1. **UUIDs everywhere** — no ID guessing, safe to generate client-side, mergeable across shards.
2. **Normalise facts, denormalise documents** — career facts are relational (`career_entries`);
   rendered resumes are documents (`content jsonb`). Each side gets the model it deserves.
3. **RLS as the authorisation layer** — policies live next to the data, so a bug in a route
   handler cannot leak another user's rows.
4. **Immutable version history** — `resume_versions` makes undo, diffing and tailoring
   comparisons trivial and gives an audit trail for AI-generated changes.
5. **Observability is schema, not an afterthought** — `ai_activity_logs` captures cost
   (tokens), latency and failure modes per AI task.
