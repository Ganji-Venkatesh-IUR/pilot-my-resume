/**
 * Global test setup.
 *
 * Provides deterministic environment variables and keeps tests hermetic by
 * failing loudly if a test forgets to stub `fetch` and tries to reach the
 * network.
 */
import { afterEach, beforeEach, vi } from "vitest";

process.env["LOVABLE_API_KEY"] = process.env["LOVABLE_API_KEY"] ?? "test-api-key";
process.env["SUPABASE_URL"] = process.env["SUPABASE_URL"] ?? "https://test.supabase.co";
process.env["SUPABASE_PUBLISHABLE_KEY"] =
  process.env["SUPABASE_PUBLISHABLE_KEY"] ?? "sb_publishable_test";

const realFetch = globalThis.fetch;

beforeEach(() => {
  // Any un-stubbed network call is a bug in the test, not a flaky service.
  globalThis.fetch = vi.fn(async () => {
    throw new Error("Unexpected network call — stub fetch in the test.");
  }) as unknown as typeof fetch;
});

afterEach(() => {
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});
