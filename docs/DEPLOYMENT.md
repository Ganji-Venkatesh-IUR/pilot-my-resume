# Deployment & CI/CD — CareerPilot AI

CareerPilot AI ships as a single full-stack bundle: the React client plus the
server-function API layer (auth-guarded resume, upload, AI orchestration and
job-analysis endpoints) build into `.output`. The PostgreSQL database,
authentication and storage are hosted via Supabase.

## 1. Architecture

| Component | Hosting | Service |
|---|---|---|
| Frontend & API | Cloudflare Workers, Vercel, Render, Fly.io, Cloud Run | Any Node.js-compatible platform |
| Database & Auth | Supabase (managed PostgreSQL) | Authentication, storage, RLS policies |
| File Storage | Supabase Storage or S3-compatible | Resume uploads and artifacts |

## 2. Environments

| Environment | Purpose | Supabase Project |
|---|---|---|
| Local (`npm run dev`, port 5173) | Development | Dev/test Supabase project |
| Production | Live users | Production Supabase project |

Backend changes (migrations, server functions) deploy when the container is updated. Frontend
changes are served immediately with the next bundle.

## 3. Environment variables

Two classes, and mixing them up is the most common deployment bug:

- **Client-visible** — `VITE_*`. Inlined into the browser bundle at build time,
  so they must exist during `npm run build`. Only publishable values belong here.
- **Server-only** — `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_SERVICE_ROLE_KEY`,
  `OPENAI_API_KEY`. Read with `process.env[...]` **inside** a server-function
  handler, injected at runtime, never baked into an image or committed.

Copy `.env.example` to `.env` for local work. On cloud platforms:
- **Vercel/Netlify**: use dashboard environment variables
- **Fly.io**: use `fly secrets set`
- **Render**: use dashboard environment variables
- **Cloud Run/Cloud Functions**: use Secret Manager or environment variable overrides

Rotating a secret only requires a restart — no rebuild — unless it is a `VITE_*`
value, which needs a rebuild.

## 4. CI/CD pipeline

`.github/workflows/ci.yml` runs on every push and PR:

1. `npm install --frozen-lockfile` — reproducible dependency tree
2. `npm run lint` — ESLint + Prettier
3. Type checking — TypeScript compilation
4. `npm run test` — Vitest unit, integration and DOM suites (see `docs/TESTING.md`)
5. `npm run build` — production bundle
6. On `main` only: `docker build` as a container smoke test (optional)

The pipeline is intentionally fail-fast and offline: tests never touch the
network or a live database, so CI cannot go red because of a third party.

## 5. Deploying

### Quick start: Vercel (recommended for beginners)

1. Push to GitHub
2. Connect repository to [Vercel](https://vercel.com)
3. Add environment variables (`.env.example` values)
4. Deploy

Vercel automatically builds and deploys on every push to `main`.

### Docker (portable to any cloud)

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  --build-arg VITE_SUPABASE_PROJECT_ID="$VITE_SUPABASE_PROJECT_ID" \
  -t careerpilot:$(git rev-parse --short HEAD) .

docker run -p 3000:3000 \
  -e SUPABASE_URL \
  -e SUPABASE_PUBLISHABLE_KEY \
  -e SUPABASE_SERVICE_ROLE_KEY \
  -e OPENAI_API_KEY \
  careerpilot:$(git rev-parse --short HEAD)
```

Tag images with the commit SHA — never only `latest` — so a rollback is a tag
change rather than a rebuild.

### Deploy to Fly.io

```bash
fly launch  # Creates fly.toml
fly secrets set SUPABASE_URL SUPABASE_PUBLISHABLE_KEY SUPABASE_SERVICE_ROLE_KEY OPENAI_API_KEY
fly deploy
```

### Deploy to Cloud Run (Google Cloud)

```bash
gcloud builds submit --tag gcr.io/$PROJECT_ID/careerpilot
gcloud run deploy careerpilot \
  --image gcr.io/$PROJECT_ID/careerpilot \
  --platform managed \
  --set-env-vars="SUPABASE_URL=$SUPABASE_URL,SUPABASE_PUBLISHABLE_KEY=$SUPABASE_PUBLISHABLE_KEY" \
  --set-secrets="SUPABASE_SERVICE_ROLE_KEY=supabase-service-role-key:latest,OPENAI_API_KEY=openai-api-key:latest"
```

## 6. Rolling back

- **App code**: revert the offending commit on `main` and redeploy, or
  redeploy the previously tagged image (`careerpilot:<previous-sha>`).
- **Database**: migrations are forward-only in production. Every migration ships
  with a documented downgrade path (`docs/DATABASE.md`); apply the downgrade as
  a *new* migration rather than editing history. Roll the app back first, then
  the schema, so the old code never meets a newer schema it cannot read.
- **Secrets**: rotate the credential at the provider, update the secret store,
  restart. Keep the old credential valid until the restart completes.

## 7. Security checklist before going live

- RLS enabled with owner-scoped policies on every user table
- No service-role key or database password in code, images, or logs
- Only publishable keys exposed through `VITE_*`
- Server functions that touch user data use `requireSupabaseAuth`
- Public endpoints (`/api/public/*`) verify their caller
- Dependency install uses a frozen lockfile plus the 24h supply-chain guard in
  `bunfig.toml`
- HTTPS enforced on all endpoints
- CORS policies restricted to your domain
- Rate limiting implemented for public APIs
- Database backups enabled in Supabase project settings

