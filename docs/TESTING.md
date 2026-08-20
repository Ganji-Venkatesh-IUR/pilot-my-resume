# Testing & Quality Assurance — CareerPilot AI

Testing is split into four layers, fastest first. Everything below runs offline:
no test may reach the network or a live database.

| Layer | Location | Runner | What it proves |
|---|---|---|---|
| Unit | `tests/unit` | Vitest (node) | Pure logic: validation, normalization, scoring, prompt templates |
| Integration | `tests/integration` | Vitest (node) | AI gateway transport, output validation, orchestrator pipelines |
| DOM | `tests/dom` | Vitest (happy-dom) | Browser-dependent helpers, notably PDF export |
| E2E | `tests/e2e` | Playwright (Python) | Real app flows in Chromium: auth, upload, resume, export |

## Commands

```bash
bun run test              # all Vitest suites once (CI default)
bun run test:watch        # watch mode while developing
bun run test:unit         # unit only
bun run test:integration  # integration only
bun run test:dom          # DOM/browser helpers only
bun run test:coverage     # coverage report
bun run test:e2e          # Playwright smoke suite against the dev server
```

The E2E suite targets `http://localhost:8080` by default; override with
`E2E_BASE_URL`. Screenshots land in `tests/e2e/screenshots/`.

## Hermetic by design

`tests/setup.ts` runs before every Vitest file and:

- sets deterministic fake env vars (Supabase URL/keys, AI gateway key) so
  server modules import cleanly,
- replaces `globalThis.fetch` with a stub that **fails the test** if a suite
  performs an un-stubbed request.

If a test needs network behaviour, stub it explicitly:

```ts
vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(payload))));
```

## Fixtures

- `tests/fixtures/career.ts` — `testUser`, `fullProfile`, `sampleResume`,
  `sampleJobDescription`. Deterministic, reused across layers so assertions read
  the same in every suite.
- `tests/fixtures/supabase.ts` — `createFakeSupabase()` (an in-memory
  query-builder double covering `select/insert/update/delete/eq/order/single`)
  and `mockGateway()` for scripting AI responses without touching the network.

## Coverage of the critical flows

**Auth** — `tests/unit/auth-validation.test.ts` locks the Zod contracts for
sign-up, sign-in, forgot/reset password and profile editing (password strength,
email shape, URL fields, confirmation match). The E2E suite verifies that the
sign-in form renders and protected routes redirect signed-out users.

**Upload** — `tests/unit/upload-links.test.ts` covers GitHub/LinkedIn/portfolio
URL normalization and rejection of malformed input. E2E asserts the drop zone,
file input and link fields render.

**Resume generation** — `tests/unit/resume-schema.test.ts` (normalization, style
clamping, ATS heuristic), `tests/unit/resume-source.test.ts` (corpus assembly and
truncation), `tests/integration/ai-validation.test.ts` (every model response is
parsed and validated before persistence) and
`tests/integration/ai-orchestrator.test.ts` (generate / rewrite / analyze / match
pipelines with a mocked gateway).

**PDF export** — `tests/dom/pdf-export.test.ts` confirms the exporter clones the
resume sheet into an isolated off-screen iframe, prints it and cleans up, and
that it errors clearly when no sheet is mounted.

**Resilience** — `tests/integration/ai-gateway.test.ts` exercises retry backoff,
rate-limit and payment-required mapping, timeouts and empty-completion handling.

## Conventions

- One behaviour per `it`; the name states the expected outcome, not the method.
- Prefer asserting on shape and invariants over exact model prose — AI output is
  non-deterministic, its *contract* is not.
- Server modules (`*.server.ts`) are imported directly; only their I/O edges
  (fetch, Supabase) are doubled.
- New AI prompt or pipeline → add a validation test proving bad model output is
  rejected before it can be saved.

## CI expectations

`bun run test` must be green before merge. E2E runs against a booted dev server;
when no auth session is available it degrades to the signed-out checks and still
fails loudly on console errors or broken public routes.
