# Deployment & CI/CD — CareerPilot AI

CareerPilot AI ships as a single full-stack bundle: the React client plus the
server-function API layer (auth-guarded resume, upload, AI orchestration and
job-analysis endpoints) build into `.output`. The managed Postgres database,
auth and storage run in Lovable Cloud.

## 1. Hosting approach (recommended)

| Concern | Choice | Why |
|---|---|---|
| App (client + API) | Lovable publish (Cloudflare edge) | One click, global CDN, zero infra to babysit |
| Database / auth / storage | Lovable Cloud (managed Postgres) | Migrations, RLS and backups already wired |
| Portable fallback | Docker image (`Dockerfile`) on Fly.io / Render / Cloud Run | Same artifact runs anywhere Node 22 runs |

Publishing from Lovable is the default path. The container exists so the same
build can be moved to any host without code changes — a useful answer in an
interview about vendor lock-in.

## 2. Environments

| Environment | Purpose | Data |
|---|---|---|
| Local (`bun run dev`, port 8080) | Development | Dev backend project |
| Preview | Every saved change, shareable | Dev backend project |
| Production (published URL) | Live users | Prod backend project |

Backend changes (migrations, server functions) deploy immediately. Frontend
changes go live when you click **Update** in the publish dialog.

## 3. Environment variables

Two classes, and mixing them up is the most common deployment bug:

- **Client-visible** — `VITE_*`. Inlined into the browser bundle at build time,
  so they must exist during `bun run build` (see the Docker build args). Only
  publishable values belong here.
- **Server-only** — `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`,
  `LOVABLE_API_KEY`. Read with `process.env[...]` **inside** a server-function
  handler, injected at runtime, never baked into an image or committed.

Copy `.env.example` to `.env` for local work. On Lovable, secrets are managed
in the project's secret store, not in a committed `.env`. On Fly/Render/Cloud
Run use `fly secrets set`, dashboard env vars, or Secret Manager respectively.
Rotating a secret only requires a restart — no rebuild — unless it is a `VITE_*`
value, which needs a rebuild.

## 4. CI/CD pipeline

`.github/workflows/ci.yml` runs on every push and PR:

1. `bun install --frozen-lockfile` — reproducible dependency tree
2. `bun run lint` — ESLint + Prettier
3. `bunx tsc --noEmit` — typecheck
4. `bun run test` — Vitest unit, integration and DOM suites (see `docs/TESTING.md`)
5. `bun run build` — production bundle, uploaded as an artifact
6. On `main` only: `docker build` as a container smoke test

The pipeline is intentionally fail-fast and offline: tests never touch the
network or a live database, so CI cannot go red because of a third party.

## 5. Deploying

**Lovable (primary)**

1. Merge to `main` and let CI go green.
2. Open the project and click **Publish** (or **Update** for a re-publish).
3. Verify the published URL: landing page, sign-in, dashboard, PDF export.

**Docker (portable)**

```bash
docker build \
  --build-arg VITE_SUPABASE_URL="$VITE_SUPABASE_URL" \
  --build-arg VITE_SUPABASE_PUBLISHABLE_KEY="$VITE_SUPABASE_PUBLISHABLE_KEY" \
  --build-arg VITE_SUPABASE_PROJECT_ID="$VITE_SUPABASE_PROJECT_ID" \
  -t careerpilot:$(git rev-parse --short HEAD) .

docker run -p 3000:3000 \
  -e SUPABASE_URL -e SUPABASE_PUBLISHABLE_KEY -e LOVABLE_API_KEY \
  careerpilot:$(git rev-parse --short HEAD)
```

Tag images with the commit SHA — never only `latest` — so a rollback is a tag
change rather than a rebuild.

## 6. Rolling back

- **App code**: revert the offending commit on `main` and re-publish, or
  redeploy the previously tagged image (`careerpilot:<previous-sha>`). Lovable
  also keeps version history you can restore from.
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
